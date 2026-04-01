"use client";

import type { Database } from "@/lib/supabase/types";

type Scenario = Database["public"]["Tables"]["scenarios"]["Row"];

interface LibraryScenarioCardProps {
  scenario: Scenario;
  creatorName: string;
  onClone: (id: string) => void;
}

export function LibraryScenarioCard({
  scenario,
  creatorName,
  onClone,
}: LibraryScenarioCardProps) {
  const truncatedDesc =
    scenario.scenario_description.length > 120
      ? scenario.scenario_description.slice(0, 120) + "..."
      : scenario.scenario_description;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <h3 className="text-lg font-semibold text-zinc-100">
        {scenario.scenario_title}
      </h3>

      <p className="mt-1 text-xs text-zinc-500">by {creatorName}</p>

      <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
        {truncatedDesc}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {scenario.setting && (
          <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
            {scenario.setting}
          </span>
        )}
        {scenario.time_period && (
          <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
            {scenario.time_period}
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center justify-end">
        <button
          onClick={() => onClone(scenario.id)}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-500"
        >
          Use This
        </button>
      </div>
    </div>
  );
}
