"use client";

import { useState } from "react";
import type { VoiceId, ContentRating } from "@/lib/supabase/types";

const voices: { value: VoiceId; label: string }[] = [
  { value: "ara", label: "Ara" },
  { value: "rex", label: "Rex" },
  { value: "sal", label: "Sal" },
  { value: "eve", label: "Eve" },
  { value: "leo", label: "Leo" },
];

const inputClass =
  "w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600";

export default function SettingsPage() {
  const [displayName, setDisplayName] = useState("");
  const [defaultVoice, setDefaultVoice] = useState<VoiceId>("ara");
  const [contentRating, setContentRating] = useState<ContentRating>("sfw");

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold text-zinc-100 mb-6">Settings</h1>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">
            Display Name
          </label>
          <input
            className={inputClass}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your display name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">
            Default Voice
          </label>
          <select
            className={inputClass}
            value={defaultVoice}
            onChange={(e) => setDefaultVoice(e.target.value as VoiceId)}
          >
            {voices.map((v) => (
              <option key={v.value} value={v.value}>
                {v.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">
            Content Rating
          </label>
          <div className="flex gap-2">
            {(["sfw", "mature"] as ContentRating[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setContentRating(r)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  contentRating === r
                    ? "bg-indigo-600 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <button className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500">
          Save Settings
        </button>
      </div>
    </div>
  );
}
