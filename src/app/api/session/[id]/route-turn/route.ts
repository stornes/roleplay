import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { detectAddressedCharacter, selectNextSpeaker } from "@/lib/xai/turn-router";

/**
 * Phase 1 Hybrid: Server-side turn routing.
 * Client sends user text + current speaker, server decides who responds next.
 */
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

  const { text, currentSpeakerId } = await request.json();

  if (!text) {
    return NextResponse.json({ error: "text required" }, { status: 400 });
  }

  const characterIds = session.active_character_ids;
  if (!characterIds || characterIds.length <= 1) {
    // Single character, no routing needed
    return NextResponse.json({
      nextSpeakerId: characterIds?.[0] || null,
      switchRequired: false,
    });
  }

  // Fetch all active characters
  const { data: characters } = await supabase
    .from("characters")
    .select("*")
    .in("id", characterIds);

  if (!characters || characters.length === 0) {
    return NextResponse.json({ error: "Characters not found" }, { status: 404 });
  }

  // Use the server-side turn router
  const nextSpeaker = selectNextSpeaker({
    characters,
    lastSpeakerId: currentSpeakerId || null,
    userText: text,
  });

  return NextResponse.json({
    nextSpeakerId: nextSpeaker.id,
    nextSpeakerName: nextSpeaker.chat_name || nextSpeaker.name,
    switchRequired: nextSpeaker.id !== currentSpeakerId,
  });
}
