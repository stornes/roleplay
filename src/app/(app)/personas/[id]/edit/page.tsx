"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PersonaForm, type PersonaFormData } from "@/components/persona-form";
import { updatePersona } from "@/actions/personas";
import type { Database } from "@/lib/supabase/types";

type Persona = Database["public"]["Tables"]["personas"]["Row"];

export default function EditPersonaPage() {
  const { id } = useParams<{ id: string }>();
  const [persona, setPersona] = useState<Persona | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("personas")
        .select("*")
        .eq("id", id)
        .single();
      setPersona(data);
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleSubmit(data: PersonaFormData) {
    await updatePersona(id, data);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-zinc-400">Loading...</p>
      </div>
    );
  }

  if (!persona) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-zinc-400">Persona not found</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-100 mb-6">
        Edit {persona.persona_name}
      </h1>
      <PersonaForm initial={persona} onSubmit={handleSubmit} />
    </div>
  );
}
