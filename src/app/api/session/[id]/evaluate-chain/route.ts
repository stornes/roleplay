import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { detectChainTarget } from "@/lib/xai/turn-router";

// Keep on long-lived Node process (in-memory state requires persistence across requests)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Phase 2 Hybrid: Server-side auto-chain evaluation.
 * After a character responds, server decides if another character should react.
 * Manages cooldown state and chain depth to prevent infinite loops.
 */

// Server-side chain state (per session)
// In production, use Redis or Supabase for persistence across instances
const chainState = new Map<string, {
  lastChainAt: number;
  chainDepth: number;
  cooldownUntil: number;
}>();

const CHAIN_COOLDOWN_MS = 5000;
const MAX_CHAIN_DEPTH = 3;
const CHAIN_RANDOM_CHANCE = 0.3;

// Cleanup stale entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, state] of chainState) {
    if (now - state.lastChainAt > 30 * 60 * 1000) {
      chainState.delete(key);
    }
  }
}, 10 * 60 * 1000);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify session ownership
  const { data: session } = await supabase
    .from("sessions")
    .select("active_character_ids")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const { responseText, currentSpeakerId, autoChainEnabled } = await request.json();

  // If auto-chain is disabled or single character, never chain
  if (!autoChainEnabled || !session.active_character_ids || session.active_character_ids.length <= 1) {
    return NextResponse.json({ shouldChain: false });
  }

  // Check cooldown
  const state = chainState.get(sessionId) || {
    lastChainAt: 0,
    chainDepth: 0,
    cooldownUntil: 0,
  };

  const now = Date.now();

  if (now < state.cooldownUntil) {
    return NextResponse.json({ shouldChain: false, reason: "cooldown" });
  }

  if (state.chainDepth >= MAX_CHAIN_DEPTH) {
    // Reset chain depth after cooldown
    state.chainDepth = 0;
    state.cooldownUntil = now + CHAIN_COOLDOWN_MS;
    chainState.set(sessionId, state);
    return NextResponse.json({ shouldChain: false, reason: "max_depth" });
  }

  // Fetch characters to check mentions
  const { data: characters } = await supabase
    .from("characters")
    .select("*")
    .in("id", session.active_character_ids);

  if (!characters) {
    return NextResponse.json({ shouldChain: false });
  }

  // Check if response mentions another character
  const chainTarget = detectChainTarget(
    responseText || "",
    currentSpeakerId || "",
    characters
  );

  const mentionsOther = chainTarget !== null;
  const shouldChain = mentionsOther || Math.random() < CHAIN_RANDOM_CHANCE;

  if (!shouldChain) {
    // Reset chain depth on natural conversation break
    state.chainDepth = 0;
    chainState.set(sessionId, state);
    return NextResponse.json({ shouldChain: false });
  }

  // Determine chain target
  const others = characters.filter((c) => c.id !== currentSpeakerId);
  const target = chainTarget || others[Math.floor(Math.random() * others.length)];

  // Update state
  state.lastChainAt = now;
  state.chainDepth++;
  state.cooldownUntil = now + CHAIN_COOLDOWN_MS;
  chainState.set(sessionId, state);

  // Natural delay (1-3 seconds)
  const delay = 1000 + Math.random() * 2000;

  return NextResponse.json({
    shouldChain: true,
    targetId: target.id,
    targetName: target.chat_name || target.name,
    delay: Math.round(delay),
    chainDepth: state.chainDepth,
  });
}
