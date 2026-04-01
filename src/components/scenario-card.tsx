import Link from "next/link";
import type { Database } from "@/lib/supabase/types";

type Scenario = Database["public"]["Tables"]["scenarios"]["Row"];

export function ScenarioCard({ scenario }: { scenario: Scenario }) {
  const truncatedDesc =
    scenario.scenario_description.length > 120
      ? scenario.scenario_description.slice(0, 120) + "..."
      : scenario.scenario_description;

  return (
    <Link
      href={`/scenarios/${scenario.id}`}
      className="group block rounded-xl border border-zinc-800 bg-zinc-900 p-5 transition-colors hover:border-zinc-700"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-lg font-semibold text-zinc-100 group-hover:text-indigo-400 transition-colors">
          {scenario.scenario_title}
        </h3>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
            scenario.visibility === "public"
              ? "bg-emerald-900/50 text-emerald-400"
              : "bg-zinc-800 text-zinc-500"
          }`}
        >
          {scenario.visibility}
        </span>
      </div>

      <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
        {truncatedDesc}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {scenario.time_period && (
          <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
            {scenario.time_period}
          </span>
        )}
        {scenario.setting && (
          <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
            {scenario.setting}
          </span>
        )}
      </div>
    </Link>
  );
}
