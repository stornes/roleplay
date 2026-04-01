/**
 * Turn Router (Phase 3)
 *
 * Decides which character responds next in a multi-character session.
 * Priority: explicit name addressing > round-robin > last speaker.
 */

import type { Database } from "@/lib/supabase/types";

type Character = Database["public"]["Tables"]["characters"]["Row"];

/**
 * Detect if the user addressed a specific character by name.
 * Looks for patterns like "talk to [name]", "@[name]", "[name],", etc.
 */
export function detectAddressedCharacter(
  userText: string,
  characters: Character[]
): Character | null {
  const lower = userText.toLowerCase().trim();

  for (const char of characters) {
    const names = [char.name.toLowerCase()];
    if (char.chat_name) names.push(char.chat_name.toLowerCase());

    for (const name of names) {
      if (
        lower === name ||
        lower.startsWith(`${name},`) ||
        lower.startsWith(`${name} `) ||
        lower.endsWith(` ${name}`) ||
        lower.endsWith(` ${name}?`) ||
        lower.endsWith(` ${name}!`) ||
        lower.endsWith(` ${name}.`) ||
        lower.includes(` ${name},`) ||
        lower.includes(`talk to ${name}`) ||
        lower.includes(`@${name}`) ||
        lower.includes(`hey ${name}`) ||
        lower.includes(`ask ${name}`) ||
        lower.includes(`tell ${name}`)
      ) {
        return char;
      }
    }
  }

  return null;
}

/**
 * Analyze a response to determine if another character should chain in.
 * Returns the character that was mentioned, or null.
 */
export function detectChainTarget(
  responseText: string,
  currentSpeakerId: string,
  characters: Character[]
): Character | null {
  const others = characters.filter((c) => c.id !== currentSpeakerId);

  for (const char of others) {
    const name = (char.chat_name || char.name);
    // Word boundary matching to avoid "Art" matching "started"
    const pattern = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (pattern.test(responseText)) {
      return char;
    }
  }

  return null;
}

/**
 * Select the next speaker in a multi-character session.
 */
export function selectNextSpeaker(opts: {
  characters: Character[];
  lastSpeakerId: string | null;
  userText: string;
}): Character {
  const { characters, lastSpeakerId, userText } = opts;

  if (characters.length === 0) {
    throw new Error("No characters in session");
  }

  if (characters.length === 1) {
    return characters[0];
  }

  // 1. Check for explicit name addressing
  const addressed = detectAddressedCharacter(userText, characters);
  if (addressed) return addressed;

  // 2. Round-robin: pick the next character after the last speaker
  if (lastSpeakerId) {
    const lastIndex = characters.findIndex((c) => c.id === lastSpeakerId);
    if (lastIndex !== -1) {
      const nextIndex = (lastIndex + 1) % characters.length;
      return characters[nextIndex];
    }
  }

  // 3. Default to first character
  return characters[0];
}

/**
 * Build a string describing the other characters present in the scene.
 * Injected into each character's context so they know who else is there.
 */
export function buildCastAwareness(
  currentCharacter: Character,
  allCharacters: Character[]
): string {
  const others = allCharacters.filter((c) => c.id !== currentCharacter.id);
  if (others.length === 0) return "";

  const descriptions = others.map((c) => {
    const name = c.chat_name || c.name;
    // Use a short personality snippet (first sentence)
    const shortDesc = c.personality.split(".")[0] + ".";
    return `- ${name}: ${shortDesc}`;
  });

  return (
    `[OTHER CHARACTERS PRESENT]\n` +
    `The following characters are also in this scene. You may reference them, react to them, or address them naturally:\n` +
    descriptions.join("\n")
  );
}
