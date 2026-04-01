import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const id = url.searchParams.get("id");

  if (!type) {
    return NextResponse.json({ error: "type required (character, persona, memories)" }, { status: 400 });
  }

  if (type === "character" && id) {
    const { data } = await supabase
      .from("characters")
      .select("name, chat_name, bio, personality, scenario, initial_message, voice_id, tags, visibility, content_rating")
      .eq("id", id)
      .eq("owner_id", user.id)
      .single();

    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return new NextResponse(JSON.stringify({ type: "character", version: 1, ...data }, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${data.name.replace(/[^a-zA-Z0-9]/g, "_")}.json"`,
      },
    });
  }

  if (type === "persona" && id) {
    const { data } = await supabase
      .from("personas")
      .select("persona_name, persona_description, persona_appearance, is_default")
      .eq("id", id)
      .eq("owner_id", user.id)
      .single();

    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return new NextResponse(JSON.stringify({ type: "persona", version: 1, ...data }, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${data.persona_name.replace(/[^a-zA-Z0-9]/g, "_")}.json"`,
      },
    });
  }

  if (type === "memories") {
    const { data } = await supabase
      .from("memory_ltm")
      .select("content, source, importance_score, tags, character_ids_involved, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    return new NextResponse(JSON.stringify({ type: "memories", version: 1, count: data?.length || 0, entries: data || [] }, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="memories_export.json"`,
      },
    });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}
