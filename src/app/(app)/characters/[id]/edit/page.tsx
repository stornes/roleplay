"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CharacterForm, type CharacterFormData } from "@/components/character-form";
import { updateCharacter } from "@/actions/characters";
import type { Database } from "@/lib/supabase/types";

type Character = Database["public"]["Tables"]["characters"]["Row"];

export default function EditCharacterPage() {
  const { id } = useParams<{ id: string }>();
  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("characters")
        .select("*")
        .eq("id", id)
        .single();
      setCharacter(data);
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleSubmit(data: CharacterFormData) {
    await updateCharacter(id, data);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-zinc-400">Loading...</p>
      </div>
    );
  }

  if (!character) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-zinc-400">Character not found</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-100 mb-6">
        Edit {character.name}
      </h1>
      <CharacterForm initial={character} onSubmit={handleSubmit} />
    </div>
  );
}
