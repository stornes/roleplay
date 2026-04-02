"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Square, Loader2, FileText, ChevronDown, ChevronUp, Paperclip } from "lucide-react";

interface AutonomousTurn {
  turnNumber: number;
  speakerName: string;
  speakerId: string;
  text: string;
  timestamp: string;
}

interface AutonomousControlsProps {
  sessionId: string;
  isMultiCharacter: boolean;
  onTurn?: (turn: AutonomousTurn) => void;
  onComplete?: (totalTurns: number, reason: string) => void;
  onRunningChange?: (running: boolean) => void;
}

export function AutonomousControls({
  sessionId,
  isMultiCharacter,
  onTurn,
  onComplete,
  onRunningChange,
}: AutonomousControlsProps) {
  const [running, setRunning] = useState(false);
  const [turnCount, setTurnCount] = useState(0);
  const [maxTurns, setMaxTurns] = useState(20);
  const [delayMs, setDelayMs] = useState(3000);
  const [error, setError] = useState<string | null>(null);
  const [briefing, setBriefing] = useState("");
  const [showBriefing, setShowBriefing] = useState(true);
  const [briefingSaved, setBriefingSaved] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateRunning = useCallback((value: boolean) => {
    setRunning(value);
    onRunningChange?.(value);
  }, [onRunningChange]);

  const startListening = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource(`/api/session/${sessionId}/autonomous`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "status") {
          updateRunning(data.running);
          setTurnCount(data.turnCount || 0);
          return;
        }

        if (data.type === "turn") {
          setTurnCount(data.turn.turnNumber);
          onTurn?.(data.turn);
        }

        if (data.type === "complete") {
          updateRunning(false);
          onComplete?.(data.totalTurns, data.reason);
          es.close();
          eventSourceRef.current = null;
        }

        if (data.type === "error") {
          setError(data.message);
        }
      } catch {
        // Parse error
      }
    };

    es.onerror = () => {
      es.close();
      eventSourceRef.current = null;
      updateRunning(false);
    };
  }, [sessionId, onTurn, onComplete, updateRunning]);

  // Clean up EventSource on unmount
  useEffect(() => {
    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  // Load existing briefing from session on mount
  useEffect(() => {
    fetch(`/api/session/${sessionId}/briefing`)
      .then((res) => res.json())
      .then((data) => {
        if (data.briefing) {
          setBriefing(data.briefing);
          setBriefingSaved(true);
        }
      })
      .catch(() => {});
  }, [sessionId]);

  // Save briefing to the session's advanced_prompt before starting
  const saveBriefing = async () => {
    if (!briefing.trim()) return;

    try {
      await fetch(`/api/session/${sessionId}/briefing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ briefing: briefing.trim() }),
      });
      setBriefingSaved(true);
    } catch {
      setError("Failed to save briefing");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setBriefing((prev) => prev ? `${prev}\n\n${text}` : text);
      setBriefingSaved(false);
    };
    reader.readAsText(file);
  };

  const handleStart = async () => {
    setError(null);
    setTurnCount(0);

    // Save briefing first if present and not yet saved
    if (briefing.trim() && !briefingSaved) {
      await saveBriefing();
    }

    try {
      const res = await fetch(`/api/session/${sessionId}/autonomous`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", maxTurns, delayMs }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to start");
        return;
      }

      updateRunning(true);
      setShowBriefing(false);
      startListening();
    } catch {
      setError("Failed to start autonomous mode");
    }
  };

  const handleStop = async () => {
    try {
      await fetch(`/api/session/${sessionId}/autonomous`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop" }),
      });
      updateRunning(false);
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
    } catch {
      // Stop failed
    }
  };

  if (!isMultiCharacter) return null;

  return (
    <div className="border-t border-zinc-800 bg-zinc-900/80">
      {/* Briefing panel */}
      <div className="px-4 py-2">
        <button
          onClick={() => setShowBriefing(!showBriefing)}
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors w-full"
          disabled={running}
        >
          <FileText className="w-4 h-4" />
          Case Briefing
          {briefing.trim() && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-900/50 text-emerald-400">
              {briefingSaved ? "saved" : "draft"}
            </span>
          )}
          {showBriefing ? <ChevronDown className="w-3.5 h-3.5 ml-auto" /> : <ChevronUp className="w-3.5 h-3.5 ml-auto" />}
        </button>

        {showBriefing && !running && (
          <div className="mt-2 space-y-2">
            <textarea
              value={briefing}
              onChange={(e) => {
                setBriefing(e.target.value);
                setBriefingSaved(false);
              }}
              placeholder={"Paste your case data here. Example:\n\nCOMPANY: Acme Corp, $45M ARR, 35% YoY growth\nPRODUCT: Project management SaaS, no AI features yet\n\nCOMPETITOR 1: Monday.com - $600M ARR, launched AI assistant\nCOMPETITOR 2: Asana - $550M ARR, deep integrations\n\nKEY QUESTIONS:\n1. Where are we most vulnerable?\n2. Should we invest in AI or double down on mid-market?"}
              className="w-full h-40 bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-sm text-zinc-200 font-mono resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-zinc-600"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 transition-colors text-xs"
              >
                <Paperclip className="w-3.5 h-3.5" />
                Attach file
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.csv,.json"
                onChange={handleFileUpload}
                className="hidden"
              />
              {briefing.trim() && !briefingSaved && (
                <button
                  onClick={saveBriefing}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 transition-colors text-xs"
                >
                  Save briefing
                </button>
              )}
              <span className="text-xs text-zinc-600 ml-auto">
                Paste company data, competitor info, financial reports, or any text the agents should analyze
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Controls bar */}
      <div className="flex items-center gap-3 px-4 py-2 border-t border-zinc-800/50">
        {!running ? (
          <>
            <button
              onClick={handleStart}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors text-sm font-medium"
            >
              <Play className="w-4 h-4" />
              Run Autonomous
            </button>
            <label className="flex items-center gap-1.5 text-xs text-zinc-500">
              Turns:
              <input
                type="number"
                min={1}
                max={100}
                value={maxTurns}
                onChange={(e) => setMaxTurns(Math.min(100, Math.max(1, parseInt(e.target.value) || 20)))}
                className="w-14 bg-zinc-800 border border-zinc-700 rounded px-1.5 py-1 text-zinc-300 text-xs"
              />
            </label>
            <label className="flex items-center gap-1.5 text-xs text-zinc-500">
              Delay:
              <select
                value={delayMs}
                onChange={(e) => setDelayMs(parseInt(e.target.value))}
                className="bg-zinc-800 border border-zinc-700 rounded px-1.5 py-1 text-zinc-300 text-xs"
              >
                <option value={500}>0.5s</option>
                <option value={1000}>1s</option>
                <option value={2000}>2s</option>
                <option value={3000}>3s</option>
                <option value={5000}>5s</option>
                <option value={10000}>10s</option>
              </select>
            </label>
          </>
        ) : (
          <>
            <button
              onClick={handleStop}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors text-sm font-medium"
            >
              <Square className="w-4 h-4" />
              Stop
            </button>
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              Turn {turnCount}/{maxTurns}
            </div>
          </>
        )}
        {error && (
          <span className="text-xs text-red-400 ml-2">{error}</span>
        )}
      </div>
    </div>
  );
}
