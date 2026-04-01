"use client";

import { PromptForm, type PromptFormData } from "@/components/prompt-form";
import { createPromptPreset } from "@/actions/prompts";

export default function NewPromptPage() {
  async function handleSubmit(data: PromptFormData) {
    await createPromptPreset(data);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-100 mb-6">
        Create Prompt Preset
      </h1>
      <PromptForm onSubmit={handleSubmit} />
    </div>
  );
}
