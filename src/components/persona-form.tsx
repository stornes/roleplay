"use client";

import { useState } from "react";
import type { Database } from "@/lib/supabase/types";

type Persona = Database["public"]["Tables"]["personas"]["Row"];

export interface PersonaFormData {
  persona_name: string;
  persona_description: string;
  persona_appearance?: string;
  is_default: boolean;
}

interface Props {
  initial?: Persona | null;
  onSubmit: (data: PersonaFormData) => Promise<void>;
}

const inputClass =
  "w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600";

const labelClass = "block text-sm font-medium text-zinc-300 mb-1.5";

export function PersonaForm({ initial, onSubmit }: Props) {
  const [personaName, setPersonaName] = useState(initial?.persona_name ?? "");
  const [personaDescription, setPersonaDescription] = useState(
    initial?.persona_description ?? ""
  );
  const [personaAppearance, setPersonaAppearance] = useState(
    initial?.persona_appearance ?? ""
  );
  const [isDefault, setIsDefault] = useState(initial?.is_default ?? false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({
        persona_name: personaName,
        persona_description: personaDescription,
        persona_appearance: personaAppearance || undefined,
        is_default: isDefault,
      });
    } finally {
      setSubmitting(false);
    }
  }

  const [importText, setImportText] = useState("");

  function handleImport() {
    if (!importText.trim()) return;
    const text = importText;

    // Parse **Field:** Value or Field: Value patterns
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

    const name = get("Persona Name") || get("Name");
    const desc = get("Persona Description") || get("Description");
    const appearance = get("Persona Appearance") || get("Appearance");

    if (name) setPersonaName(name);
    if (desc) setPersonaDescription(desc);
    if (appearance) setPersonaAppearance(appearance);
    setImportText("");
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      {/* Quick Import */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-zinc-100">Quick Import</h2>
        <p className="text-xs text-zinc-500">
          Paste a persona definition and it will auto-fill the fields below.
        </p>
        <textarea
          className={`${inputClass} h-28 resize-y`}
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder={"**Name:** Sverre\n**Description:** Late 50s Norwegian...\n**Appearance:** Tall, fit..."}
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
        <h2 className="text-lg font-semibold text-zinc-100">Persona Details</h2>
        <div>
          <label className={labelClass}>
            Name <span className="text-red-500">*</span>
          </label>
          <input
            className={inputClass}
            value={personaName}
            onChange={(e) => setPersonaName(e.target.value)}
            placeholder="Your persona name"
            required
          />
        </div>
        <div>
          <label className={labelClass}>Description</label>
          <textarea
            className={`${inputClass} h-32 resize-y`}
            value={personaDescription}
            onChange={(e) => setPersonaDescription(e.target.value)}
            placeholder="Describe this persona, their background, personality..."
          />
        </div>
        <div>
          <label className={labelClass}>Appearance</label>
          <textarea
            className={`${inputClass} h-24 resize-y`}
            value={personaAppearance}
            onChange={(e) => setPersonaAppearance(e.target.value)}
            placeholder="Optional physical appearance description"
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-zinc-100">Settings</h2>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-indigo-600 focus:ring-indigo-600 focus:ring-offset-0"
          />
          <span className="text-sm text-zinc-300">
            Set as default persona
          </span>
        </label>
      </section>

      <button
        type="submit"
        disabled={submitting || !personaName}
        className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting
          ? "Saving..."
          : initial
            ? "Update Persona"
            : "Create Persona"}
      </button>
    </form>
  );
}
