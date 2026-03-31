import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createSession } from "@/lib/xai/session-orchestrator";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { characterId, advancedPrompt } = body;

  if (!characterId) {
    return NextResponse.json({ error: "characterId required" }, { status: 400 });
  }

  try {
    const sessionId = await createSession({
      userId: user.id,
      characterId,
      advancedPrompt,
    });

    return NextResponse.json({ sessionId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
