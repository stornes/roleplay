import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { deleteCharacter } from "@/actions/characters";
import { createSessionAction } from "@/actions/sessions";
import { Pencil, Trash2, Play } from "lucide-react";

const voiceLabels: Record<string, string> = {
  ara: "Ara",
  rex: "Rex",
  sal: "Sal",
  eve: "Eve",
  leo: "Leo",
};

export default async function CharacterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: character } = await supabase
    .from("characters")
    .select("*")
    .eq("id", id)
    .single();

  if (!character) notFound();

  const deleteWithId = deleteCharacter.bind(null, id);
  const startSession = createSessionAction.bind(null, id);

  return (
    <div className="max-w-2xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">
            {character.name}
          </h1>
          {character.chat_name && (
            <p className="text-sm text-zinc-400 mt-1">
              Chat name: {character.chat_name}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <form action={startSession}>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
            >
              <Play className="h-4 w-4" />
              Start Session
            </button>
          </form>
          <Link
            href={`/characters/${id}/edit`}
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
            Bio
          </h2>
          <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap">
            {character.bio}
          </p>
        </section>

        <section>
          <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-2">
            Personality
          </h2>
          <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap">
            {character.personality}
          </p>
        </section>

        {character.scenario && (
          <section>
            <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-2">
              Scenario
            </h2>
            <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap">
              {character.scenario}
            </p>
          </section>
        )}

        {character.initial_message && (
          <section>
            <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-2">
              Initial Message
            </h2>
            <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-4">
              <p className="text-zinc-300 italic whitespace-pre-wrap">
                {character.initial_message}
              </p>
            </div>
          </section>
        )}

        <div className="flex flex-wrap gap-4 pt-2">
          <div>
            <span className="text-xs text-zinc-500 uppercase tracking-wider">
              Voice
            </span>
            <p className="text-sm text-zinc-300">
              {voiceLabels[character.voice_id]}
            </p>
          </div>
          <div>
            <span className="text-xs text-zinc-500 uppercase tracking-wider">
              Visibility
            </span>
            <p className="text-sm text-zinc-300">{character.visibility}</p>
          </div>
          <div>
            <span className="text-xs text-zinc-500 uppercase tracking-wider">
              Rating
            </span>
            <p className="text-sm text-zinc-300">
              {character.content_rating.toUpperCase()}
            </p>
          </div>
        </div>

        {character.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {character.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-zinc-800 px-2.5 py-1 text-xs text-zinc-300"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
