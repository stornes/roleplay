import Link from "next/link";
import type { Database } from "@/lib/supabase/types";

type PromptPreset =
  Database["public"]["Tables"]["advanced_prompt_presets"]["Row"];

export function PromptCard({ preset }: { preset: PromptPreset }) {
  const truncatedText =
    preset.prompt_text.length > 100
      ? preset.prompt_text.slice(0, 100) + "..."
      : preset.prompt_text;

  return (
    <Link
      href={`/prompts/${preset.id}`}
      className="group block rounded-xl border border-zinc-800 bg-zinc-900 p-5 transition-colors hover:border-zinc-700"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-lg font-semibold text-zinc-100 group-hover:text-indigo-400 transition-colors">
          {preset.name}
        </h3>
        {preset.directives.length > 0 && (
          <span className="shrink-0 rounded-full bg-indigo-900/50 px-2 py-0.5 text-xs text-indigo-400">
            {preset.directives.length} directive
            {preset.directives.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {truncatedText && (
        <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
          {truncatedText}
        </p>
      )}
    </Link>
  );
}
