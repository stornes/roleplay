"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function deleteMemory(memoryId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("memory_ltm")
    .delete()
    .eq("id", memoryId)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/memories");
}
