"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ScenarioForm, type ScenarioFormData } from "@/components/scenario-form";
import { updateScenario } from "@/actions/scenarios";
import type { Database } from "@/lib/supabase/types";

type Scenario = Database["public"]["Tables"]["scenarios"]["Row"];

export default function EditScenarioPage() {
  const { id } = useParams<{ id: string }>();
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("scenarios")
        .select("*")
        .eq("id", id)
        .single();
      setScenario(data);
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleSubmit(data: ScenarioFormData) {
    await updateScenario(id, data);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-zinc-400">Loading...</p>
      </div>
    );
  }

  if (!scenario) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-zinc-400">Scenario not found</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-100 mb-6">
        Edit {scenario.scenario_title}
      </h1>
      <ScenarioForm initial={scenario} onSubmit={handleSubmit} />
    </div>
  );
}
