/**
 * Long-Term Memory Search
 *
 * Semantic search over memory_ltm using pgvector cosine similarity.
 * Embeds the query, then calls match_memories RPC function.
 */

import { createClient } from "@/lib/supabase/server";
import { generateEmbedding } from "./embeddings";

export interface MemoryResult {
  id: string;
  content: string;
  similarity: number;
  created_at: string;
}

/**
 * Search LTM for memories relevant to the given query text.
 * Returns top-k results above the similarity threshold.
 */
export async function searchMemories(opts: {
  userId: string;
  query: string;
  threshold?: number;
  limit?: number;
}): Promise<MemoryResult[]> {
  const supabase = await createClient();

  const embedding = await generateEmbedding(opts.query);

  // Check if embedding is all zeros (API key missing or error)
  const isZero = embedding.every((v) => v === 0);
  if (isZero) return [];

  const { data, error } = await supabase.rpc("match_memories", {
    query_embedding: embedding,
    match_threshold: opts.threshold ?? 0.5,
    match_count: opts.limit ?? 5,
    p_user_id: opts.userId,
  });

  if (error) {
    console.error("Memory search error:", error.message);
    return [];
  }

  return (data as MemoryResult[]) || [];
}

/**
 * Get all memories for a specific character (for memory browser).
 */
export async function getCharacterMemories(opts: {
  userId: string;
  characterId: string;
  limit?: number;
}): Promise<{
  id: string;
  content: string;
  source: string;
  importance_score: number;
  created_at: string;
  session_id: string | null;
}[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("memory_ltm")
    .select("id, content, source, importance_score, created_at, session_id")
    .eq("user_id", opts.userId)
    .contains("character_ids_involved", [opts.characterId])
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 50);

  if (error) {
    console.error("Memory fetch error:", error.message);
    return [];
  }

  return data || [];
}

/**
 * Get all memories for a user (for memory browser, grouped by character).
 */
export async function getAllMemories(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("memory_ltm")
    .select("id, content, source, importance_score, created_at, session_id, character_ids_involved")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Memory fetch error:", error.message);
    return [];
  }

  return data || [];
}
