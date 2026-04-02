import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateBatchPayload } from "@/lib/batch-schema";

/**
 * POST /api/batch-import
 *
 * Import a batch JSON payload containing characters + scenario.
 * Creates all entities in one request and returns their IDs.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON", errors: [{ path: "body", message: "Request body is not valid JSON" }] },
      { status: 400 }
    );
  }

  const validation = validateBatchPayload(body);
  if (!validation.valid || !validation.payload) {
    return NextResponse.json(
      { error: "Validation failed", errors: validation.errors },
      { status: 400 }
    );
  }

  const { characters, scenario, execution } = validation.payload;

  // Create all characters
  const characterInserts = characters.map((c) => ({
    owner_id: user.id,
    name: c.name,
    chat_name: c.chat_name || null,
    bio: c.bio,
    personality: c.personality,
    scenario: c.scenario || null,
    initial_message: c.initial_message || null,
    voice_id: c.voice_id || "eve",
    tags: c.tags || [],
    visibility: "private" as const,
    content_rating: c.content_rating || "sfw",
  }));

  const { data: createdChars, error: charError } = await supabase
    .from("characters")
    .insert(characterInserts)
    .select("id, name");

  if (charError || !createdChars) {
    return NextResponse.json(
      { error: `Failed to create characters: ${charError?.message}` },
      { status: 500 }
    );
  }

  // Create scenario with default_cast referencing new character IDs
  const charIds = createdChars.map((c) => c.id);

  const { data: createdScenario, error: scenarioError } = await supabase
    .from("scenarios")
    .insert({
      owner_id: user.id,
      scenario_title: scenario.title,
      scenario_description: scenario.description,
      setting: scenario.setting || null,
      time_period: scenario.time_period || null,
      default_cast: charIds,
      visibility: "private",
    })
    .select("id, scenario_title")
    .single();

  if (scenarioError || !createdScenario) {
    return NextResponse.json(
      { error: `Failed to create scenario: ${scenarioError?.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    characters: createdChars,
    scenario: createdScenario,
    characterIds: charIds,
    scenarioId: createdScenario.id,
    execution: execution || null,
  });
}
