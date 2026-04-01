"use client";

import { useState, useRef } from "react";
import { Upload } from "lucide-react";
import { createCharacter } from "@/actions/characters";
import { createPersona } from "@/actions/personas";

interface ImportMessage {
  type: "success" | "error";
  text: string;
}

export default function ImportPage() {
  const [charMessage, setCharMessage] = useState<ImportMessage | null>(null);
  const [personaMessage, setPersonaMessage] = useState<ImportMessage | null>(null);
  const [charLoading, setCharLoading] = useState(false);
  const [personaLoading, setPersonaLoading] = useState(false);
  const charInputRef = useRef<HTMLInputElement>(null);
  const personaInputRef = useRef<HTMLInputElement>(null);

  async function handleCharacterImport() {
    const file = charInputRef.current?.files?.[0];
    if (!file) {
      setCharMessage({ type: "error", text: "Please select a JSON file." });
      return;
    }

    setCharLoading(true);
    setCharMessage(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Validate required fields
      if (!data.name || typeof data.name !== "string") {
        throw new Error("Missing required field: name");
      }
      if (data.name.length > 100) throw new Error("Name must be under 100 characters");
      if (data.personality && data.personality.length > 10000) throw new Error("Personality must be under 10000 characters");
      if (data.bio && data.bio.length > 10000) throw new Error("Bio must be under 10000 characters");

      await createCharacter({
        name: data.name.slice(0, 100),
        chat_name: data.chat_name ? String(data.chat_name).slice(0, 100) : undefined,
        bio: data.bio ? String(data.bio).slice(0, 10000) : "",
        personality: data.personality ? String(data.personality).slice(0, 10000) : "",
        scenario: data.scenario ?? undefined,
        initial_message: data.initial_message ?? undefined,
        voice_id: ["ara", "rex", "sal", "eve", "leo"].includes(data.voice_id) ? data.voice_id : "ara",
        tags: Array.isArray(data.tags) ? data.tags.slice(0, 10).map(String) : [],
        visibility: "private" as const, // Always import as private for safety
        content_rating: ["sfw", "mature"].includes(data.content_rating) ? data.content_rating : "sfw",
      });

      setCharMessage({ type: "success", text: "Character imported successfully!" });
      if (charInputRef.current) charInputRef.current.value = "";
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to import";
      setCharMessage({ type: "error", text: msg });
    } finally {
      setCharLoading(false);
    }
  }

  async function handlePersonaImport() {
    const file = personaInputRef.current?.files?.[0];
    if (!file) {
      setPersonaMessage({ type: "error", text: "Please select a JSON file." });
      return;
    }

    setPersonaLoading(true);
    setPersonaMessage(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Validate required fields
      if (!data.persona_name || typeof data.persona_name !== "string") {
        throw new Error("Missing required field: persona_name");
      }

      await createPersona({
        persona_name: data.persona_name,
        persona_description: data.persona_description ?? "",
        persona_appearance: data.persona_appearance ?? undefined,
        is_default: data.is_default ?? false,
      });

      setPersonaMessage({ type: "success", text: "Persona imported successfully!" });
      if (personaInputRef.current) personaInputRef.current.value = "";
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to import";
      setPersonaMessage({ type: "error", text: msg });
    } finally {
      setPersonaLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-100 mb-6">Import</h1>

      <div className="space-y-8">
        {/* Character Import */}
        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-lg font-semibold text-zinc-100 mb-4">
            Import Character
          </h2>
          <p className="text-sm text-zinc-400 mb-4">
            Upload a JSON file containing character data. Required field: name.
          </p>

          <div className="flex items-center gap-3">
            <input
              ref={charInputRef}
              type="file"
              accept=".json"
              className="text-sm text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-800 file:px-4 file:py-2 file:text-sm file:font-medium file:text-zinc-300 hover:file:bg-zinc-700"
            />
            <button
              onClick={handleCharacterImport}
              disabled={charLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
            >
              <Upload className="h-4 w-4" />
              {charLoading ? "Importing..." : "Import"}
            </button>
          </div>

          {charMessage && (
            <p
              className={`mt-3 text-sm ${
                charMessage.type === "success"
                  ? "text-emerald-400"
                  : "text-red-400"
              }`}
            >
              {charMessage.text}
            </p>
          )}
        </section>

        {/* Persona Import */}
        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-lg font-semibold text-zinc-100 mb-4">
            Import Persona
          </h2>
          <p className="text-sm text-zinc-400 mb-4">
            Upload a JSON file containing persona data. Required field: persona_name.
          </p>

          <div className="flex items-center gap-3">
            <input
              ref={personaInputRef}
              type="file"
              accept=".json"
              className="text-sm text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-800 file:px-4 file:py-2 file:text-sm file:font-medium file:text-zinc-300 hover:file:bg-zinc-700"
            />
            <button
              onClick={handlePersonaImport}
              disabled={personaLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
            >
              <Upload className="h-4 w-4" />
              {personaLoading ? "Importing..." : "Import"}
            </button>
          </div>

          {personaMessage && (
            <p
              className={`mt-3 text-sm ${
                personaMessage.type === "success"
                  ? "text-emerald-400"
                  : "text-red-400"
              }`}
            >
              {personaMessage.text}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
