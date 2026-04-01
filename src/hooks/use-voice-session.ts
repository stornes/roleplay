"use client";

import { useCallback, useRef, useState } from "react";

export type ConnectionStatus = "idle" | "connecting" | "active" | "reconnecting" | "error";

export interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  speakerName?: string;
  speakerId?: string;
  interrupted?: boolean;
}

export interface CastMember {
  id: string;
  name: string;
  voiceId: string;
}

const WS_EVENTS = {
  SESSION_UPDATED: "session.updated",
  SPEECH_STARTED: "input_audio_buffer.speech_started",
  RESPONSE_CREATED: "response.created",
  AUDIO_DELTA: "response.output_audio.delta",
  TRANSCRIPT_DELTA: "response.output_audio_transcript.delta",
  RESPONSE_DONE: "response.done",
  TRANSCRIPTION_DONE: "conversation.item.input_audio_transcription.completed",
  ERROR: "error",
} as const;

function audioToBase64(int16Array: Int16Array): string {
  const bytes = new Uint8Array(
    int16Array.buffer,
    int16Array.byteOffset,
    int16Array.byteLength
  );
  const CHUNK = 0x2000;
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += CHUNK) {
    parts.push(String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK))));
  }
  return btoa(parts.join(""));
}

const MAX_BUFFER_SAMPLES = 240_000;

interface UseVoiceSessionOpts {
  sessionId: string;
  onTurnPersisted?: (speaker: string, text: string) => void;
}

export function useVoiceSession({ sessionId, onTurnPersisted }: UseVoiceSessionOpts) {
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [characterName, setCharacterName] = useState<string>("");
  const [cast, setCast] = useState<CastMember[]>([]);
  const castRef = useRef<CastMember[]>([]);
  const [currentSpeakerId, setCurrentSpeakerId] = useState<string>("");
  const currentSpeakerIdRef = useRef<string>("");
  const currentSpeakerNameRef = useRef<string>("");
  const [autoChain, setAutoChain] = useState(true);
  const autoChainRef = useRef(true);
  const chainCooldownRef = useRef(false);

  const statusRef = useRef<ConnectionStatus>("idle");
  const updateStatus = useCallback((s: ConnectionStatus) => {
    statusRef.current = s;
    setStatus(s);
  }, []);

  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const nextPlayTimeRef = useRef<number>(0);
  const queuedSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const micBufferRef = useRef<Int16Array[]>([]);
  const micBufferSamplesRef = useRef<number>(0);
  const isSessionReadyRef = useRef<boolean>(false);
  const currentResponseIdRef = useRef<string | null>(null);
  const intentionalDisconnectRef = useRef<boolean>(false);
  const tokenRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;

  const interruptPlayback = useCallback(() => {
    for (const src of queuedSourcesRef.current) {
      try { src.stop(); } catch { /* already stopped */ }
    }
    queuedSourcesRef.current = [];
    nextPlayTimeRef.current = 0;
  }, []);

  const playPcmChunk = useCallback((base64: string) => {
    const audioCtx = audioCtxRef.current;
    if (!audioCtx) return;

    const raw = atob(base64);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768;

    const buf = audioCtx.createBuffer(1, float32.length, 24000);
    buf.getChannelData(0).set(float32);
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    src.connect(audioCtx.destination);

    const now = audioCtx.currentTime;
    const startAt = Math.max(now, nextPlayTimeRef.current);
    src.start(startAt);
    nextPlayTimeRef.current = startAt + buf.duration;
    queuedSourcesRef.current.push(src);
    src.onended = () => {
      const idx = queuedSourcesRef.current.indexOf(src);
      if (idx !== -1) queuedSourcesRef.current.splice(idx, 1);
    };
  }, []);

  const sendAudio = useCallback((int16Data: Int16Array) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "input_audio_buffer.append",
          audio: audioToBase64(int16Data),
        })
      );
    }
  }, []);

  const fetchToken = useCallback(async (): Promise<{ value: string; expires_at: number }> => {
    const res = await fetch("/api/token", { method: "POST" });
    if (!res.ok) throw new Error(`Token fetch failed: ${await res.text()}`);
    return res.json();
  }, []);

  const fetchSessionContext = useCallback(async (charId?: string): Promise<{
    instructions: string;
    voiceId: string;
    characterId: string;
    characterName: string;
    initialMessage: string | null;
    cast: CastMember[];
    isMultiCharacter: boolean;
  }> => {
    const url = charId
      ? `/api/session/${sessionIdRef.current}/context?characterId=${charId}`
      : `/api/session/${sessionIdRef.current}/context`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Context fetch failed: ${await res.text()}`);
    return res.json();
  }, []);

  const persistTurnBackground = useCallback((speaker: string, text: string) => {
    // Fire-and-forget turn persistence
    fetch(`/api/session/${sessionIdRef.current}/turns`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ speaker, text }),
    }).then(() => {
      onTurnPersisted?.(speaker, text);
    }).catch(() => {
      // Non-fatal: turn will be in client transcript even if persist fails
    });
  }, [onTurnPersisted]);

  const scheduleTokenRefresh = useCallback((expiresAt: number) => {
    if (tokenRefreshTimerRef.current) clearTimeout(tokenRefreshTimerRef.current);
    const msUntilExpiry = expiresAt * 1000 - Date.now();
    const refreshIn = Math.max(0, msUntilExpiry - 5000);
    tokenRefreshTimerRef.current = setTimeout(async () => {
      try {
        const { expires_at } = await fetchToken();
        scheduleTokenRefresh(expires_at);
      } catch {
        // Session will expire, user will see disconnect
      }
    }, refreshIn);
  }, [fetchToken]);

  const handleWsMessage = useCallback((data: string) => {
    const event = JSON.parse(data);

    switch (event.type) {
      case WS_EVENTS.SESSION_UPDATED:
        if (!isSessionReadyRef.current) {
          isSessionReadyRef.current = true;
          for (const chunk of micBufferRef.current) {
            sendAudio(chunk);
          }
          micBufferRef.current = [];
          micBufferSamplesRef.current = 0;
        }
        break;

      case WS_EVENTS.SPEECH_STARTED:
        interruptPlayback();
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: "response.cancel" }));
        }
        if (currentResponseIdRef.current) {
          const id = currentResponseIdRef.current;
          setMessages((prev) =>
            prev.map((m) => (m.id === id ? { ...m, interrupted: true } : m))
          );
          currentResponseIdRef.current = null;
        }
        break;

      case WS_EVENTS.RESPONSE_CREATED: {
        currentResponseIdRef.current = event.response.id;
        const speakerChar = castRef.current.find((c) => c.id === currentSpeakerIdRef.current);
        setMessages((prev) => [
          ...prev,
          {
            id: event.response.id,
            role: "assistant",
            text: "",
            speakerName: speakerChar?.name,
            speakerId: currentSpeakerIdRef.current,
          },
        ]);
        break;
      }

      case WS_EVENTS.AUDIO_DELTA:
        playPcmChunk(event.delta);
        break;

      case WS_EVENTS.TRANSCRIPT_DELTA:
        if (currentResponseIdRef.current) {
          const id = currentResponseIdRef.current;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === id ? { ...m, text: m.text + event.delta } : m
            )
          );
        }
        break;

      case WS_EVENTS.RESPONSE_DONE: {
        // Persist assistant turn
        const doneId = currentResponseIdRef.current;
        let responseText = "";
        if (doneId) {
          setMessages((prev) => {
            const msg = prev.find((m) => m.id === doneId);
            if (msg && msg.text) {
              responseText = msg.text;
              persistTurnBackground("assistant", msg.text);
            }
            return prev;
          });
        }
        currentResponseIdRef.current = null;

        // Auto-chain: let another character react if multiple are present
        if (
          autoChainRef.current &&
          !chainCooldownRef.current &&
          castRef.current.length > 1 &&
          responseText.length > 0
        ) {
          // Check if the response mentions another character by name
          const others = castRef.current.filter(
            (c) => c.id !== currentSpeakerIdRef.current
          );
          const mentionsOther = others.some((c) =>
            responseText.toLowerCase().includes(c.name.toLowerCase())
          );

          // Chain if another character is mentioned, or 30% random chance
          const shouldChain = mentionsOther || Math.random() < 0.3;

          if (shouldChain) {
            chainCooldownRef.current = true;
            // Pick the mentioned character, or a random other
            const nextChar = mentionsOther
              ? others.find((c) =>
                  responseText.toLowerCase().includes(c.name.toLowerCase())
                )!
              : others[Math.floor(Math.random() * others.length)];

            // Delay to feel natural (1-3 seconds)
            const delay = 1000 + Math.random() * 2000;
            setTimeout(async () => {
              await switchCharacter(nextChar.id);
              await new Promise((r) => setTimeout(r, 300));
              const ws = wsRef.current;
              if (ws?.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: "response.create" }));
              }
              // Reset cooldown after the chain response completes
              setTimeout(() => {
                chainCooldownRef.current = false;
              }, 5000);
            }, delay);
          }
        }
        break;
      }

      case WS_EVENTS.TRANSCRIPTION_DONE: {
        const transcript = event.transcript;
        setMessages((prev) => [
          ...prev,
          { id: `user-${Date.now()}`, role: "user", text: transcript },
        ]);
        // Persist user turn
        if (transcript) {
          persistTurnBackground("user", transcript);
        }
        break;
      }

      case WS_EVENTS.ERROR:
        setError(event.message ?? "xAI error");
        break;
    }
  }, [interruptPlayback, playPcmChunk, sendAudio, persistTurnBackground]);

  const connect = useCallback(async () => {
    if (statusRef.current === "active" || statusRef.current === "connecting") return;
    setError(null);
    intentionalDisconnectRef.current = false;
    updateStatus("connecting");

    const audioCtx = new AudioContext({ sampleRate: 24000 });
    audioCtxRef.current = audioCtx;
    if (audioCtx.state === "suspended") await audioCtx.resume();

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 24000,
        },
      });
    } catch (err: unknown) {
      const domErr = err as DOMException;
      if (domErr.name === "NotAllowedError") {
        setError("Microphone access denied");
      } else if (domErr.name === "NotFoundError") {
        setError("No microphone found");
      } else {
        setError("Microphone error");
      }
      updateStatus("error");
      return;
    }
    micStreamRef.current = stream;

    await audioCtx.audioWorklet.addModule("/pcm-processor-worklet.js");
    const source = audioCtx.createMediaStreamSource(stream);
    const workletNode = new AudioWorkletNode(audioCtx, "pcm-processor");
    workletNodeRef.current = workletNode;
    source.connect(workletNode);

    stream.getAudioTracks()[0].onended = () => {
      if (!intentionalDisconnectRef.current) {
        setError("Microphone disconnected");
        disconnect();
      }
    };

    isSessionReadyRef.current = false;
    micBufferRef.current = [];
    micBufferSamplesRef.current = 0;

    workletNode.port.onmessage = (evt) => {
      const int16Data = evt.data as Int16Array;
      if (isSessionReadyRef.current) {
        sendAudio(int16Data);
      } else {
        if (micBufferSamplesRef.current + int16Data.length <= MAX_BUFFER_SAMPLES) {
          micBufferRef.current.push(int16Data);
          micBufferSamplesRef.current += int16Data.length;
        }
      }
    };

    // Fetch context and token in parallel
    let tokenValue: string;
    let tokenExpiresAt: number;
    let contextData: Awaited<ReturnType<typeof fetchSessionContext>>;
    try {
      const [tokenResult, ctx] = await Promise.all([
        fetchToken(),
        fetchSessionContext(),
      ]);
      tokenValue = tokenResult.value;
      tokenExpiresAt = tokenResult.expires_at;
      contextData = ctx;
      setCharacterName(ctx.characterName);
      const castData = ctx.cast || [];
      setCast(castData);
      castRef.current = castData;
      setCurrentSpeakerId(ctx.characterId || "");
      currentSpeakerIdRef.current = ctx.characterId || "";
    } catch {
      setError("Failed to get session token or context");
      updateStatus("error");
      return;
    }

    // Initial message is handled by the session page on mount, not here

    const ws = new WebSocket("wss://api.x.ai/v1/realtime", [
      `xai-client-secret.${tokenValue}`,
    ]);
    wsRef.current = ws;

    const connectTimeout = setTimeout(() => {
      if (ws.readyState !== WebSocket.OPEN) {
        ws.close();
        setError("Connection timeout");
        updateStatus("error");
      }
    }, 10_000);

    ws.onopen = () => {
      clearTimeout(connectTimeout);
      updateStatus("active");
      ws.send(
        JSON.stringify({
          type: "session.update",
          session: {
            voice: contextData.voiceId,
            instructions: contextData.instructions,
            turn_detection: { type: "server_vad" },
            input_audio_transcription: { model: "grok-2-audio" },
            audio: {
              input: { format: { type: "audio/pcm", rate: 24000 } },
              output: { format: { type: "audio/pcm", rate: 24000 } },
            },
          },
        })
      );
      scheduleTokenRefresh(tokenExpiresAt);
    };

    ws.onmessage = ({ data }) => handleWsMessage(data);

    ws.onerror = () => {
      if (!intentionalDisconnectRef.current) {
        setError("WebSocket error");
        updateStatus("error");
      }
    };

    ws.onclose = () => {
      clearTimeout(connectTimeout);
      if (!intentionalDisconnectRef.current) {
        // Auto-reconnect on TTL expiry
        updateStatus("reconnecting");
        setTimeout(() => {
          if (!intentionalDisconnectRef.current) {
            reconnect();
          }
        }, 1000);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchSessionContext, fetchToken, handleWsMessage, scheduleTokenRefresh, sendAudio, updateStatus]);

  const reconnect = useCallback(async () => {
    // Clean up old connection without clearing messages
    wsRef.current?.close();
    wsRef.current = null;

    updateStatus("reconnecting");

    try {
      const [{ value, expires_at }, contextData] = await Promise.all([
        fetchToken(),
        fetchSessionContext(),
      ]);

      const ws = new WebSocket("wss://api.x.ai/v1/realtime", [
        `xai-client-secret.${value}`,
      ]);
      wsRef.current = ws;

      ws.onopen = () => {
        updateStatus("active");
        isSessionReadyRef.current = false;
        ws.send(
          JSON.stringify({
            type: "session.update",
            session: {
              voice: contextData.voiceId,
              instructions: contextData.instructions,
              turn_detection: { type: "server_vad" },
              input_audio_transcription: { model: "grok-2-audio" },
              audio: {
                input: { format: { type: "audio/pcm", rate: 24000 } },
                output: { format: { type: "audio/pcm", rate: 24000 } },
              },
            },
          })
        );
        scheduleTokenRefresh(expires_at);
      };

      ws.onmessage = ({ data }) => handleWsMessage(data);
      ws.onerror = () => updateStatus("error");
      ws.onclose = () => {
        if (!intentionalDisconnectRef.current) {
          updateStatus("reconnecting");
          setTimeout(() => reconnect(), 1000);
        }
      };
    } catch {
      setError("Failed to reconnect");
      updateStatus("error");
    }
  }, [fetchSessionContext, fetchToken, handleWsMessage, scheduleTokenRefresh, updateStatus]);

  const disconnect = useCallback(() => {
    intentionalDisconnectRef.current = true;
    if (tokenRefreshTimerRef.current) clearTimeout(tokenRefreshTimerRef.current);
    interruptPlayback();
    wsRef.current?.close();
    wsRef.current = null;
    workletNodeRef.current?.disconnect();
    workletNodeRef.current = null;
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    isSessionReadyRef.current = false;
    currentResponseIdRef.current = null;
    micBufferRef.current = [];
    micBufferSamplesRef.current = 0;
    updateStatus("idle");
  }, [interruptPlayback, updateStatus]);

  /**
   * Switch the active character mid-session (Phase 3 multi-character).
   * Sends a session.update with the new character's voice and instructions.
   */
  const switchCharacter = useCallback(async (charId: string) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    // Update speaker immediately from cast data (before async fetch)
    const castMember = castRef.current.find((c) => c.id === charId);
    setCurrentSpeakerId(charId);
    currentSpeakerIdRef.current = charId;
    if (castMember) setCharacterName(castMember.name);

    try {
      const ctx = await fetchSessionContext(charId);

      ws.send(
        JSON.stringify({
          type: "session.update",
          session: {
            voice: ctx.voiceId,
            instructions: ctx.instructions,
          },
        })
      );
    } catch {
      // Non-fatal, keep current character
    }
  }, [fetchSessionContext]);

  const sendText = useCallback(async (text: string) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    setMessages((prev) => [
      ...prev,
      { id: `user-text-${Date.now()}`, role: "user", text },
    ]);
    persistTurnBackground("user", text);

    // Phase 3: Turn routing. Detect if user addressed a specific character.
    // MUST await the switch before sending response.create so the right
    // character's voice and personality are active.
    if (cast.length > 1) {
      const lower = text.toLowerCase().trim();
      for (const member of cast) {
        const name = member.name.toLowerCase();
        if (
          lower === name ||
          lower.startsWith(`${name},`) ||
          lower.startsWith(`${name} `) ||
          lower.endsWith(` ${name}`) ||
          lower.endsWith(` ${name}?`) ||
          lower.endsWith(` ${name}!`) ||
          lower.endsWith(` ${name}.`) ||
          lower.includes(`talk to ${name}`) ||
          lower.includes(`hey ${name}`) ||
          lower.includes(`@${name}`) ||
          lower.includes(` ${name},`)
        ) {
          if (member.id !== currentSpeakerIdRef.current) {
            await switchCharacter(member.id);
            // Wait for session.update to be processed by xAI server
            await new Promise<void>((resolve) => {
              const checkReady = () => {
                if (isSessionReadyRef.current) {
                  resolve();
                } else {
                  setTimeout(checkReady, 100);
                }
              };
              isSessionReadyRef.current = false;
              setTimeout(checkReady, 200);
              // Timeout fallback
              setTimeout(resolve, 2000);
            });
          }
          break;
        }
      }
    }

    // Now send the message and request response with the correct character active
    const currentWs = wsRef.current;
    if (!currentWs || currentWs.readyState !== WebSocket.OPEN) return;

    currentWs.send(
      JSON.stringify({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text }],
        },
      })
    );
    currentWs.send(JSON.stringify({ type: "response.create" }));
  }, [persistTurnBackground, cast, switchCharacter]);

  const toggleAutoChain = useCallback(() => {
    setAutoChain((prev) => {
      const next = !prev;
      autoChainRef.current = next;
      return next;
    });
  }, []);

  return {
    connect,
    disconnect,
    reconnect,
    sendText,
    switchCharacter,
    toggleAutoChain,
    status,
    messages,
    error,
    characterName,
    cast,
    currentSpeakerId,
    autoChain,
  };
}
