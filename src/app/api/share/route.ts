import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await request.json();
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  // Check session belongs to user
  const { data: session } = await supabase
    .from("sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Check if already shared
  const { data: existing } = await supabase
    .from("shared_sessions")
    .select("share_slug")
    .eq("session_id", sessionId)
    .single();

  if (existing) {
    return NextResponse.json({ slug: existing.share_slug });
  }

  // Generate a short slug
  const slug = Math.random().toString(36).substring(2, 10);

  const { error } = await supabase.from("shared_sessions").insert({
    session_id: sessionId,
    user_id: user.id,
    share_slug: slug,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ slug });
}
