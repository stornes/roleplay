"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

interface PromptPresetFormData {
  name: string;
  prompt_text: string;
  directives: string[];
}

export async function createPromptPreset(data: PromptPresetFormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("advanced_prompt_presets").insert({
    owner_id: user.id,
    name: data.name,
    prompt_text: data.prompt_text,
    directives: data.directives,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/prompts");
  redirect("/prompts");
}

export async function updatePromptPreset(
  id: string,
  data: PromptPresetFormData
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("advanced_prompt_presets")
    .update({
      name: data.name,
      prompt_text: data.prompt_text,
      directives: data.directives,
    })
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/prompts");
  redirect("/prompts");
}

export async function deletePromptPreset(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("advanced_prompt_presets")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/prompts");
  redirect("/prompts");
}
