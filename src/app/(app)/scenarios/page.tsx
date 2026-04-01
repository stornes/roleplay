import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ScenarioCard } from "@/components/scenario-card";
import { Plus } from "lucide-react";

export default async function ScenariosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: scenarios } = await supabase
    .from("scenarios")
    .select("*")
    .eq("owner_id", user!.id)
    .order("updated_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-zinc-100">Scenarios</h1>
        <Link
          href="/scenarios/new"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
        >
          <Plus className="h-4 w-4" />
          Create Scenario
        </Link>
      </div>

      {!scenarios?.length ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 py-16">
          <p className="text-zinc-400 mb-4">No scenarios yet</p>
          <Link
            href="/scenarios/new"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Create your first scenario
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {scenarios.map((scenario) => (
            <ScenarioCard key={scenario.id} scenario={scenario} />
          ))}
        </div>
      )}
    </div>
  );
}
