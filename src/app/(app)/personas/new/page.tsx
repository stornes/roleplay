"use client";

import { PersonaForm, type PersonaFormData } from "@/components/persona-form";
import { createPersona } from "@/actions/personas";

export default function NewPersonaPage() {
  async function handleSubmit(data: PersonaFormData) {
    await createPersona(data);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-100 mb-6">
        Create Persona
      </h1>
      <PersonaForm onSubmit={handleSubmit} />
    </div>
  );
}
