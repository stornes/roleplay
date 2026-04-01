import { createClient } from "@/lib/supabase/server";
import { buildContextEnvelope, estimateTokens, TOKEN_BUDGET } from "./prompt-templates";
import { searchMemories } from "@/lib/memory/ltm-search";

/**
 * Assemble the full context envelope for a session.
 * Called by GET /api/session/[id]/context before WebSocket connection.
 *
 * Phase 2: Now includes persona, scenario, and LTM results.
 */
export async function assembleContext(sessionId: string) {
  const supabase = await createClient();

  // Fetch session
  const { data: session, error: sessionErr } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (sessionErr || !session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  // Fetch the primary character (first in active_character_ids)
  const characterId = session.active_character_ids[0];
  if (!characterId) {
    throw new Error("No active character in session");
  }

  const { data: character, error: charErr } = await supabase
    .from("characters")
    .select("*")
    .eq("id", characterId)
    .single();

  if (charErr || !character) {
    throw new Error(`Character not found: ${characterId}`);
  }

  // Fetch user and determine player name
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id;

  // Phase 2: Check for persona
  let userName: string;
  let personaDescription: string | undefined;
  let personaAppearance: string | undefined;

  if (session.persona_id) {
    const { data: persona } = await supabase
      .from("personas")
      .select("*")
      .eq("id", session.persona_id)
      .single();

    if (persona) {
      userName = persona.persona_name;
      personaDescription = persona.persona_description || undefined;
      personaAppearance = persona.persona_appearance || undefined;
    } else {
      const fullName = user?.user_metadata?.name || user?.email?.split("@")[0] || "Player";
      userName = fullName.split(" ")[0];
    }
  } else {
    const fullName = user?.user_metadata?.name || user?.email?.split("@")[0] || "Player";
    userName = fullName.split(" ")[0];
  }

  // Phase 2: Check for scenario
  let scenarioText: string | undefined;
  if (session.scenario_id) {
    const { data: scenario } = await supabase
      .from("scenarios")
      .select("*")
      .eq("id", session.scenario_id)
      .single();

    if (scenario) {
      const parts = [scenario.scenario_description];
      if (scenario.setting) parts.push(`Setting: ${scenario.setting}`);
      if (scenario.time_period) parts.push(`Time period: ${scenario.time_period}`);
      scenarioText = parts.join("\n");
    }
  }

  // Fetch recent turns (STM window, last 20)
  const { data: turns } = await supabase
    .from("turns")
    .select("speaker, text")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(20);

  const recentTurns = (turns || []).reverse();

  // Trim recent turns to fit token budget
  let trimmedTurns = recentTurns;
  const turnsText = trimmedTurns.map((t) => `${t.speaker}: ${t.text}`).join("\n");
  if (estimateTokens(turnsText) > TOKEN_BUDGET.recentTurns) {
    const maxChars = TOKEN_BUDGET.recentTurns * 4;
    let totalChars = 0;
    const kept: typeof trimmedTurns = [];
    for (let i = trimmedTurns.length - 1; i >= 0; i--) {
      const turnLen = trimmedTurns[i].speaker.length + trimmedTurns[i].text.length + 3;
      if (totalChars + turnLen > maxChars) break;
      totalChars += turnLen;
      kept.unshift(trimmedTurns[i]);
    }
    trimmedTurns = kept;
  }

  // Phase 2: Search LTM for relevant memories
  let ltmResults: string | undefined;
  if (userId && recentTurns.length > 0) {
    // Use last few turns as the search query
    const searchQuery = recentTurns
      .slice(-3)
      .map((t) => t.text)
      .join(" ");

    const memories = await searchMemories({
      userId,
      query: searchQuery,
      threshold: 0.5,
      limit: 5,
    });

    if (memories.length > 0) {
      ltmResults = memories.map((m) => m.content).join("\n");
    }
  }

  const instructions = buildContextEnvelope({
    character,
    userName,
    personaDescription,
    personaAppearance,
    scenarioText,
    ltmResults,
    stmSummary: session.stm_summary,
    recentTurns: trimmedTurns,
    advancedPrompt: session.advanced_prompt,
  });

  return {
    instructions,
    voiceId: character.voice_id,
    characterName: character.chat_name || character.name,
    initialMessage: character.initial_message,
    tokenEstimate: estimateTokens(instructions),
  };
}
