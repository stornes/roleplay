"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PromptForm, type PromptFormData } from "@/components/prompt-form";
import { updatePromptPreset } from "@/actions/prompts";
import type { Database } from "@/lib/supabase/types";

type PromptPreset =
  Database["public"]["Tables"]["advanced_prompt_presets"]["Row"];

export default function EditPromptPage() {
  const { id } = useParams<{ id: string }>();
  const [preset, setPreset] = useState<PromptPreset | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("advanced_prompt_presets")
        .select("*")
        .eq("id", id)
        .single();
      setPreset(data);
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleSubmit(data: PromptFormData) {
    await updatePromptPreset(id, data);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-zinc-400">Loading...</p>
      </div>
    );
  }

  if (!preset) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-zinc-400">Preset not found</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-100 mb-6">
        Edit {preset.name}
      </h1>
      <PromptForm initial={preset} onSubmit={handleSubmit} />
    </div>
  );
}
