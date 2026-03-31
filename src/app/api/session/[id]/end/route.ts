import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { endSession } from "@/lib/xai/session-orchestrator";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await endSession(sessionId);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to end session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
