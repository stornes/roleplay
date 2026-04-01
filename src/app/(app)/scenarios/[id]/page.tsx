import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { deleteScenario } from "@/actions/scenarios";
import { Pencil, Trash2 } from "lucide-react";

export default async function ScenarioDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: scenario } = await supabase
    .from("scenarios")
    .select("*")
    .eq("id", id)
    .single();

  if (!scenario) notFound();

  const deleteWithId = deleteScenario.bind(null, id);

  return (
    <div className="max-w-2xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">
            {scenario.scenario_title}
          </h1>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/scenarios/${id}/edit`}
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-800 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
          >
            <Pencil className="h-4 w-4" />
          </Link>
          <form action={deleteWithId}>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-800 px-3 py-2 text-sm text-red-400 hover:bg-red-900/30"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>

      <div className="space-y-6">
        <section>
          <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-2">
            Description
          </h2>
          <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap">
            {scenario.scenario_description}
          </p>
        </section>

        {scenario.time_period && (
          <section>
            <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-2">
              Time Period
            </h2>
            <p className="text-zinc-300">{scenario.time_period}</p>
          </section>
        )}

        {scenario.setting && (
          <section>
            <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-2">
              Setting
            </h2>
            <p className="text-zinc-300">{scenario.setting}</p>
          </section>
        )}

        <div className="flex flex-wrap gap-4 pt-2">
          <div>
            <span className="text-xs text-zinc-500 uppercase tracking-wider">
              Visibility
            </span>
            <p className="text-sm text-zinc-300">{scenario.visibility}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
