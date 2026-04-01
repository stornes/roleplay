"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Play } from "lucide-react";
import type { Database } from "@/lib/supabase/types";

type Persona = Database["public"]["Tables"]["personas"]["Row"];
type Scenario = Database["public"]["Tables"]["scenarios"]["Row"];

const selectClass =
  "w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600";

interface Props {
  characterId: string;
}

export function StartSessionForm({ characterId }: Props) {
  const router = useRouter();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [personaId, setPersonaId] = useState<string>("");
  const [scenarioId, setScenarioId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [personaRes, scenarioRes] = await Promise.all([
        supabase
          .from("personas")
          .select("*")
          .order("is_default", { ascending: false })
          .order("persona_name"),
        supabase
          .from("scenarios")
          .select("*")
          .order("scenario_title"),
      ]);
      const personaList = personaRes.data ?? [];
      const scenarioList = scenarioRes.data ?? [];
      setPersonas(personaList);
      setScenarios(scenarioList);

      const defaultPersona = personaList.find((p) => p.is_default);
      if (defaultPersona) {
        setPersonaId(defaultPersona.id);
      }

      setLoaded(true);
    }
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId,
          personaId: personaId || null,
          scenarioId: scenarioId || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to create session");
      }

      const { sessionId } = await res.json();
      router.push(`/sessions/${sessionId}`);
    } finally {
      setSubmitting(false);
    }
  }

  if (!loaded) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        <p className="text-sm text-zinc-500">Loading session options...</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 space-y-4"
    >
      <h3 className="text-sm font-medium text-zinc-300">Start a Session</h3>

      <div>
        <label className="block text-xs text-zinc-500 mb-1">Persona</label>
        <select
          className={selectClass}
          value={personaId}
          onChange={(e) => setPersonaId(e.target.value)}
        >
          <option value="">No persona</option>
          {personas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.persona_name}
              {p.is_default ? " (default)" : ""}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs text-zinc-500 mb-1">
          Scenario (optional)
        </label>
        <select
          className={selectClass}
          value={scenarioId}
          onChange={(e) => setScenarioId(e.target.value)}
        >
          <option value="">None</option>
          {scenarios.map((s) => (
            <option key={s.id} value={s.id}>
              {s.scenario_title}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Play className="h-4 w-4" />
        {submitting ? "Starting..." : "Start Session"}
      </button>
    </form>
  );
}
