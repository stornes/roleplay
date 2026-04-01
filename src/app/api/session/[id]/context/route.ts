import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assembleContext } from "@/lib/xai/context-assembler";

export async function GET(
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
    .select("id")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const characterId = url.searchParams.get("characterId") || undefined;

  try {
    const context = await assembleContext(sessionId, characterId);
    return NextResponse.json(context);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to assemble context";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
