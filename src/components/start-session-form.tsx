"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Play, X } from "lucide-react";
import type { Database } from "@/lib/supabase/types";

type Persona = Database["public"]["Tables"]["personas"]["Row"];
type Scenario = Database["public"]["Tables"]["scenarios"]["Row"];
type Character = Database["public"]["Tables"]["characters"]["Row"];
type PromptPreset =
  Database["public"]["Tables"]["advanced_prompt_presets"]["Row"];

const selectClass =
  "w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600";

interface Props {
  characterId: string;
}

export function StartSessionForm({ characterId }: Props) {
  const router = useRouter();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [presets, setPresets] = useState<PromptPreset[]>([]);
  const [personaId, setPersonaId] = useState<string>("");
  const [scenarioId, setScenarioId] = useState<string>("");
  const [advancedPromptPresetId, setAdvancedPromptPresetId] =
    useState<string>("");
  const [castIds, setCastIds] = useState<string[]>([characterId]);
  const [submitting, setSubmitting] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [personaRes, scenarioRes, characterRes, presetRes] =
        await Promise.all([
          supabase
            .from("personas")
            .select("*")
            .order("is_default", { ascending: false })
            .order("persona_name"),
          supabase.from("scenarios").select("*").order("scenario_title"),
          supabase.from("characters").select("*").order("name"),
          supabase
            .from("advanced_prompt_presets")
            .select("*")
            .order("name"),
        ]);
      const personaList = personaRes.data ?? [];
      const scenarioList = scenarioRes.data ?? [];
      setPersonas(personaList);
      setScenarios(scenarioList);
      setCharacters(characterRes.data ?? []);
      setPresets(presetRes.data ?? []);

      const defaultPersona = personaList.find((p) => p.is_default);
      if (defaultPersona) {
        setPersonaId(defaultPersona.id);
      }

      setLoaded(true);
    }
    load();
  }, []);

  const handleScenarioChange = useCallback(
    (newScenarioId: string) => {
      setScenarioId(newScenarioId);
      if (newScenarioId) {
        const scenario = scenarios.find((s) => s.id === newScenarioId);
        if (scenario && scenario.default_cast.length > 0) {
          // Set cast to default_cast, ensuring the primary character is first
          const cast = [characterId, ...scenario.default_cast].filter(
            (id, i, arr) => arr.indexOf(id) === i
          );
          setCastIds(cast);
        } else {
          setCastIds([characterId]);
        }
      } else {
        setCastIds([characterId]);
      }
    },
    [scenarios, characterId]
  );

  function addToCast(charId: string) {
    if (!castIds.includes(charId)) {
      setCastIds((prev) => [...prev, charId]);
    }
  }

  function removeFromCast(charId: string) {
    if (charId === characterId) return; // cannot remove the primary character
    setCastIds((prev) => prev.filter((id) => id !== charId));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterIds: castIds,
          personaId: personaId || null,
          scenarioId: scenarioId || null,
          advancedPromptPresetId: advancedPromptPresetId || null,
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

  const availableToAdd = characters.filter((c) => !castIds.includes(c.id));

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
          onChange={(e) => handleScenarioChange(e.target.value)}
        >
          <option value="">None</option>
          {scenarios.map((s) => (
            <option key={s.id} value={s.id}>
              {s.scenario_title}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs text-zinc-500 mb-1">
          Advanced Prompt (optional)
        </label>
        <select
          className={selectClass}
          value={advancedPromptPresetId}
          onChange={(e) => setAdvancedPromptPresetId(e.target.value)}
        >
          <option value="">None</option>
          {presets.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Cast section */}
      <div>
        <label className="block text-xs text-zinc-500 mb-1">Cast</label>
        <div className="space-y-1.5">
          {castIds.map((cid, index) => {
            const char = characters.find((c) => c.id === cid);
            if (!char) return null;
            return (
              <div
                key={cid}
                className="flex items-center justify-between rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-100">{char.name}</span>
                  {index === 0 && (
                    <span className="rounded-full bg-indigo-600/30 px-2 py-0.5 text-[10px] font-medium text-indigo-300">
                      primary
                    </span>
                  )}
                </div>
                {cid !== characterId && (
                  <button
                    type="button"
                    onClick={() => removeFromCast(cid)}
                    className="p-0.5 text-zinc-500 hover:text-red-400 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {availableToAdd.length > 0 && (
          <select
            className={`${selectClass} mt-2`}
            value=""
            onChange={(e) => {
              if (e.target.value) addToCast(e.target.value);
            }}
          >
            <option value="">Add character to cast...</option>
            {availableToAdd.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
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
