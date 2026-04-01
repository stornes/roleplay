"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Visibility } from "@/lib/supabase/types";

interface ScenarioFormData {
  scenario_title: string;
  scenario_description: string;
  time_period?: string;
  setting?: string;
  visibility: Visibility;
}

export async function createScenario(data: ScenarioFormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("scenarios").insert({
    owner_id: user.id,
    scenario_title: data.scenario_title,
    scenario_description: data.scenario_description,
    time_period: data.time_period || null,
    setting: data.setting || null,
    default_cast: [],
    visibility: data.visibility,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/scenarios");
  redirect("/scenarios");
}

export async function updateScenario(id: string, data: ScenarioFormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("scenarios")
    .update({
      scenario_title: data.scenario_title,
      scenario_description: data.scenario_description,
      time_period: data.time_period || null,
      setting: data.setting || null,
      visibility: data.visibility,
    })
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/scenarios");
  redirect("/scenarios");
}

export async function deleteScenario(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("scenarios")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/scenarios");
  redirect("/scenarios");
}
