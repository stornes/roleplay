import Link from "next/link";
import type { Database } from "@/lib/supabase/types";

type Persona = Database["public"]["Tables"]["personas"]["Row"];

export function PersonaCard({ persona }: { persona: Persona }) {
  const truncatedDesc =
    persona.persona_description.length > 120
      ? persona.persona_description.slice(0, 120) + "..."
      : persona.persona_description;

  return (
    <Link
      href={`/personas/${persona.id}`}
      className="group block rounded-xl border border-zinc-800 bg-zinc-900 p-5 transition-colors hover:border-zinc-700"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-lg font-semibold text-zinc-100 group-hover:text-indigo-400 transition-colors">
          {persona.persona_name}
        </h3>
        {persona.is_default && (
          <span className="shrink-0 rounded-full bg-indigo-900/50 px-2.5 py-0.5 text-xs text-indigo-400">
            Default
          </span>
        )}
      </div>

      <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
        {truncatedDesc}
      </p>
    </Link>
  );
}
