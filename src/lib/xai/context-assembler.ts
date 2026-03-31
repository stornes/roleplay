import { createClient } from "@/lib/supabase/server";
import { buildContextEnvelope, estimateTokens, TOKEN_BUDGET } from "./prompt-templates";

/**
 * Assemble the full context envelope for a session.
 * Called by GET /api/session/[id]/context before WebSocket connection.
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

  // Fetch user profile for display name (first name only for natural conversation)
  const { data: { user } } = await supabase.auth.getUser();
  const fullName = user?.user_metadata?.name || user?.email?.split("@")[0] || "Player";
  const userName = fullName.split(" ")[0];

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
    // Keep only the most recent turns that fit
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

  const instructions = buildContextEnvelope({
    character,
    userName,
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
