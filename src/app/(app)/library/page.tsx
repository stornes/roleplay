"use client";

import { useState, useEffect, useMemo } from "react";
import { Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { LibraryCard } from "@/components/library-card";
import { LibraryScenarioCard } from "@/components/library-scenario-card";
import { cloneCharacter, cloneScenario } from "@/actions/library";
import type { Database } from "@/lib/supabase/types";

type Character = Database["public"]["Tables"]["characters"]["Row"];
type Scenario = Database["public"]["Tables"]["scenarios"]["Row"];
type ContentRating = Database["public"]["Tables"]["characters"]["Row"]["content_rating"];

type Tab = "characters" | "scenarios";
type RatingFilter = "all" | "sfw" | "mature";

export default function LibraryPage() {
  const [tab, setTab] = useState<Tab>("characters");
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>("all");
  const [characters, setCharacters] = useState<Character[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [creatorNames, setCreatorNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [cloneMessage, setCloneMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const [charResult, scenResult] = await Promise.all([
        supabase
          .from("characters")
          .select("*")
          .eq("visibility", "public")
          .order("updated_at", { ascending: false }),
        supabase
          .from("scenarios")
          .select("*")
          .eq("visibility", "public")
          .order("updated_at", { ascending: false }),
      ]);

      const chars = charResult.data ?? [];
      const scens = scenResult.data ?? [];

      setCharacters(chars);
      setScenarios(scens);

      // Collect unique owner IDs and fetch display names
      const ownerIds = [
        ...new Set([
          ...chars.map((c) => c.owner_id),
          ...scens.map((s) => s.owner_id),
        ]),
      ];

      if (ownerIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", ownerIds);

        const nameMap: Record<string, string> = {};
        profiles?.forEach((p) => {
          nameMap[p.id] = p.display_name;
        });
        setCreatorNames(nameMap);
      }

      setLoading(false);
    }

    load();
  }, []);

  // Filter characters
  const filteredCharacters = useMemo(() => {
    let items = characters;
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.bio.toLowerCase().includes(q)
      );
    }
    if (selectedTag) {
      items = items.filter((c) => c.tags.includes(selectedTag));
    }
    if (ratingFilter !== "all") {
      items = items.filter((c) => c.content_rating === ratingFilter);
    }
    return items;
  }, [characters, search, selectedTag, ratingFilter]);

  // Filter scenarios
  const filteredScenarios = useMemo(() => {
    let items = scenarios;
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (s) =>
          s.scenario_title.toLowerCase().includes(q) ||
          s.scenario_description.toLowerCase().includes(q)
      );
    }
    return items;
  }, [scenarios, search]);

  // All unique tags from visible characters
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    filteredCharacters.forEach((c) => c.tags.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [filteredCharacters]);

  async function handleCloneCharacter(id: string) {
    try {
      await cloneCharacter(id);
      setCloneMessage("Character added to your library!");
      setTimeout(() => setCloneMessage(null), 3000);
    } catch {
      setCloneMessage("Failed to clone character.");
      setTimeout(() => setCloneMessage(null), 3000);
    }
  }

  async function handleCloneScenario(id: string) {
    try {
      await cloneScenario(id);
      setCloneMessage("Scenario added to your library!");
      setTimeout(() => setCloneMessage(null), 3000);
    } catch {
      setCloneMessage("Failed to clone scenario.");
      setTimeout(() => setCloneMessage(null), 3000);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-100 mb-6">
        Community Library
      </h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => { setTab("characters"); setSelectedTag(null); }}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            tab === "characters"
              ? "bg-indigo-600 text-white"
              : "bg-zinc-800 text-zinc-400 hover:text-zinc-100"
          }`}
        >
          Characters
        </button>
        <button
          onClick={() => { setTab("scenarios"); setSelectedTag(null); }}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            tab === "scenarios"
              ? "bg-indigo-600 text-white"
              : "bg-zinc-800 text-zinc-400 hover:text-zinc-100"
          }`}
        >
          Scenarios
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          placeholder={
            tab === "characters"
              ? "Search characters..."
              : "Search scenarios..."
          }
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 py-2 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
        />
      </div>

      {/* Filters (characters tab only) */}
      {tab === "characters" && (
        <div className="space-y-3 mb-6">
          {/* Rating filter */}
          <div className="flex gap-2">
            {(["all", "sfw", "mature"] as RatingFilter[]).map((r) => (
              <button
                key={r}
                onClick={() => setRatingFilter(r)}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                  ratingFilter === r
                    ? "bg-indigo-600 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:text-zinc-100"
                }`}
              >
                {r === "all" ? "All" : r.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Tag chips */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedTag && (
                <button
                  onClick={() => setSelectedTag(null)}
                  className="rounded-full bg-indigo-600 px-2.5 py-0.5 text-xs text-white"
                >
                  {selectedTag} &times;
                </button>
              )}
              {allTags
                .filter((t) => t !== selectedTag)
                .slice(0, 20)
                .map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(tag)}
                    className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-300 hover:bg-zinc-700 transition-colors"
                  >
                    {tag}
                  </button>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Clone message */}
      {cloneMessage && (
        <div className="mb-4 rounded-lg bg-emerald-900/50 px-4 py-2 text-sm text-emerald-400">
          {cloneMessage}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-zinc-400">Loading...</p>
        </div>
      ) : tab === "characters" ? (
        filteredCharacters.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 py-16">
            <p className="text-zinc-400">No public characters found</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCharacters.map((character) => (
              <LibraryCard
                key={character.id}
                character={character}
                creatorName={creatorNames[character.owner_id] ?? "Unknown"}
                onClone={handleCloneCharacter}
              />
            ))}
          </div>
        )
      ) : filteredScenarios.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 py-16">
          <p className="text-zinc-400">No public scenarios found</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredScenarios.map((scenario) => (
            <LibraryScenarioCard
              key={scenario.id}
              scenario={scenario}
              creatorName={creatorNames[scenario.owner_id] ?? "Unknown"}
              onClone={handleCloneScenario}
            />
          ))}
        </div>
      )}
    </div>
  );
}
