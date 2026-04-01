"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Visibility, Database } from "@/lib/supabase/types";

type Scenario = Database["public"]["Tables"]["scenarios"]["Row"];
type Character = Database["public"]["Tables"]["characters"]["Row"];

export interface ScenarioFormData {
  scenario_title: string;
  scenario_description: string;
  time_period?: string;
  setting?: string;
  visibility: Visibility;
  default_cast: string[];
}

interface Props {
  initial?: Scenario | null;
  onSubmit: (data: ScenarioFormData) => Promise<void>;
}

const inputClass =
  "w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600";

const labelClass = "block text-sm font-medium text-zinc-300 mb-1.5";

const voiceBadgeColors: Record<string, string> = {
  ara: "bg-pink-900/50 text-pink-400",
  rex: "bg-amber-900/50 text-amber-400",
  sal: "bg-cyan-900/50 text-cyan-400",
  eve: "bg-violet-900/50 text-violet-400",
  leo: "bg-emerald-900/50 text-emerald-400",
};

export function ScenarioForm({ initial, onSubmit }: Props) {
  const [title, setTitle] = useState(initial?.scenario_title ?? "");
  const [description, setDescription] = useState(
    initial?.scenario_description ?? ""
  );
  const [timePeriod, setTimePeriod] = useState(initial?.time_period ?? "");
  const [setting, setSetting] = useState(initial?.setting ?? "");
  const [visibility, setVisibility] = useState<Visibility>(
    initial?.visibility ?? "private"
  );
  const [defaultCast, setDefaultCast] = useState<string[]>(
    initial?.default_cast ?? []
  );
  const [characters, setCharacters] = useState<Character[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadCharacters() {
      const supabase = createClient();
      const { data } = await supabase
        .from("characters")
        .select("*")
        .order("name");
      setCharacters(data ?? []);
    }
    loadCharacters();
  }, []);

  function toggleCast(charId: string) {
    setDefaultCast((prev) =>
      prev.includes(charId)
        ? prev.filter((id) => id !== charId)
        : [...prev, charId]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({
        scenario_title: title,
        scenario_description: description,
        time_period: timePeriod || undefined,
        setting: setting || undefined,
        visibility,
        default_cast: defaultCast,
      });
    } finally {
      setSubmitting(false);
    }
  }

  const [importText, setImportText] = useState("");

  function handleImport() {
    if (!importText.trim()) return;
    const text = importText;

    const get = (key: string): string => {
      const patterns = [
        new RegExp(`\\*\\*${key}:\\*\\*\\s*(.+?)(?=\\n\\*\\*|\\n\\n|$)`, "is"),
        new RegExp(`^${key}:\\s*(.+?)(?=\\n[A-Z]|\\n\\n|$)`, "ims"),
      ];
      for (const pat of patterns) {
        const m = text.match(pat);
        if (m) return m[1].trim();
      }
      return "";
    };

    const t = get("Title") || get("Scenario Title");
    const desc = get("Description") || get("Scenario Description");
    const tp = get("Time Period");
    const s = get("Setting");

    if (t) setTitle(t);
    if (desc) setDescription(desc);
    if (tp) setTimePeriod(tp);
    if (s) setSetting(s);
    setImportText("");
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      {/* Quick Import */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-zinc-100">Quick Import</h2>
        <p className="text-xs text-zinc-500">
          Paste a scenario definition and it will auto-fill the fields below.
        </p>
        <textarea
          className={`${inputClass} h-28 resize-y`}
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder={"**Title:** Cabin Fever\n**Description:** A remote cabin...\n**Time Period:** Present day\n**Setting:** Northern Norway"}
        />
        <button
          type="button"
          onClick={handleImport}
          disabled={!importText.trim()}
          className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700 disabled:opacity-50"
        >
          Parse and Fill
        </button>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-zinc-100">
          Scenario Details
        </h2>
        <div>
          <label className={labelClass}>
            Title <span className="text-red-500">*</span>
          </label>
          <input
            className={inputClass}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Scenario title"
            required
          />
        </div>
        <div>
          <label className={labelClass}>Description</label>
          <textarea
            className={`${inputClass} h-32 resize-y`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the scenario, plot hooks, key events..."
          />
        </div>
        <div>
          <label className={labelClass}>Time Period</label>
          <input
            className={inputClass}
            value={timePeriod}
            onChange={(e) => setTimePeriod(e.target.value)}
            placeholder="e.g. Medieval, Modern, 2077"
          />
        </div>
        <div>
          <label className={labelClass}>Setting</label>
          <input
            className={inputClass}
            value={setting}
            onChange={(e) => setSetting(e.target.value)}
            placeholder="e.g. Fantasy Kingdom, Space Station, Tokyo"
          />
        </div>
      </section>

      {/* Default Cast */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-zinc-100">Default Cast</h2>
        <p className="text-xs text-zinc-500">
          Select characters that will be auto-populated when starting a session
          with this scenario.
        </p>
        {characters.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No characters found. Create characters first.
          </p>
        ) : (
          <div className="space-y-2">
            {characters.map((char) => (
              <label
                key={char.id}
                className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 cursor-pointer hover:border-zinc-700 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={defaultCast.includes(char.id)}
                  onChange={() => toggleCast(char.id)}
                  className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-indigo-600 focus:ring-indigo-600 focus:ring-offset-0"
                />
                <span className="text-sm text-zinc-100 font-medium">{char.name}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    voiceBadgeColors[char.voice_id] ??
                    "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  {char.voice_id}
                </span>
              </label>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-zinc-100">Settings</h2>
        <div>
          <label className={labelClass}>Visibility</label>
          <div className="flex gap-2">
            {(["private", "public"] as Visibility[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVisibility(v)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  visibility === v
                    ? "bg-indigo-600 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </section>

      <button
        type="submit"
        disabled={submitting || !title}
        className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting
          ? "Saving..."
          : initial
            ? "Update Scenario"
            : "Create Scenario"}
      </button>
    </form>
  );
}
