"use client";

import { CharacterForm, type CharacterFormData } from "@/components/character-form";
import { createCharacter } from "@/actions/characters";

export default function NewCharacterPage() {
  async function handleSubmit(data: CharacterFormData) {
    await createCharacter(data);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-100 mb-6">
        Create Character
      </h1>
      <CharacterForm onSubmit={handleSubmit} />
    </div>
  );
}
