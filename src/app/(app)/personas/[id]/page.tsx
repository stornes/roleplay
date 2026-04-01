import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { deletePersona } from "@/actions/personas";
import { Pencil, Trash2 } from "lucide-react";

export default async function PersonaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: persona } = await supabase
    .from("personas")
    .select("*")
    .eq("id", id)
    .single();

  if (!persona) notFound();

  const deleteWithId = deletePersona.bind(null, id);

  return (
    <div className="max-w-2xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">
            {persona.persona_name}
          </h1>
          {persona.is_default && (
            <span className="mt-1 inline-block rounded-full bg-indigo-900/50 px-2.5 py-0.5 text-xs text-indigo-400">
              Default Persona
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Link
            href={`/personas/${id}/edit`}
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
            Description
          </h2>
          <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap">
            {persona.persona_description}
          </p>
        </section>

        {persona.persona_appearance && (
          <section>
            <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-2">
              Appearance
            </h2>
            <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap">
              {persona.persona_appearance}
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
