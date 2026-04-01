"use client";

import { ScenarioForm, type ScenarioFormData } from "@/components/scenario-form";
import { createScenario } from "@/actions/scenarios";

export default function NewScenarioPage() {
  async function handleSubmit(data: ScenarioFormData) {
    await createScenario(data);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-100 mb-6">
        Create Scenario
      </h1>
      <ScenarioForm onSubmit={handleSubmit} />
    </div>
  );
}
