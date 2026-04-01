import { createClient } from "@/lib/supabase/server";
import { deleteMemory } from "@/actions/memories";
import { Brain, Trash2, Pin, Zap } from "lucide-react";

export default async function MemoriesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: memories } = await supabase
    .from("memory_ltm")
    .select("id, content, source, importance_score, created_at, character_ids_involved")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(100);

  // Fetch character names for display
  const characterIds = [
    ...new Set((memories || []).flatMap((m) => m.character_ids_involved)),
  ];

  let characterMap: Record<string, string> = {};
  if (characterIds.length > 0) {
    const { data: characters } = await supabase
      .from("characters")
      .select("id, name")
      .in("id", characterIds);

    characterMap = Object.fromEntries(
      (characters || []).map((c) => [c.id, c.name])
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
          {memories?.length || 0} entries
        </span>
      </div>

      {!memories?.length ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 py-16">
          <Brain className="h-12 w-12 text-zinc-700 mb-4" />
          <p className="text-zinc-400 mb-2">No memories yet</p>
          <p className="text-zinc-600 text-sm">
            Memories are created automatically during and after roleplay sessions.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {memories.map((memory) => {
            const charNames = memory.character_ids_involved
              .map((id: string) => characterMap[id] || "Unknown")
              .join(", ");

            const deleteWithId = deleteMemory.bind(null, memory.id);

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
                      <span className="text-xs text-zinc-500">
                        {charNames}
                      </span>
                      <span className="text-xs text-zinc-600">
                        {new Date(memory.created_at).toLocaleDateString()}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
                        {memory.source === "manual" ? (
                          <><Pin className="h-3 w-3" /> Pinned</>
                        ) : (
                          <><Zap className="h-3 w-3" /> Auto</>
                        )}
                      </span>
                      <span className="text-xs text-zinc-600">
                        importance: {memory.importance_score.toFixed(1)}
                      </span>
                    </div>
                  </div>
                  <form action={deleteWithId}>
                    <button
                      type="submit"
                      className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                      title="Delete memory"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
