"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useVoiceSession } from "@/hooks/use-voice-session";
import { SessionPanel } from "@/components/session-panel";
import { VoiceControls } from "@/components/voice-controls";
import { ArrowLeft, Square } from "lucide-react";
import type { Message } from "@/hooks/use-voice-session";

export default function LiveSessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;
  const [initialMessage, setInitialMessage] = useState<Message | null>(null);
  const [loadedCharacterName, setLoadedCharacterName] = useState("");

  // Fetch session context on mount to get initial message and character name
  useEffect(() => {
    fetch(`/api/session/${sessionId}/context`)
      .then((res) => res.json())
      .then((data) => {
        if (data.characterName) {
          setLoadedCharacterName(data.characterName);
        }
        if (data.initialMessage) {
          setInitialMessage({
            id: `initial-${Date.now()}`,
            role: "assistant",
            text: data.initialMessage,
          });
        }
      })
      .catch(() => {
        // Non-fatal
      });
  }, [sessionId]);

  const handleTurnPersisted = useCallback((_speaker: string, _text: string) => {
    // Could trigger STM compression check here in the future
  }, []);

  const {
    connect,
    disconnect,
    sendText,
    status,
    messages,
    error,
    characterName,
  } = useVoiceSession({ sessionId, onTurnPersisted: handleTurnPersisted });

  // Combine initial message with session messages
  const displayName = characterName || loadedCharacterName || "Session";
  const allMessages = initialMessage && messages.length === 0
    ? [initialMessage]
    : initialMessage && messages[0]?.id !== initialMessage.id
      ? [initialMessage, ...messages]
      : messages;

  const handleEndSession = async () => {
    disconnect();
    try {
      await fetch(`/api/session/${sessionId}/end`, { method: "POST" });
    } catch {
      // Navigate anyway
    }
    router.push("/sessions");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              disconnect();
              router.push("/sessions");
            }}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-zinc-100">
              {displayName}
            </h1>
            <p className="text-xs text-zinc-500">
              {allMessages.length} messages
            </p>
          </div>
        </div>
        <button
          onClick={handleEndSession}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-colors text-sm"
        >
          <Square className="w-3.5 h-3.5" />
          End Session
        </button>
      </div>

      {/* Transcript */}
      <SessionPanel
        messages={allMessages}
        characterName={displayName}
      />

      {/* Voice controls + text input */}
      <VoiceControls
        status={status}
        onConnect={connect}
        onDisconnect={disconnect}
        onSendText={sendText}
        error={error}
      />
    </div>
  );
}
