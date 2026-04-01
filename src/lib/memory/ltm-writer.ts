/**
 * Long-Term Memory Writer
 *
 * Three write triggers:
 * 1. Auto (session end): Summarize transcript into 3-5 memory entries
 * 2. Periodic (every 10 turns): Extract key facts from recent turns
 * 3. Manual (user pin): Immediately embed and store a flagged turn
 */

import { createClient } from "@/lib/supabase/server";
import { generateEmbedding } from "./embeddings";

/**
 * Write a single memory entry with embedding.
 */
async function writeMemory(opts: {
  userId: string;
  sessionId: string;
  characterIds: string[];
  content: string;
  source: "auto" | "manual";
  importanceScore?: number;
  tags?: string[];
}): Promise<void> {
  const supabase = await createClient();
  const embedding = await generateEmbedding(opts.content);

  const { error } = await supabase.from("memory_ltm").insert({
    user_id: opts.userId,
    session_id: opts.sessionId,
    character_ids_involved: opts.characterIds,
    content: opts.content,
    embedding,
    source: opts.source,
    importance_score: opts.importanceScore ?? 0.5,
    tags: opts.tags ?? [],
  });

  if (error) {
    console.error("Failed to write memory:", error.message);
  }
}

/**
 * Auto-write: Summarize a session's transcript into memory entries.
 * Called on session end.
 */
export async function writeSessionMemories(opts: {
  sessionId: string;
  userId: string;
  characterIds: string[];
}): Promise<void> {
  const supabase = await createClient();
  const apiKey = process.env.XAI_API_KEY;

  if (!apiKey) {
    console.error("XAI_API_KEY not set, skipping memory extraction");
    return;
  }

  // Fetch all turns for this session
  const { data: turns } = await supabase
    .from("turns")
    .select("speaker, text")
    .eq("session_id", opts.sessionId)
    .order("created_at", { ascending: true });

  if (!turns || turns.length < 3) return; // Not enough content to summarize

  const transcript = turns.map((t) => `${t.speaker}: ${t.text}`).join("\n");

  // Ask Grok to extract memorable facts
  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "grok-3",
      messages: [
        {
          role: "user",
          content: `Extract 3-5 distinct memorable facts from this roleplay conversation. Each fact should be a single sentence that captures a key decision, relationship development, plot point, or established world detail. Return ONLY a JSON array of strings, nothing else.

Transcript:
${transcript.slice(0, 6000)}`,
        },
      ],
      max_tokens: 500,
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    console.error("Memory extraction failed:", await res.text());
    return;
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || "";

  // Parse the JSON array of memory strings
  let memories: string[] = [];
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      memories = parsed.filter((m: unknown) => typeof m === "string" && m.length > 0);
    }
  } catch {
    // If JSON parse fails, try line-by-line
    memories = content
      .split("\n")
      .map((line: string) => line.replace(/^[-*\d.]\s*/, "").trim())
      .filter((line: string) => line.length > 10);
  }

  // Write each memory with embedding
  for (const memory of memories.slice(0, 5)) {
    await writeMemory({
      userId: opts.userId,
      sessionId: opts.sessionId,
      characterIds: opts.characterIds,
      content: memory,
      source: "auto",
      importanceScore: 0.6,
    });
  }
}

/**
 * Periodic write: Extract key facts from recent turns.
 * Called every 10 turns during a session.
 */
export async function writePeriodicMemories(opts: {
  sessionId: string;
  userId: string;
  characterIds: string[];
}): Promise<void> {
  const supabase = await createClient();
  const apiKey = process.env.XAI_API_KEY;

  if (!apiKey) return;

  // Get the last 10 turns
  const { data: turns } = await supabase
    .from("turns")
    .select("speaker, text")
    .eq("session_id", opts.sessionId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (!turns || turns.length < 5) return;

  const recentText = turns
    .reverse()
    .map((t) => `${t.speaker}: ${t.text}`)
    .join("\n");

  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "grok-3",
      messages: [
        {
          role: "user",
          content: `Extract 1-2 key facts worth remembering from this recent roleplay conversation segment. Each fact should be a single sentence. If nothing notable happened, return an empty array. Return ONLY a JSON array of strings.

Recent conversation:
${recentText}`,
        },
      ],
      max_tokens: 200,
      temperature: 0.3,
    }),
  });

  if (!res.ok) return;

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || "";

  try {
    const memories = JSON.parse(content);
    if (Array.isArray(memories)) {
      for (const memory of memories.slice(0, 2)) {
        if (typeof memory === "string" && memory.length > 10) {
          await writeMemory({
            userId: opts.userId,
            sessionId: opts.sessionId,
            characterIds: opts.characterIds,
            content: memory,
            source: "auto",
            importanceScore: 0.4,
          });
        }
      }
    }
  } catch {
    // Non-fatal
  }
}

/**
 * Manual pin: User explicitly flags a turn as memorable.
 */
export async function pinMemory(opts: {
  userId: string;
  sessionId: string;
  characterIds: string[];
  content: string;
}): Promise<void> {
  await writeMemory({
    ...opts,
    source: "manual",
    importanceScore: 0.9,
  });
}
