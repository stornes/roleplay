/**
 * Batch Import Schema
 *
 * Machine-readable JSON format for loading scenarios + characters in one operation.
 * Supports optional autonomous execution configuration.
 */

export interface BatchCharacter {
  name: string;
  chat_name?: string;
  bio: string;
  personality: string;
  scenario?: string;
  initial_message?: string;
  voice_id?: "ara" | "rex" | "sal" | "eve" | "leo";
  tags?: string[];
  content_rating?: "sfw" | "mature";
}

export interface BatchScenario {
  title: string;
  description: string;
  setting?: string;
  time_period?: string;
}

export interface BatchExecutionConfig {
  max_turns?: number;
  delay_ms?: number;
  auto_start?: boolean;
}

export interface BatchPayload {
  version: 1;
  characters: BatchCharacter[];
  scenario: BatchScenario;
  briefing?: string;
  execution?: BatchExecutionConfig;
}

export interface BatchValidationError {
  path: string;
  message: string;
}

const VALID_VOICES = ["ara", "rex", "sal", "eve", "leo"];
const VALID_RATINGS = ["sfw", "mature"];
const MAX_CHARACTERS = 20;
const MAX_NAME_LEN = 200;
const MAX_BIO_LEN = 5000;
const MAX_PERSONALITY_LEN = 10000;
const MAX_SCENARIO_LEN = 10000;
const MAX_TITLE_LEN = 200;
const MAX_DESCRIPTION_LEN = 10000;

function checkStringLength(value: unknown, field: string, maxLen: number, errors: BatchValidationError[], path: string) {
  if (typeof value === "string" && value.length > maxLen) {
    errors.push({ path: `${path}.${field}`, message: `${field} exceeds max length of ${maxLen}` });
  }
}

export function validateBatchPayload(data: unknown): {
  valid: boolean;
  errors: BatchValidationError[];
  payload?: BatchPayload;
} {
  const errors: BatchValidationError[] = [];

  if (!data || typeof data !== "object") {
    return { valid: false, errors: [{ path: "root", message: "Payload must be a JSON object" }] };
  }

  const obj = data as Record<string, unknown>;

  // Version check
  if (obj.version !== 1) {
    errors.push({ path: "version", message: "version must be 1" });
  }

  // Characters
  if (!Array.isArray(obj.characters)) {
    errors.push({ path: "characters", message: "characters must be an array" });
  } else if (obj.characters.length === 0) {
    errors.push({ path: "characters", message: "At least one character required" });
  } else if (obj.characters.length > MAX_CHARACTERS) {
    errors.push({ path: "characters", message: `Maximum ${MAX_CHARACTERS} characters per batch` });
  } else {
    for (let i = 0; i < obj.characters.length; i++) {
      const c = obj.characters[i] as Record<string, unknown>;
      const p = `characters[${i}]`;

      if (!c || typeof c !== "object") {
        errors.push({ path: p, message: "Must be an object" });
        continue;
      }
      if (!c.name || typeof c.name !== "string") {
        errors.push({ path: `${p}.name`, message: "name is required (string)" });
      }
      if (!c.bio || typeof c.bio !== "string") {
        errors.push({ path: `${p}.bio`, message: "bio is required (string)" });
      }
      if (!c.personality || typeof c.personality !== "string") {
        errors.push({ path: `${p}.personality`, message: "personality is required (string)" });
      }

      // Length limits
      checkStringLength(c.name, "name", MAX_NAME_LEN, errors, p);
      checkStringLength(c.bio, "bio", MAX_BIO_LEN, errors, p);
      checkStringLength(c.personality, "personality", MAX_PERSONALITY_LEN, errors, p);
      checkStringLength(c.scenario, "scenario", MAX_SCENARIO_LEN, errors, p);
      checkStringLength(c.initial_message, "initial_message", MAX_BIO_LEN, errors, p);
      checkStringLength(c.chat_name, "chat_name", MAX_NAME_LEN, errors, p);

      if (c.voice_id !== undefined && !VALID_VOICES.includes(c.voice_id as string)) {
        errors.push({ path: `${p}.voice_id`, message: `voice_id must be one of: ${VALID_VOICES.join(", ")}` });
      }
      if (c.content_rating !== undefined && !VALID_RATINGS.includes(c.content_rating as string)) {
        errors.push({ path: `${p}.content_rating`, message: `content_rating must be one of: ${VALID_RATINGS.join(", ")}` });
      }
    }
  }

  // Scenario
  if (!obj.scenario || typeof obj.scenario !== "object") {
    errors.push({ path: "scenario", message: "scenario object is required" });
  } else {
    const s = obj.scenario as Record<string, unknown>;
    if (!s.title || typeof s.title !== "string") {
      errors.push({ path: "scenario.title", message: "title is required (string)" });
    }
    if (!s.description || typeof s.description !== "string") {
      errors.push({ path: "scenario.description", message: "description is required (string)" });
    }

    checkStringLength(s.title, "title", MAX_TITLE_LEN, errors, "scenario");
    checkStringLength(s.description, "description", MAX_DESCRIPTION_LEN, errors, "scenario");
    checkStringLength(s.setting, "setting", MAX_BIO_LEN, errors, "scenario");
    checkStringLength(s.time_period, "time_period", MAX_NAME_LEN, errors, "scenario");
  }

  // Briefing (optional, injected as case context for all agents)
  if (obj.briefing !== undefined) {
    if (typeof obj.briefing !== "string") {
      errors.push({ path: "briefing", message: "briefing must be a string" });
    } else if (obj.briefing.length > 20000) {
      errors.push({ path: "briefing", message: "briefing exceeds max length of 20000" });
    }
  }

  // Execution config (optional)
  if (obj.execution !== undefined) {
    if (typeof obj.execution !== "object" || obj.execution === null) {
      errors.push({ path: "execution", message: "execution must be an object" });
    } else {
      const e = obj.execution as Record<string, unknown>;
      if (e.max_turns !== undefined) {
        if (typeof e.max_turns !== "number" || e.max_turns < 1 || e.max_turns > 100) {
          errors.push({ path: "execution.max_turns", message: "max_turns must be 1-100" });
        }
      }
      if (e.delay_ms !== undefined) {
        if (typeof e.delay_ms !== "number" || e.delay_ms < 0 || e.delay_ms > 30000) {
          errors.push({ path: "execution.delay_ms", message: "delay_ms must be 0-30000" });
        }
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, errors: [], payload: obj as unknown as BatchPayload };
}
