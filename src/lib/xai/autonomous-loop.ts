/**
 * Autonomous Conversation Loop
 *
 * Server-side engine that drives multi-character conversations
 * without human input. Uses Grok-3 text API (not Realtime/WebSocket).
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { buildContextEnvelope } from "./prompt-templates";
import { selectNextSpeaker, buildCastAwareness, detectChainTarget } from "./turn-router";
import type { Database } from "@/lib/supabase/types";

type Character = Database["public"]["Tables"]["characters"]["Row"];

const MAX_TURNS_HARD_LIMIT = 100;
const DEFAULT_MAX_TURNS = 20;
const DEFAULT_DELAY_MS = 2000;

export interface AutonomousConfig {
  maxTurns: number;
  delayMs: number;
}

export interface AutonomousTurn {
  turnNumber: number;
  speakerName: string;
  speakerId: string;
  text: string;
  timestamp: string;
}

export type AutonomousEventCallback = (event: AutonomousEvent) => void;

export type AutonomousEvent =
  | { type: "turn"; turn: AutonomousTurn }
  | { type: "complete"; totalTurns: number; reason: string }
  | { type: "error"; message: string; turnNumber: number };

// Active autonomous sessions (in-memory state)
const activeSessions = new Map<string, {
  running: boolean;
  turnCount: number;
  abortController: AbortController;
}>();

export function isAutonomousRunning(sessionId: string): boolean {
  return activeSessions.get(sessionId)?.running ?? false;
}

export function stopAutonomous(sessionId: string): boolean {
  const state = activeSessions.get(sessionId);
  if (!state?.running) return false;
  state.running = false;
  state.abortController.abort();
  return true;
}

export function getAutonomousState(sessionId: string) {
  return activeSessions.get(sessionId) ?? null;
}

/**
 * Run the autonomous conversation loop.
 * Calls onEvent for each turn so the caller can stream results.
 */
export async function runAutonomousLoop(
  sessionId: string,
  config: Partial<AutonomousConfig>,
  onEvent: AutonomousEventCallback
): Promise<void> {
  if (activeSessions.get(sessionId)?.running) {
    onEvent({ type: "error", message: "Autonomous loop already running", turnNumber: 0 });
    return;
  }

  const maxTurns = Math.min(config.maxTurns || DEFAULT_MAX_TURNS, MAX_TURNS_HARD_LIMIT);
  const delayMs = config.delayMs ?? DEFAULT_DELAY_MS;

  const abortController = new AbortController();
  activeSessions.set(sessionId, { running: true, turnCount: 0, abortController });

  const supabase = createAdminClient();

  try {
    // Fetch session
    const { data: session } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (!session) {
      onEvent({ type: "error", message: "Session not found", turnNumber: 0 });
      return;
    }

    const charIds = session.active_character_ids;
    if (!charIds || charIds.length < 2) {
      onEvent({ type: "error", message: "Autonomous mode requires 2+ characters", turnNumber: 0 });
      return;
    }

    // Fetch characters
    const { data: characters } = await supabase
      .from("characters")
      .select("*")
      .in("id", charIds);

    if (!characters || characters.length < 2) {
      onEvent({ type: "error", message: "Could not load characters", turnNumber: 0 });
      return;
    }

    // Fetch scenario if set
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

    // Fetch persona name
    let userName = "The narrator";
    if (session.persona_id) {
      const { data: persona } = await supabase
        .from("personas")
        .select("persona_name")
        .eq("id", session.persona_id)
        .single();
      if (persona) userName = persona.persona_name;
    }

    // Build conversation history from existing turns
    const { data: existingTurns } = await supabase
      .from("turns")
      .select("speaker, text")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })
      .limit(20);

    const conversationHistory: { speaker: string; text: string }[] = existingTurns || [];
    let lastSpeakerId: string | null = null;

    // If there are existing turns, find the last speaker
    if (conversationHistory.length > 0) {
      const lastTurn = conversationHistory[conversationHistory.length - 1];
      if (lastTurn.speaker !== "user") {
        lastSpeakerId = lastTurn.speaker;
      }
    }

    // Main loop
    for (let turn = 1; turn <= maxTurns; turn++) {
      const state = activeSessions.get(sessionId);
      if (!state?.running) {
        onEvent({ type: "complete", totalTurns: turn - 1, reason: "stopped" });
        return;
      }

      // Select next speaker
      const nextSpeaker = selectNextSpeaker({
        characters,
        lastSpeakerId,
        userText: "",
      });

      // Check for chain target from last response
      if (lastSpeakerId && conversationHistory.length > 0) {
        const lastText = conversationHistory[conversationHistory.length - 1].text;
        const chainTarget = detectChainTarget(lastText, lastSpeakerId, characters);
        if (chainTarget) {
          // Override with chain target for more natural flow
          Object.assign(nextSpeaker, chainTarget);
        }
      }

      const speakerName = nextSpeaker.chat_name || nextSpeaker.name;

      // Build context for this character
      const recentForContext = conversationHistory.slice(-20);
      const castAwareness = buildCastAwareness(nextSpeaker, characters);

      const instructions = buildContextEnvelope({
        character: nextSpeaker,
        allCharacters: characters,
        userName,
        scenarioText,
        castAwareness,
        stmSummary: session.stm_summary,
        recentTurns: recentForContext,
      });

      // Build the conversation prompt
      const lastFewTurns = conversationHistory.slice(-5).map((t) => {
        const name = t.speaker === "user"
          ? userName
          : characters.find((c) => c.id === t.speaker)?.chat_name
            || characters.find((c) => c.id === t.speaker)?.name
            || t.speaker;
        return `${name}: ${t.text}`;
      }).join("\n");

      const turnPrompt = conversationHistory.length === 0
        ? `You are starting a new conversation in this scenario. Introduce yourself and set the scene. Remember: prefix your response with "${speakerName}: ".`
        : `Continue the conversation as ${speakerName}. Here's what was just said:\n${lastFewTurns}\n\nRespond naturally as ${speakerName}. Prefix with "${speakerName}: ". Keep it to 1-3 sentences.`;

      // Call Grok-3 text API
      let responseText: string;
      try {
        const res = await fetch("https://api.x.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.XAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "grok-3",
            messages: [
              { role: "system", content: instructions },
              { role: "user", content: turnPrompt },
            ],
            max_tokens: 300,
            temperature: 0.9,
          }),
          signal: abortController.signal,
        });

        if (!res.ok) {
          const errBody = await res.text();
          onEvent({ type: "error", message: `Grok API error: ${res.status} ${errBody}`, turnNumber: turn });
          continue;
        }

        const data = await res.json();
        responseText = data.choices?.[0]?.message?.content || "";
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          onEvent({ type: "complete", totalTurns: turn - 1, reason: "stopped" });
          return;
        }
        onEvent({ type: "error", message: `API call failed: ${err}`, turnNumber: turn });
        continue;
      }

      if (!responseText) {
        onEvent({ type: "error", message: "Empty response from Grok", turnNumber: turn });
        continue;
      }

      // Strip the character prefix if present (we track speaker separately)
      let cleanText = responseText;
      const prefixMatch = responseText.match(/^(?:\[?(\w[\w\s]*?)\]?:\s*|(?:\*\*(\w[\w\s]*?)\*\*:\s*))(.[\s\S]+)/);
      if (prefixMatch) {
        cleanText = (prefixMatch[3] || responseText).trim();
      }

      // Persist turn
      await supabase.from("turns").insert({
        session_id: sessionId,
        speaker: nextSpeaker.id,
        text: cleanText,
      });

      // Track in conversation history
      conversationHistory.push({ speaker: nextSpeaker.id, text: cleanText });
      lastSpeakerId = nextSpeaker.id;

      // Update state
      const currentState = activeSessions.get(sessionId);
      if (currentState) currentState.turnCount = turn;

      // Emit turn event
      const turnEvent: AutonomousTurn = {
        turnNumber: turn,
        speakerName,
        speakerId: nextSpeaker.id,
        text: cleanText,
        timestamp: new Date().toISOString(),
      };
      onEvent({ type: "turn", turn: turnEvent });

      // Delay between turns
      if (turn < maxTurns && delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    onEvent({ type: "complete", totalTurns: maxTurns, reason: "max_turns_reached" });
  } catch (err) {
    onEvent({ type: "error", message: `Loop error: ${err}`, turnNumber: 0 });
  } finally {
    const state = activeSessions.get(sessionId);
    if (state) state.running = false;
  }
}
