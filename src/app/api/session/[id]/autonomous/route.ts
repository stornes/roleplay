import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  runAutonomousLoop,
  stopAutonomous,
  isAutonomousRunning,
  getAutonomousState,
} from "@/lib/xai/autonomous-loop";
import { writeSessionMemories } from "@/lib/memory/ltm-writer";
import type { AutonomousEvent } from "@/lib/xai/autonomous-loop";

// Long-lived Node process for in-memory state and SSE
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/session/[id]/autonomous
 * Start or stop autonomous execution.
 *
 * Body: { action: "start" | "stop", maxTurns?: number, delayMs?: number }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify session ownership
  const { data: session } = await supabase
    .from("sessions")
    .select("user_id, active_character_ids")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const body = await request.json();
  const { action, maxTurns, delayMs } = body;

  if (action === "stop") {
    const stopped = stopAutonomous(sessionId);
    return NextResponse.json({ stopped });
  }

  if (action === "start") {
    if (isAutonomousRunning(sessionId)) {
      return NextResponse.json({ error: "Already running" }, { status: 409 });
    }

    if (!session.active_character_ids || session.active_character_ids.length < 2) {
      return NextResponse.json(
        { error: "Autonomous mode requires at least 2 characters" },
        { status: 400 }
      );
    }

    // Start the loop in the background (fire and forget)
    // Events will be picked up by SSE endpoint
    const events: AutonomousEvent[] = [];
    autonomousEventQueues.set(sessionId, events);

    const userId = user.id;
    const characterIds = session.active_character_ids;

    runAutonomousLoop(
      sessionId,
      { maxTurns: maxTurns || 20, delayMs: delayMs ?? 2000 },
      (event) => {
        const queue = autonomousEventQueues.get(sessionId);
        if (queue) {
          queue.push(event);
          if (queue.length > 200) queue.shift();
        }

        // Trigger memory extraction on completion
        if (event.type === "complete") {
          writeSessionMemories({ sessionId, userId, characterIds }).catch((err) => {
            console.error("Autonomous LTM write error:", err);
          });
        }
      }
    );

    return NextResponse.json({ started: true, sessionId });
  }

  return NextResponse.json({ error: "action must be 'start' or 'stop'" }, { status: 400 });
}

// Event queues for SSE streaming
const autonomousEventQueues = new Map<string, AutonomousEvent[]>();

/**
 * GET /api/session/[id]/autonomous
 * SSE stream of autonomous execution events.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify ownership
  const { data: session } = await supabase
    .from("sessions")
    .select("user_id")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const encoder = new TextEncoder();
  let lastEventIndex = 0;

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial status
      const running = isAutonomousRunning(sessionId);
      const state = getAutonomousState(sessionId);
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "status", running, turnCount: state?.turnCount || 0 })}\n\n`)
      );

      // Poll for new events
      const interval = setInterval(() => {
        const queue = autonomousEventQueues.get(sessionId);
        if (!queue) return;

        while (lastEventIndex < queue.length) {
          const event = queue[lastEventIndex];
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
          );
          lastEventIndex++;

          // If complete or error that ends the loop, clean up after a delay
          if (event.type === "complete") {
            setTimeout(() => {
              autonomousEventQueues.delete(sessionId);
            }, 30000);
          }
        }
      }, 300);

      // Keepalive
      const keepalive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch {
          clearInterval(interval);
          clearInterval(keepalive);
        }
      }, 15000);

      // Clean up on abort
      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        clearInterval(keepalive);
        try { controller.close(); } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
