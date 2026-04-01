import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { characterId, personaId, scenarioId, advancedPrompt } = body;

  if (!characterId) {
    return NextResponse.json({ error: "characterId required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("sessions")
    .insert({
      user_id: user.id,
      active_character_ids: [characterId],
      persona_id: personaId || null,
      scenario_id: scenarioId || null,
      advanced_prompt: advancedPrompt || null,
      status: "active" as const,
    })
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: `Failed to create session: ${error?.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ sessionId: data.id });
}
