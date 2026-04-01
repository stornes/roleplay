"use client";

import { useEffect, useRef, useCallback } from "react";

export interface SessionEvent {
  type: "chain_trigger" | "speaker_change" | "connected";
  targetId?: string;
  targetName?: string;
  delay?: number;
}

/**
 * Subscribe to server-sent events for a session.
 * Receives chain triggers and speaker changes even when the tab is backgrounded.
 */
export function useSessionEvents(
  sessionId: string,
  onEvent: (event: SessionEvent) => void
) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    const es = new EventSource(`/api/session/${sessionId}/events`);
    eventSourceRef.current = es;

    es.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data) as SessionEvent;
        onEventRef.current(data);
      } catch {
        // Ignore malformed events
      }
    };

    es.onerror = () => {
      // EventSource auto-reconnects
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [sessionId]);

  const close = useCallback(() => {
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
  }, []);

  return { close };
}
