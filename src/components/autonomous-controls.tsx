"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Square, Loader2 } from "lucide-react";

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
}

export function AutonomousControls({
  sessionId,
  isMultiCharacter,
  onTurn,
  onComplete,
}: AutonomousControlsProps) {
  const [running, setRunning] = useState(false);
  const [turnCount, setTurnCount] = useState(0);
  const [maxTurns, setMaxTurns] = useState(20);
  const [delayMs, setDelayMs] = useState(2000);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

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
          setRunning(data.running);
          setTurnCount(data.turnCount || 0);
          return;
        }

        if (data.type === "turn") {
          setTurnCount(data.turn.turnNumber);
          onTurn?.(data.turn);
        }

        if (data.type === "complete") {
          setRunning(false);
          onComplete?.(data.totalTurns, data.reason);
          es.close();
          eventSourceRef.current = null;
        }

        if (data.type === "error") {
          setError(data.message);
        }
      } catch {}
    };

    es.onerror = () => {
      es.close();
      eventSourceRef.current = null;
      setRunning(false);
    };
  }, [sessionId, onTurn, onComplete]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  const handleStart = async () => {
    setError(null);
    setTurnCount(0);

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

      setRunning(true);
      startListening();
    } catch (err) {
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
      setRunning(false);
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
    } catch {}
  };

  if (!isMultiCharacter) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-2 border-t border-zinc-800 bg-zinc-900/50">
      {!running ? (
        <>
          <button
            onClick={handleStart}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 transition-colors text-sm"
          >
            <Play className="w-3.5 h-3.5" />
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
              className="w-14 bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5 text-zinc-300 text-xs"
            />
          </label>
          <label className="flex items-center gap-1.5 text-xs text-zinc-500">
            Delay:
            <select
              value={delayMs}
              onChange={(e) => setDelayMs(parseInt(e.target.value))}
              className="bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5 text-zinc-300 text-xs"
            >
              <option value={500}>0.5s</option>
              <option value={1000}>1s</option>
              <option value={2000}>2s</option>
              <option value={5000}>5s</option>
              <option value={10000}>10s</option>
            </select>
          </label>
        </>
      ) : (
        <>
          <button
            onClick={handleStop}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-colors text-sm"
          >
            <Square className="w-3.5 h-3.5" />
            Stop
          </button>
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Turn {turnCount}/{maxTurns}
          </div>
        </>
      )}
      {error && (
        <span className="text-xs text-red-400">{error}</span>
      )}
    </div>
  );
}
