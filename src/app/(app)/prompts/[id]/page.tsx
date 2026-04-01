import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { deletePromptPreset } from "@/actions/prompts";
import { Pencil, Trash2 } from "lucide-react";

export default async function PromptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: preset } = await supabase
    .from("advanced_prompt_presets")
    .select("*")
    .eq("id", id)
    .single();

  if (!preset) notFound();

  const deleteWithId = deletePromptPreset.bind(null, id);

  return (
    <div className="max-w-2xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">{preset.name}</h1>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/prompts/${id}/edit`}
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-800 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
          >
            <Pencil className="h-4 w-4" />
          </Link>
          <form action={deleteWithId}>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-800 px-3 py-2 text-sm text-red-400 hover:bg-red-900/30"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>

      <div className="space-y-6">
        <section>
          <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-2">
            Prompt Text
          </h2>
          <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap">
            {preset.prompt_text || "No prompt text set."}
          </p>
        </section>

        {preset.directives.length > 0 && (
          <section>
            <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-2">
              Directives
            </h2>
            <div className="flex flex-wrap gap-2">
              {preset.directives.map((directive, i) => (
                <span
                  key={i}
                  className="rounded-md bg-indigo-900/30 px-2.5 py-1 text-xs text-indigo-300"
                >
                  {directive}
                </span>
              ))}
            </div>
          </section>
        )}

        <div className="pt-2">
          <span className="text-xs text-zinc-500 uppercase tracking-wider">
            Created
          </span>
          <p className="text-sm text-zinc-300">
            {new Date(preset.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
}
