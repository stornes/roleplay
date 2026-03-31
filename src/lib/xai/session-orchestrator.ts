/**
 * Session Orchestrator (Harness Core)
 *
 * Manages the session lifecycle with checkpoints, state transitions,
 * and memory triggers. This is the server-side harness that coordinates
 * context assembly, turn persistence, and STM compression.
 *
 * State machine:
 * IDLE -> CONNECTING -> ACTIVE -> RECONNECTING -> ACTIVE -> ... -> ENDING -> ENDED
 *                        |                                          |
 *                    COMPRESSING (STM)                        SUMMARIZING (LTM)
 */

import { createClient } from "@/lib/supabase/server";
import { estimateTokens, TOKEN_BUDGET } from "./prompt-templates";

export type OrchestratorState =
  | "idle"
  | "connecting"
  | "active"
  | "reconnecting"
  | "compressing"
  | "ending"
  | "ended";

/**
 * Check if STM compression is needed after a turn is persisted.
 * Returns true if compression should be triggered.
 */
export async function checkStmThreshold(sessionId: string): Promise<boolean> {
  const supabase = await createClient();

  const { count } = await supabase
    .from("turns")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId);

  const { data: session } = await supabase
    .from("sessions")
    .select("stm_summary")
    .eq("id", sessionId)
    .single();

  const turnCount = count || 0;

  // Fetch recent turns to estimate token usage
  if (turnCount > 20) {
    const { data: recentTurns } = await supabase
      .from("turns")
      .select("text")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(20);

    const totalText = (recentTurns || []).map((t) => t.text).join(" ");
    const tokenEstimate = estimateTokens(totalText);

    return tokenEstimate > TOKEN_BUDGET.recentTurns;
  }

  return false;
}

/**
 * Persist a turn and run post-turn checkpoints.
 */
export async function persistTurn(opts: {
  sessionId: string;
  speaker: string;
  text: string;
  audioUrl?: string;
}): Promise<{ needsCompression: boolean }> {
  const supabase = await createClient();

  const { error } = await supabase.from("turns").insert({
    session_id: opts.sessionId,
    speaker: opts.speaker,
    text: opts.text,
    audio_url: opts.audioUrl,
  });

  if (error) {
    throw new Error(`Failed to persist turn: ${error.message}`);
  }

  // Update session timestamp
  await supabase
    .from("sessions")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", opts.sessionId);

  // Checkpoint: check STM threshold
  const needsCompression = await checkStmThreshold(opts.sessionId);

  return { needsCompression };
}

/**
 * End a session gracefully.
 */
export async function endSession(sessionId: string): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from("sessions")
    .update({
      status: "ended" as const,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId);
}

/**
 * Create a new session for a character.
 */
export async function createSession(opts: {
  userId: string;
  characterId: string;
  advancedPrompt?: string;
}): Promise<string> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("sessions")
    .insert({
      user_id: opts.userId,
      active_character_ids: [opts.characterId],
      advanced_prompt: opts.advancedPrompt,
      status: "active" as const,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create session: ${error?.message}`);
  }

  return data.id;
}
