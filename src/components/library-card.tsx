"use client";

import type { Database } from "@/lib/supabase/types";

type Character = Database["public"]["Tables"]["characters"]["Row"];

const voiceLabels: Record<string, string> = {
  ara: "Ara",
  rex: "Rex",
  sal: "Sal",
  eve: "Eve",
  leo: "Leo",
};

interface LibraryCardProps {
  character: Character;
  creatorName: string;
  onClone: (id: string) => void;
}

export function LibraryCard({ character, creatorName, onClone }: LibraryCardProps) {
  const truncatedBio =
    character.bio.length > 120
      ? character.bio.slice(0, 120) + "..."
      : character.bio;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-lg font-semibold text-zinc-100">
          {character.name}
        </h3>
        <span className="shrink-0 rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-400">
          {voiceLabels[character.voice_id] ?? character.voice_id}
        </span>
      </div>

      <p className="mt-1 text-xs text-zinc-500">by {creatorName}</p>

      <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
        {truncatedBio}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {character.tags.slice(0, 4).map((tag) => (
          <span
            key={tag}
            className="rounded-md bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            character.content_rating === "sfw"
              ? "bg-emerald-900/50 text-emerald-400"
              : "bg-amber-900/50 text-amber-400"
          }`}
        >
          {character.content_rating.toUpperCase()}
        </span>

        <button
          onClick={() => onClone(character.id)}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-500"
        >
          Use This
        </button>
      </div>
    </div>
  );
}
