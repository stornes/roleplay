"use client";

import { useState } from "react";
import type { Visibility, Database } from "@/lib/supabase/types";

type Scenario = Database["public"]["Tables"]["scenarios"]["Row"];

export interface ScenarioFormData {
  scenario_title: string;
  scenario_description: string;
  time_period?: string;
  setting?: string;
  visibility: Visibility;
}

interface Props {
  initial?: Scenario | null;
  onSubmit: (data: ScenarioFormData) => Promise<void>;
}

const inputClass =
  "w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600";

const labelClass = "block text-sm font-medium text-zinc-300 mb-1.5";

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
  const [submitting, setSubmitting] = useState(false);

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
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
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
