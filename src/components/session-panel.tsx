"use client";

import { useEffect, useRef } from "react";
import type { Message } from "@/hooks/use-voice-session";

interface SessionPanelProps {
  messages: Message[];
  characterName: string;
  userName?: string;
  isMultiCharacter?: boolean;
}

/**
 * Parse "[CharName]: text" prefix from multi-character responses.
 * Returns { name, text } if found, otherwise null.
 */
function parseCharacterPrefix(text: string): { name: string; text: string } | null {
  // Match patterns: "Greg: ...", "[Greg]: ...", "**Greg:** ...", "Greg. ..."
  const match = text.match(/^(?:\[?(\w[\w\s]*?)\]?:\s*|(?:\*\*(\w[\w\s]*?)\*\*:\s*)|(\w[\w\s]*?)\.\s\s*)(.[\s\S]+)/);
  if (match) {
    const name = (match[1] || match[2] || match[3])?.trim();
    const rest = (match[4])?.trim();
    if (name && rest) return { name, text: rest };
  }
  return null;
}

export function SessionPanel({ messages, characterName, userName = "You", isMultiCharacter }: SessionPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-600">
        <p>Start speaking or type a message to begin the roleplay...</p>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
      {messages.map((msg) => {
        // For assistant messages in multi-character mode, parse the character prefix
        let displayName = msg.role === "user" ? userName : (msg.speakerName || characterName);
        let displayText = msg.text;

        if (msg.role === "assistant" && msg.text) {
          const parsed = parseCharacterPrefix(msg.text);
          if (parsed) {
            displayName = parsed.name;
            displayText = parsed.text;
          }
        }

        return (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-indigo-600 text-white"
                  : "bg-zinc-800 text-zinc-100"
              } ${msg.interrupted ? "opacity-60" : ""}`}
            >
              <div className="text-xs font-medium mb-1 opacity-70">
                {displayName}
              </div>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">
                {displayText || (
                  <span className="inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-pulse" />
                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-pulse delay-75" />
                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-pulse delay-150" />
                  </span>
                )}
              </p>
              {msg.interrupted && (
                <div className="text-xs mt-1 opacity-50 italic">interrupted</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
