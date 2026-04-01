"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Clone a public character into the current user's library.
 */
export async function cloneCharacter(characterId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Fetch the source character
  const { data: source, error } = await supabase
    .from("characters")
    .select("*")
    .eq("id", characterId)
    .eq("visibility", "public")
    .single();

  if (error || !source) throw new Error("Character not found or not public");

  // Clone with new owner, set to private
  const { error: insertErr } = await supabase.from("characters").insert({
    owner_id: user.id,
    name: source.name,
    chat_name: source.chat_name,
    bio: source.bio,
    personality: source.personality,
    scenario: source.scenario,
    initial_message: source.initial_message,
    voice_id: source.voice_id,
    tags: source.tags,
    visibility: "private" as const,
    content_rating: source.content_rating,
  });

  if (insertErr) throw new Error(insertErr.message);
  revalidatePath("/characters");
}

/**
 * Clone a public scenario into the current user's library.
 */
export async function cloneScenario(scenarioId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: source, error } = await supabase
    .from("scenarios")
    .select("*")
    .eq("id", scenarioId)
    .eq("visibility", "public")
    .single();

  if (error || !source) throw new Error("Scenario not found or not public");

  const { error: insertErr } = await supabase.from("scenarios").insert({
    owner_id: user.id,
    scenario_title: source.scenario_title,
    scenario_description: source.scenario_description,
    time_period: source.time_period,
    setting: source.setting,
    default_cast: [], // Don't clone cast (character IDs won't match)
    visibility: "private" as const,
  });

  if (insertErr) throw new Error(insertErr.message);
  revalidatePath("/scenarios");
}
