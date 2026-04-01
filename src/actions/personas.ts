"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

interface PersonaFormData {
  persona_name: string;
  persona_description: string;
  persona_appearance?: string;
  is_default: boolean;
}

export async function createPersona(data: PersonaFormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("personas").insert({
    owner_id: user.id,
    persona_name: data.persona_name,
    persona_description: data.persona_description,
    persona_appearance: data.persona_appearance || null,
    is_default: data.is_default,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/personas");
  redirect("/personas");
}

export async function updatePersona(id: string, data: PersonaFormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("personas")
    .update({
      persona_name: data.persona_name,
      persona_description: data.persona_description,
      persona_appearance: data.persona_appearance || null,
      is_default: data.is_default,
    })
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/personas");
  redirect("/personas");
}

export async function deletePersona(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("personas")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/personas");
  redirect("/personas");
}
