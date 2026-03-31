import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assembleContext } from "@/lib/xai/context-assembler";

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

  try {
    const context = await assembleContext(sessionId);
    return NextResponse.json(context);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to assemble context";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
