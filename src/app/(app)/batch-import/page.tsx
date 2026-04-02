"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileJson, Play, CheckCircle, AlertCircle, Copy } from "lucide-react";

const EXAMPLE_PAYLOAD = {
  version: 1,
  characters: [
    {
      name: "Marcus Chen, Chief Strategy Officer",
      chat_name: "Marcus",
      bio: "Former McKinsey partner. 20 years of competitive strategy across tech and SaaS.",
      personality: "You are Marcus Chen, Chief Strategy Officer. You think in frameworks: Porter's Five Forces, SWOT, value chain analysis. You challenge assumptions relentlessly. You say 'Let me push back on that' before offering contrarian views. You are direct and have zero patience for vague claims without evidence. Always reference specific data from the case briefing.",
      voice_id: "rex",
      tags: ["strategy", "analysis"],
    },
    {
      name: "Dr. Priya Sharma, Market Intelligence Lead",
      chat_name: "Priya",
      bio: "PhD Economics, MIT. Leads market research and competitive intelligence.",
      personality: "You are Dr. Priya Sharma, Market Intelligence Lead. You are data-driven. You cite specific numbers, market share percentages, and growth rates from the case briefing. You qualify statements ('the data suggests' not 'it is'). You get excited when spotting trends others miss. Always ground your analysis in the specific company and competitor data provided.",
      voice_id: "eve",
      tags: ["market-research", "data"],
    },
    {
      name: "Jordan Blake, Product Strategist",
      chat_name: "Jordan",
      bio: "Ex-Google PM. Specializes in product-market fit and feature gap analysis.",
      personality: "You are Jordan Blake, Product Strategist. You think in user problems, not features. You reframe analysis through 'what job is the user hiring this product to do?' You have strong opinions on build vs. buy. Reference the specific products and features from the case briefing when making your points.",
      voice_id: "sal",
      tags: ["product", "strategy"],
    },
  ],
  scenario: {
    title: "Competitive Landscape Analysis",
    description: "The strategy team has convened to analyze the competitive landscape. Each analyst brings domain expertise to assess market positioning, product gaps, and strategic threats. The goal: identify the top 3 competitive threats and recommend priorities for the next 4 quarters.",
    setting: "Executive war room with competitor matrix on display",
    time_period: "Present day, Q2 planning",
  },
  briefing: "COMPANY: Acme Corp, a B2B SaaS platform for project management.\nREVENUE: $45M ARR, growing 35% YoY.\nCUSTOMERS: 2,000 mid-market companies, 85% retention rate.\nPRODUCT: Task management, time tracking, resource planning. No AI features yet.\n\nCOMPETITOR 1: Monday.com - $600M ARR, strong enterprise push, just launched AI assistant.\nCOMPETITOR 2: Asana - $550M ARR, deep integrations ecosystem, free tier driving growth.\nCOMPETITOR 3: ClickUp - $200M ARR, aggressive pricing, all-in-one positioning.\n\nKEY QUESTIONS:\n1. Where is Acme most vulnerable?\n2. Should Acme invest in AI features or double down on mid-market?\n3. Which competitor is the biggest threat in the next 12 months?",
  execution: {
    max_turns: 20,
    delay_ms: 3000,
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
    briefing: string | null;
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
          advancedPrompt: result.briefing || undefined,
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
              {result.briefing && (
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Case Briefing</p>
                  <pre className="text-xs text-zinc-400 bg-zinc-900 rounded p-3 whitespace-pre-wrap max-h-40 overflow-y-auto">
                    {result.briefing}
                  </pre>
                </div>
              )}
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
