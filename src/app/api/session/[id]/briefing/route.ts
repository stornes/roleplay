import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/session/[id]/briefing
 * Retrieve the current case briefing.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: session } = await supabase
    .from("sessions")
    .select("advanced_prompt")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json({ briefing: session.advanced_prompt || "" });
}

/**
 * POST /api/session/[id]/briefing
 * Save case briefing to session's advanced_prompt field.
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

  let body: { briefing?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { briefing } = body;
  if (!briefing || typeof briefing !== "string") {
    return NextResponse.json({ error: "briefing text required" }, { status: 400 });
  }

  if (briefing.length > 20000) {
    return NextResponse.json({ error: "briefing exceeds 20,000 character limit" }, { status: 400 });
  }

  const { error } = await supabase
    .from("sessions")
    .update({ advanced_prompt: briefing })
    .eq("id", sessionId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: "Failed to save briefing" }, { status: 500 });
  }

  return NextResponse.json({ saved: true });
}
