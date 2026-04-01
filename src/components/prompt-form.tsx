"use client";

import { useState } from "react";
import type { Database } from "@/lib/supabase/types";

type PromptPreset = Database["public"]["Tables"]["advanced_prompt_presets"]["Row"];

export interface PromptFormData {
  name: string;
  prompt_text: string;
  directives: string[];
}

interface Props {
  initial?: PromptPreset | null;
  onSubmit: (data: PromptFormData) => Promise<void>;
}

const inputClass =
  "w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600";

const labelClass = "block text-sm font-medium text-zinc-300 mb-1.5";

export function PromptForm({ initial, onSubmit }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [promptText, setPromptText] = useState(initial?.prompt_text ?? "");
  const [directivesInput, setDirectivesInput] = useState(
    initial?.directives?.join(", ") ?? ""
  );
  const [submitting, setSubmitting] = useState(false);

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

    const n = get("Name") || get("Preset Name");
    const pt = get("Prompt") || get("Prompt Text");
    const d = get("Directives");

    if (n) setName(n);
    if (pt) setPromptText(pt);
    if (d) setDirectivesInput(d);
    setImportText("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const directives = directivesInput
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean);

      await onSubmit({
        name,
        prompt_text: promptText,
        directives,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      {/* Quick Import */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-zinc-100">Quick Import</h2>
        <p className="text-xs text-zinc-500">
          Paste a preset definition and it will auto-fill the fields below.
        </p>
        <textarea
          className={`${inputClass} h-28 resize-y`}
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder={
            "**Name:** Dark Fantasy\n**Prompt:** Write in a gothic tone...\n**Directives:** [scene:dark], [mood:tense]"
          }
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
        <h2 className="text-lg font-semibold text-zinc-100">Preset Details</h2>
        <div>
          <label className={labelClass}>
            Name <span className="text-red-500">*</span>
          </label>
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Preset name"
            required
          />
        </div>
        <div>
          <label className={labelClass}>Prompt Text</label>
          <textarea
            className={`${inputClass} h-40 resize-y`}
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            placeholder="Write the advanced prompt instructions here..."
          />
        </div>
        <div>
          <label className={labelClass}>Directives</label>
          <input
            className={inputClass}
            value={directivesInput}
            onChange={(e) => setDirectivesInput(e.target.value)}
            placeholder="[scene:dark], [mood:tense], [restrict:violence]"
          />
          <p className="mt-1.5 text-xs text-zinc-500">
            Comma-separated. Available prefixes: [scene:], [mood:], [restrict:]
          </p>
        </div>
      </section>

      <button
        type="submit"
        disabled={submitting || !name}
        className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting
          ? "Saving..."
          : initial
            ? "Update Preset"
            : "Create Preset"}
      </button>
    </form>
  );
}
