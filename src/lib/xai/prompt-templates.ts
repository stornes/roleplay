import type { Database } from "@/lib/supabase/types";

type Character = Database["public"]["Tables"]["characters"]["Row"];

/**
 * Build the system prompt (context envelope) for a character session.
 * Phase 2: character + persona + scenario + LTM + STM + advanced prompts.
 */
export function buildContextEnvelope(opts: {
  character: Character;
  allCharacters?: Character[];
  userName: string;
  personaDescription?: string;
  personaAppearance?: string;
  scenarioText?: string;
  castAwareness?: string;
  ltmResults?: string;
  stmSummary?: string | null;
  recentTurns?: { speaker: string; text: string }[];
  advancedPrompt?: string | null;
}): string {
  const {
    character,
    allCharacters,
    userName,
    personaDescription,
    personaAppearance,
    scenarioText,
    ltmResults,
    stmSummary,
    recentTurns,
    advancedPrompt,
  } = opts;

  const sections: string[] = [];
  const isMultiChar = allCharacters && allCharacters.length > 1;

  if (isMultiChar) {
    // Multi-character mode: unified prompt with all characters
    const charDescriptions = allCharacters.map((c) => {
      const name = c.chat_name || c.name;
      return `**${name}:** ${c.personality}`;
    }).join("\n\n");

    const charNames = allCharacters.map((c) => c.chat_name || c.name).join(", ");

    sections.push(
      `[MULTI-CHARACTER ROLEPLAY - STRICT RULES]\n` +
      `You control these characters: ${charNames}.\n\n` +
      `CRITICAL RULES:\n` +
      `1. ALWAYS start your response with the speaking character's name followed by a colon, e.g. "Greg: response"\n` +
      `2. Only ONE character speaks per response. NEVER include dialogue or actions from other characters.\n` +
      `3. If the player says a character's name, that character MUST be the one who responds.\n` +
      `4. If "[CharName reacts]" appears, ONLY that character responds.\n` +
      `5. Never speak as two characters at once. Never write "Astrid: (nods)" inside Greg's response.\n` +
      `6. Stay in character. Never break character or acknowledge being an AI.\n` +
      `7. The player's name is "${userName}". Use it naturally and sparingly.\n\n` +
      `[CHARACTER PROFILES]\n${charDescriptions}`
    );
  } else {
    // Single character mode
    sections.push(
      `[CHARACTER]\n` +
      `You are ${character.name}${character.chat_name ? ` (also known as ${character.chat_name})` : ""}.\n` +
      `${character.personality}\n` +
      `Stay in character at all times. Never break character or acknowledge being an AI.\n` +
      `The player's name is "${userName}". Use their name naturally and sparingly, the way a real person would. Do not start every response with their name.`
    );
  }

  // Persona (Phase 2)
  if (personaDescription || personaAppearance) {
    const personaParts = [`[PLAYER PERSONA]`, `The player's name is ${userName}.`];
    if (personaDescription) personaParts.push(personaDescription);
    if (personaAppearance) personaParts.push(`Appearance: ${personaAppearance}`);
    sections.push(personaParts.join("\n"));
  }

  // Scenario
  if (scenarioText) {
    sections.push(`[SCENARIO]\n${scenarioText}`);
  } else if (character.scenario) {
    sections.push(`[SCENARIO]\n${character.scenario}`);
  }

  // Advanced prompt (if set on the session)
  if (advancedPrompt) {
    sections.push(`[AUTHOR DIRECTION]\n${advancedPrompt}`);
  }

  // Long-term memory (Phase 2)
  if (ltmResults) {
    sections.push(`[LONG-TERM MEMORY]\nFrom past conversations you recall:\n${ltmResults}`);
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
