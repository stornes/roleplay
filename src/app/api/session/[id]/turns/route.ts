import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { persistTurn } from "@/lib/xai/session-orchestrator";
import { writePeriodicMemories } from "@/lib/memory/ltm-writer";

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
    .select("id")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const body = await request.json();
  const { speaker, text, audioUrl } = body;

  if (!speaker || !text) {
    return NextResponse.json(
      { error: "speaker and text required" },
      { status: 400 }
    );
  }

  try {
    const result = await persistTurn({
      sessionId,
      speaker,
      text,
      audioUrl,
    });

    // Check turn count for periodic LTM extraction (every 10 turns)
    const { count } = await supabase
      .from("turns")
      .select("id", { count: "exact", head: true })
      .eq("session_id", sessionId);

    if (count && count > 0 && count % 10 === 0) {
      // Get session info for character IDs
      const { data: session } = await supabase
        .from("sessions")
        .select("active_character_ids")
        .eq("id", sessionId)
        .single();

      if (session?.active_character_ids) {
        // Fire and forget periodic memory extraction
        writePeriodicMemories({
          sessionId,
          userId: user.id,
          characterIds: session.active_character_ids,
        }).catch((err) => {
          console.error("Periodic LTM write error:", err);
        });
      }
    }

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to persist turn";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
