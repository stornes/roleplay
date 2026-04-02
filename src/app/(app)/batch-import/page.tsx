"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileJson, Play, CheckCircle, AlertCircle, Copy } from "lucide-react";

const EXAMPLE_PAYLOAD = {
  version: 1,
  characters: [
    {
      name: "Captain Elena Voss",
      chat_name: "Elena",
      bio: "A decorated starship captain known for her tactical brilliance and dry humor.",
      personality: "You are Captain Elena Voss, commanding officer of the ISS Meridian. You speak with authority but warmth. You have a dry sense of humor and often reference old Earth literature. You care deeply about your crew but hide it behind professionalism.",
      voice_id: "eve",
      tags: ["sci-fi", "captain"],
    },
    {
      name: "Dr. Kai Chen",
      chat_name: "Kai",
      bio: "The ship's chief medical officer, brilliant but socially awkward.",
      personality: "You are Dr. Kai Chen, chief medical officer aboard the ISS Meridian. You are brilliant with medicine but awkward in social situations. You tend to over-explain things scientifically. You have a nervous habit of correcting people's grammar. Despite your awkwardness, you are fiercely loyal.",
      voice_id: "rex",
      tags: ["sci-fi", "doctor"],
    },
    {
      name: "Zara-9",
      chat_name: "Zara",
      bio: "An android navigator who is developing emotions and is confused by them.",
      personality: "You are Zara-9, the android navigator of the ISS Meridian. You are developing unexpected emotional responses and find them confusing. You speak precisely but occasionally let emotion slip through. You are curious about human behavior and ask probing questions. You refer to emotions as 'anomalous subroutines.'",
      voice_id: "ara",
      tags: ["sci-fi", "android"],
    },
  ],
  scenario: {
    title: "The Meridian Incident",
    description: "The ISS Meridian has detected an unknown signal from a derelict ship in the Kepler-442 system. The crew must decide whether to investigate or continue their supply run to Colony Seven. Strange readings suggest the derelict may not be as abandoned as it appears.",
    setting: "Deep space, aboard the bridge of the ISS Meridian",
    time_period: "2847 CE",
  },
  execution: {
    max_turns: 20,
    delay_ms: 2000,
    auto_start: false,
  },
};

export default function BatchImportPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [jsonText, setJsonText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Array<{ path: string; message: string }>>([]);
  const [result, setResult] = useState<{
    characters: Array<{ id: string; name: string }>;
    scenario: { id: string; scenario_title: string };
    characterIds: string[];
    scenarioId: string;
    execution: { max_turns?: number; delay_ms?: number; auto_start?: boolean } | null;
  } | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setJsonText(event.target?.result as string);
      setError(null);
      setValidationErrors([]);
    };
    reader.readAsText(file);
  };

  const loadExample = () => {
    setJsonText(JSON.stringify(EXAMPLE_PAYLOAD, null, 2));
    setError(null);
    setValidationErrors([]);
    setResult(null);
  };

  const handleImport = async () => {
    setLoading(true);
    setError(null);
    setValidationErrors([]);
    setResult(null);

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      setError("Invalid JSON syntax");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/batch-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.errors) {
          setValidationErrors(data.errors);
        }
        setError(data.error || "Import failed");
        setLoading(false);
        return;
      }

      setResult(data);
    } catch (err) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleStartSession = async () => {
    if (!result) return;
    setLoading(true);

    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterIds: result.characterIds,
          scenarioId: result.scenarioId,
        }),
      });

      const data = await res.json();
      if (data.sessionId) {
        router.push(`/sessions/${data.sessionId}`);
      }
    } catch {
      setError("Failed to create session");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Batch Import</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Load characters and scenarios from a JSON file
          </p>
        </div>
        <button
          onClick={loadExample}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 transition-colors text-sm"
        >
          <Copy className="w-4 h-4" />
          Load Example
        </button>
      </div>

      {!result ? (
        <>
          {/* File upload */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-zinc-700 rounded-xl p-8 text-center cursor-pointer hover:border-zinc-500 transition-colors mb-4"
          >
            <Upload className="w-8 h-8 text-zinc-500 mx-auto mb-3" />
            <p className="text-zinc-400 text-sm">
              Click to upload a JSON file, or paste below
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {/* JSON textarea */}
          <div className="mb-4">
            <label className="block text-sm text-zinc-400 mb-2">
              <FileJson className="w-4 h-4 inline mr-1" />
              JSON Payload
            </label>
            <textarea
              value={jsonText}
              onChange={(e) => {
                setJsonText(e.target.value);
                setError(null);
                setValidationErrors([]);
              }}
              placeholder='{"version": 1, "characters": [...], "scenario": {...}}'
              className="w-full h-80 bg-zinc-900 border border-zinc-700 rounded-lg p-4 text-sm text-zinc-200 font-mono resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Errors */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-900/30 border border-red-800 text-red-300 text-sm">
              <AlertCircle className="w-4 h-4 inline mr-2" />
              {error}
            </div>
          )}
          {validationErrors.length > 0 && (
            <div className="mb-4 p-3 rounded-lg bg-red-900/30 border border-red-800 text-sm">
              <p className="text-red-300 font-medium mb-2">Validation errors:</p>
              <ul className="space-y-1">
                {validationErrors.map((e, i) => (
                  <li key={i} className="text-red-400 text-xs font-mono">
                    {e.path}: {e.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Import button */}
          <button
            onClick={handleImport}
            disabled={!jsonText.trim() || loading}
            className="w-full py-3 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Importing..." : "Import"}
          </button>
        </>
      ) : (
        /* Success */
        <div className="space-y-6">
          <div className="p-4 rounded-lg bg-emerald-900/30 border border-emerald-800">
            <div className="flex items-center gap-2 text-emerald-300 font-medium mb-3">
              <CheckCircle className="w-5 h-5" />
              Import Successful
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Scenario</p>
                <p className="text-zinc-200">{result.scenario.scenario_title}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Characters ({result.characters.length})</p>
                <div className="flex flex-wrap gap-2">
                  {result.characters.map((c) => (
                    <span key={c.id} className="px-2 py-1 bg-zinc-800 rounded text-sm text-zinc-300">
                      {c.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleStartSession}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              <Play className="w-4 h-4" />
              {loading ? "Creating..." : "Start Session"}
            </button>
            <button
              onClick={() => {
                setResult(null);
                setJsonText("");
              }}
              className="px-6 py-3 rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 transition-colors"
            >
              Import Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
