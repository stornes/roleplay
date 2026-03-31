import type { Database } from "@/lib/supabase/types";

type Character = Database["public"]["Tables"]["characters"]["Row"];

/**
 * Build the system prompt (context envelope) for a character session.
 * Phase 1: character personality + user display name + STM.
 * Phase 2 adds: persona, scenario, LTM, advanced prompts.
 */
export function buildContextEnvelope(opts: {
  character: Character;
  userName: string;
  stmSummary?: string | null;
  recentTurns?: { speaker: string; text: string }[];
  advancedPrompt?: string | null;
}): string {
  const { character, userName, stmSummary, recentTurns, advancedPrompt } = opts;

  const sections: string[] = [];

  // Character identity and personality
  sections.push(
    `[CHARACTER]\n` +
    `You are ${character.name}${character.chat_name ? ` (also known as ${character.chat_name})` : ""}.\n` +
    `${character.personality}\n` +
    `Stay in character at all times. Never break character or acknowledge being an AI.\n` +
    `Address the player as "${userName}".`
  );

  // Character scenario context (if set on the character itself)
  if (character.scenario) {
    sections.push(`[SCENARIO]\n${character.scenario}`);
  }

  // Advanced prompt (if set on the session)
  if (advancedPrompt) {
    sections.push(`[AUTHOR DIRECTION]\n${advancedPrompt}`);
  }

  // Short-term memory summary (compressed older conversation)
  if (stmSummary) {
    sections.push(`[CONVERSATION HISTORY SUMMARY]\n${stmSummary}`);
  }

  // Recent turns (STM window)
  if (recentTurns && recentTurns.length > 0) {
    const formatted = recentTurns
      .map((t) => {
        const name = t.speaker === "user" ? userName : character.chat_name || character.name;
        return `${name}: ${t.text}`;
      })
      .join("\n");
    sections.push(`[RECENT CONVERSATION]\n${formatted}`);
  }

  return sections.join("\n\n");
}

/**
 * Estimate token count for a string (rough: ~4 chars per token).
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Token budget limits per segment.
 */
export const TOKEN_BUDGET = {
  characterPersonality: 2500,
  persona: 500,
  advancedPrompt: 500,
  scenario: 500,
  ltmResults: 500,
  stmSummary: 500,
  recentTurns: 4000,
  total: 8500,
} as const;
