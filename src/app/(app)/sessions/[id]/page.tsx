"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useVoiceSession } from "@/hooks/use-voice-session";
import { SessionPanel } from "@/components/session-panel";
import { VoiceControls } from "@/components/voice-controls";
import { ArrowLeft, Square } from "lucide-react";
import type { Message, CastMember } from "@/hooks/use-voice-session";

export default function LiveSessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;
  const [initialMessage, setInitialMessage] = useState<Message | null>(null);
  const [loadedCharacterName, setLoadedCharacterName] = useState("");
  const [loadedCast, setLoadedCast] = useState<CastMember[]>([]);

  // Fetch session context on mount
  useEffect(() => {
    fetch(`/api/session/${sessionId}/context`)
      .then((res) => res.json())
      .then((data) => {
        if (data.characterName) setLoadedCharacterName(data.characterName);
        if (data.cast) setLoadedCast(data.cast);
        if (data.initialMessage) {
          setInitialMessage({
            id: `initial-${Date.now()}`,
            role: "assistant",
            text: data.initialMessage,
            speakerName: data.characterName,
            speakerId: data.characterId,
          });
        }
      })
      .catch(() => {});
  }, [sessionId]);

  const handleTurnPersisted = useCallback(() => {}, []);

  const {
    connect,
    disconnect,
    sendText,
    switchCharacter,
    status,
    messages,
    error,
    characterName,
    cast,
    currentSpeakerId,
  } = useVoiceSession({ sessionId, onTurnPersisted: handleTurnPersisted });

  const displayName = characterName || loadedCharacterName || "Session";
  const displayCast = cast.length > 0 ? cast : loadedCast;
  const isMultiCharacter = displayCast.length > 1;

  const allMessages = initialMessage && messages.length === 0
    ? [initialMessage]
    : initialMessage && messages[0]?.id !== initialMessage.id
      ? [initialMessage, ...messages]
      : messages;

  const handleEndSession = async () => {
    disconnect();
    try {
      await fetch(`/api/session/${sessionId}/end`, { method: "POST" });
    } catch {}
    router.push("/sessions");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { disconnect(); router.push("/sessions"); }}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-zinc-100">
                {isMultiCharacter ? "Multi-Character Session" : displayName}
              </h1>
            </div>
            {isMultiCharacter ? (
              <div className="flex items-center gap-1.5 mt-0.5">
                {displayCast.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => switchCharacter(c.id)}
                    className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
                      c.id === currentSpeakerId
                        ? "bg-indigo-600 text-white"
                        : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-500">{allMessages.length} messages</p>
            )}
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
        isMultiCharacter={isMultiCharacter}
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
