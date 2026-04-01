import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimitSession } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: max 10 sessions per hour
  const limit = rateLimitSession(user.id);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later.", remaining: 0 },
      { status: 429 }
    );
  }

  const body = await request.json();
  const { characterId, characterIds, personaId, scenarioId, advancedPrompt, advancedPromptPresetId } = body;

  // Support both single characterId (Phase 1-2) and array characterIds (Phase 3)
  const activeCharacterIds = characterIds || (characterId ? [characterId] : []);

  if (activeCharacterIds.length === 0) {
    return NextResponse.json({ error: "At least one character required" }, { status: 400 });
  }

  // If a preset ID is provided, fetch the preset text
  let resolvedAdvancedPrompt = advancedPrompt || null;
  if (advancedPromptPresetId) {
    const { data: preset } = await supabase
      .from("advanced_prompt_presets")
      .select("prompt_text")
      .eq("id", advancedPromptPresetId)
      .single();

    if (preset?.prompt_text) {
      resolvedAdvancedPrompt = preset.prompt_text;
    }
  }

  const { data, error } = await supabase
    .from("sessions")
    .insert({
      user_id: user.id,
      active_character_ids: activeCharacterIds,
      persona_id: personaId || null,
      scenario_id: scenarioId || null,
      advanced_prompt: resolvedAdvancedPrompt,
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
