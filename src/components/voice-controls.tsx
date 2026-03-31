"use client";

import { useState } from "react";
import { Mic, MicOff, Send, Loader2 } from "lucide-react";
import type { ConnectionStatus } from "@/hooks/use-voice-session";

interface VoiceControlsProps {
  status: ConnectionStatus;
  onConnect: () => void;
  onDisconnect: () => void;
  onSendText: (text: string) => void;
  error?: string | null;
}

const statusConfig: Record<ConnectionStatus, { label: string; color: string }> = {
  idle: { label: "Disconnected", color: "bg-zinc-600" },
  connecting: { label: "Connecting...", color: "bg-yellow-500" },
  active: { label: "Connected", color: "bg-green-500" },
  reconnecting: { label: "Reconnecting...", color: "bg-yellow-500" },
  error: { label: "Error", color: "bg-red-500" },
};

export function VoiceControls({
  status,
  onConnect,
  onDisconnect,
  onSendText,
  error,
}: VoiceControlsProps) {
  const [textInput, setTextInput] = useState("");
  const isActive = status === "active";
  const isLoading = status === "connecting" || status === "reconnecting";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = textInput.trim();
    if (!trimmed || !isActive) return;
    onSendText(trimmed);
    setTextInput("");
  };

  const handleMicToggle = () => {
    if (isActive) {
      onDisconnect();
    } else if (status === "idle" || status === "error") {
      onConnect();
    }
  };

  const { label, color } = statusConfig[status];

  return (
    <div className="border-t border-zinc-800 bg-zinc-950 px-4 py-3">
      {/* Status bar */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${color}`} />
          <span className="text-xs text-zinc-500">{label}</span>
        </div>
        {error && (
          <span className="text-xs text-red-400 truncate max-w-[60%]">{error}</span>
        )}
      </div>

      {/* Input area */}
      <div className="flex items-center gap-3">
        {/* Mic button */}
        <button
          onClick={handleMicToggle}
          disabled={isLoading}
          className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            isActive
              ? "bg-red-600 hover:bg-red-500 text-white animate-pulse"
              : isLoading
                ? "bg-zinc-700 text-zinc-400 cursor-wait"
                : "bg-indigo-600 hover:bg-indigo-500 text-white"
          }`}
          title={isActive ? "Disconnect" : "Connect voice"}
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : isActive ? (
            <MicOff className="w-5 h-5" />
          ) : (
            <Mic className="w-5 h-5" />
          )}
        </button>

        {/* Text input */}
        <form onSubmit={handleSubmit} className="flex-1 flex gap-2">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder={isActive ? "Type a message..." : "Connect voice to chat"}
            disabled={!isActive}
            className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!isActive || !textInput.trim()}
            className="flex-shrink-0 w-10 h-10 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
