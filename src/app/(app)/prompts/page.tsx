import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PromptCard } from "@/components/prompt-card";
import { Plus, Wand2 } from "lucide-react";

export default async function PromptsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: presets } = await supabase
    .from("advanced_prompt_presets")
    .select("*")
    .eq("owner_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Wand2 className="h-6 w-6 text-indigo-400" />
          <h1 className="text-2xl font-bold text-zinc-100">Prompt Presets</h1>
        </div>
        <Link
          href="/prompts/new"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
        >
          <Plus className="h-4 w-4" />
          Create Preset
        </Link>
      </div>

      {!presets?.length ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 py-16">
          <Wand2 className="h-12 w-12 text-zinc-700 mb-4" />
          <p className="text-zinc-400 mb-4">No prompt presets yet</p>
          <Link
            href="/prompts/new"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Create your first preset
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {presets.map((preset) => (
            <PromptCard key={preset.id} preset={preset} />
          ))}
        </div>
      )}
    </div>
  );
}
