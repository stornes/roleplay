import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { persistTurn } from "@/lib/xai/session-orchestrator";

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

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to persist turn";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
