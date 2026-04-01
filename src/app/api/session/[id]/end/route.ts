import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { endSession } from "@/lib/xai/session-orchestrator";
import { writeSessionMemories } from "@/lib/memory/ltm-writer";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch session to get character IDs before ending
    const { data: session } = await supabase
      .from("sessions")
      .select("active_character_ids")
      .eq("id", sessionId)
      .single();

    // End the session
    await endSession(sessionId);

    // Write LTM memories from the session transcript (background, non-blocking)
    if (session?.active_character_ids) {
      writeSessionMemories({
        sessionId,
        userId: user.id,
        characterIds: session.active_character_ids,
      }).catch((err) => {
        console.error("LTM write error:", err);
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to end session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
