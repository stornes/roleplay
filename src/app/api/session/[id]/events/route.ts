/**
 * Phase 3 Hybrid: Server-Sent Events for session orchestration.
 * Pushes chain triggers and speaker changes to the client,
 * even when the browser tab is backgrounded.
 *
 * This becomes the foundation for LiveKit multi-user orchestration.
 */

import { createClient } from "@/lib/supabase/server";

// Keep on long-lived Node process (SSE streams + in-memory queues need persistence)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// In-memory event queues per session
// In production, use Redis pub/sub or Supabase Realtime
const sessionQueues = new Map<string, {
  events: Array<{ type: string; data: Record<string, unknown>; timestamp: number }>;
  lastRead: number;
}>();

export function pushSessionEvent(sessionId: string, event: { type: string; data: Record<string, unknown> }) {
  let queue = sessionQueues.get(sessionId);
  if (!queue) {
    queue = { events: [], lastRead: Date.now() };
    sessionQueues.set(sessionId, queue);
  }
  queue.events.push({ ...event, timestamp: Date.now() });
  // Keep only last 50 events
  if (queue.events.length > 50) {
    queue.events = queue.events.slice(-50);
  }
}

// Cleanup stale queues
setInterval(() => {
  const now = Date.now();
  for (const [key, queue] of sessionQueues) {
    if (now - queue.lastRead > 30 * 60 * 1000) {
      sessionQueues.delete(key);
    }
  }
}, 10 * 60 * 1000);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Verify session ownership
  const { data: session } = await supabase
    .from("sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (!session) {
    return new Response("Session not found", { status: 404 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Send initial ping
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`));

      const interval = setInterval(() => {
        const queue = sessionQueues.get(sessionId);
        if (queue) {
          const newEvents = queue.events.filter((e) => e.timestamp > queue.lastRead);
          for (const event of newEvents) {
            try {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: event.type, ...event.data })}\n\n`)
              );
            } catch {
              clearInterval(interval);
              return;
            }
          }
          queue.lastRead = Date.now();
        }

      }, 500); // Poll every 500ms

      // Separate keepalive ping every 30s
      const keepalive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: keepalive\n\n`));
        } catch {
          clearInterval(keepalive);
        }
      }, 30000);

      // Clean up on close
      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        clearInterval(keepalive);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
