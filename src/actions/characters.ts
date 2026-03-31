"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { VoiceId, Visibility, ContentRating } from "@/lib/supabase/types";

interface CharacterFormData {
  name: string;
  chat_name?: string;
  bio: string;
  personality: string;
  scenario?: string;
  initial_message?: string;
  voice_id: VoiceId;
  tags: string[];
  visibility: Visibility;
  content_rating: ContentRating;
}

export async function createCharacter(data: CharacterFormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("characters").insert({
    owner_id: user.id,
    name: data.name,
    chat_name: data.chat_name || null,
    bio: data.bio,
    personality: data.personality,
    scenario: data.scenario || null,
    initial_message: data.initial_message || null,
    voice_id: data.voice_id,
    tags: data.tags,
    visibility: data.visibility,
    content_rating: data.content_rating,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/characters");
  redirect("/characters");
}

export async function updateCharacter(id: string, data: CharacterFormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("characters")
    .update({
      name: data.name,
      chat_name: data.chat_name || null,
      bio: data.bio,
      personality: data.personality,
      scenario: data.scenario || null,
      initial_message: data.initial_message || null,
      voice_id: data.voice_id,
      tags: data.tags,
      visibility: data.visibility,
      content_rating: data.content_rating,
    })
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/characters");
  redirect("/characters");
}

export async function deleteCharacter(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("characters")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/characters");
  redirect("/characters");
}
