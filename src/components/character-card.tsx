import Link from "next/link";
import type { Database } from "@/lib/supabase/types";

type Character = Database["public"]["Tables"]["characters"]["Row"];

const voiceLabels: Record<string, string> = {
  ara: "Ara",
  rex: "Rex",
  sal: "Sal",
  eve: "Eve",
  leo: "Leo",
};

export function CharacterCard({ character }: { character: Character }) {
  const truncatedBio =
    character.bio.length > 120
      ? character.bio.slice(0, 120) + "..."
      : character.bio;

  return (
    <Link
      href={`/characters/${character.id}`}
      className="group block rounded-xl border border-zinc-800 bg-zinc-900 p-5 transition-colors hover:border-zinc-700"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-lg font-semibold text-zinc-100 group-hover:text-indigo-400 transition-colors">
          {character.name}
        </h3>
        <span className="shrink-0 rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-400">
          {voiceLabels[character.voice_id] ?? character.voice_id}
        </span>
      </div>

      <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
        {truncatedBio}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {character.tags.slice(0, 4).map((tag) => (
          <span
            key={tag}
            className="rounded-md bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300"
          >
            {tag}
          </span>
        ))}
        <span
          className={`ml-auto rounded-full px-2 py-0.5 text-xs ${
            character.visibility === "public"
              ? "bg-emerald-900/50 text-emerald-400"
              : "bg-zinc-800 text-zinc-500"
          }`}
        >
          {character.visibility}
        </span>
      </div>
    </Link>
  );
}
