"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { deleteMemory } from "@/actions/memories";
import { Brain, Trash2, Pin, Zap, Search } from "lucide-react";
import type { Database } from "@/lib/supabase/types";

type Memory = Database["public"]["Tables"]["memory_ltm"]["Row"];
type Character = Pick<
  Database["public"]["Tables"]["characters"]["Row"],
  "id" | "name"
>;

const inputClass =
  "w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600";

const selectClass =
  "rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600";

export default function MemoriesPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [characterMap, setCharacterMap] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCharacterId, setFilterCharacterId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: memoryData } = await supabase
        .from("memory_ltm")
        .select(
          "id, content, source, importance_score, created_at, character_ids_involved, user_id, session_id, embedding, tags"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);

      const mems = memoryData ?? [];
      setMemories(mems);

      const charIds = [
        ...new Set(mems.flatMap((m) => m.character_ids_involved)),
      ];

      if (charIds.length > 0) {
        const { data: charData } = await supabase
          .from("characters")
          .select("id, name")
          .in("id", charIds);

        const chars = charData ?? [];
        setCharacters(chars);
        setCharacterMap(
          Object.fromEntries(chars.map((c) => [c.id, c.name]))
        );
      }

      setLoading(false);
    }
    load();
  }, []);

  const filteredMemories = useMemo(() => {
    let result = memories;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((m) => m.content.toLowerCase().includes(q));
    }

    if (filterCharacterId) {
      result = result.filter((m) =>
        m.character_ids_involved.includes(filterCharacterId)
      );
    }

    return result;
  }, [memories, searchQuery, filterCharacterId]);

  async function handleDelete(memoryId: string) {
    await deleteMemory(memoryId);
    setMemories((prev) => prev.filter((m) => m.id !== memoryId));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-zinc-400">Loading memories...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Brain className="h-6 w-6 text-indigo-400" />
          <h1 className="text-2xl font-bold text-zinc-100">Memories</h1>
        </div>
        <span className="text-sm text-zinc-500">
          {filteredMemories.length} of {memories.length} entries
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            className={`${inputClass} pl-9`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search memories..."
          />
        </div>
        {characters.length > 0 && (
          <select
            className={selectClass}
            value={filterCharacterId}
            onChange={(e) => setFilterCharacterId(e.target.value)}
          >
            <option value="">All characters</option>
            {characters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {!memories.length ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 py-16">
          <Brain className="h-12 w-12 text-zinc-700 mb-4" />
          <p className="text-zinc-400 mb-2">No memories yet</p>
          <p className="text-zinc-600 text-sm">
            Memories are created automatically during and after roleplay
            sessions.
          </p>
        </div>
      ) : filteredMemories.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 py-16">
          <Search className="h-12 w-12 text-zinc-700 mb-4" />
          <p className="text-zinc-400 mb-2">No memories match your filters</p>
          <p className="text-zinc-600 text-sm">
            Try adjusting your search or character filter.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMemories.map((memory) => {
            const charNames = memory.character_ids_involved
              .map((id: string) => characterMap[id] || "Unknown")
              .join(", ");

            return (
              <div
                key={memory.id}
                className="rounded-lg border border-zinc-800 bg-zinc-900 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-zinc-200 text-sm leading-relaxed">
                      {memory.content}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-zinc-500">{charNames}</span>
                      <span className="text-xs text-zinc-600">
                        {new Date(memory.created_at).toLocaleDateString()}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
                        {memory.source === "manual" ? (
                          <>
                            <Pin className="h-3 w-3" /> Pinned
                          </>
                        ) : (
                          <>
                            <Zap className="h-3 w-3" /> Auto
                          </>
                        )}
                      </span>
                      <span className="text-xs text-zinc-600">
                        importance: {memory.importance_score.toFixed(1)}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(memory.id)}
                    className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                    title="Delete memory"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
