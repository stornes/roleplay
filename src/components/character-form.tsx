"use client";

import { useState } from "react";
import type {
  VoiceId,
  Visibility,
  ContentRating,
  Database,
} from "@/lib/supabase/types";

type Character = Database["public"]["Tables"]["characters"]["Row"];

export interface CharacterFormData {
  name: string;
  chat_name?: string;
  bio: string;
  personality: string;
  scenario?: string;
  initial_message?: string;
  voice_id: VoiceId;
  tags: string[];
  visibility: Visibility;
  content_rating: ContentRating;
}

interface Props {
  initial?: Character | null;
  onSubmit: (data: CharacterFormData) => Promise<void>;
}

const voices: { value: VoiceId; label: string }[] = [
  { value: "ara", label: "Ara" },
  { value: "rex", label: "Rex" },
  { value: "sal", label: "Sal" },
  { value: "eve", label: "Eve" },
  { value: "leo", label: "Leo" },
];

const inputClass =
  "w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600";

const labelClass = "block text-sm font-medium text-zinc-300 mb-1.5";

export function CharacterForm({ initial, onSubmit }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [chatName, setChatName] = useState(initial?.chat_name ?? "");
  const [bio, setBio] = useState(initial?.bio ?? "");
  const [personality, setPersonality] = useState(initial?.personality ?? "");
  const [scenario, setScenario] = useState(initial?.scenario ?? "");
  const [initialMessage, setInitialMessage] = useState(
    initial?.initial_message ?? ""
  );
  const [voiceId, setVoiceId] = useState<VoiceId>(
    initial?.voice_id ?? "ara"
  );
  const [tagsStr, setTagsStr] = useState(initial?.tags?.join(", ") ?? "");
  const [visibility, setVisibility] = useState<Visibility>(
    initial?.visibility ?? "private"
  );
  const [contentRating, setContentRating] = useState<ContentRating>(
    initial?.content_rating ?? "sfw"
  );
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({
        name,
        chat_name: chatName || undefined,
        bio,
        personality,
        scenario: scenario || undefined,
        initial_message: initialMessage || undefined,
        voice_id: voiceId,
        tags: tagsStr
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        visibility,
        content_rating: contentRating,
      });
    } finally {
      setSubmitting(false);
    }
  }

  const [importText, setImportText] = useState("");

  function handleImport() {
    if (!importText.trim()) return;
    const text = importText;

    const get = (key: string): string => {
      const patterns = [
        new RegExp(`\\*\\*${key}:\\*\\*\\s*(.+?)(?=\\n\\*\\*|\\n\\n|$)`, "is"),
        new RegExp(`^${key}:\\s*(.+?)(?=\\n[A-Z]|\\n\\n|$)`, "ims"),
      ];
      for (const pat of patterns) {
        const m = text.match(pat);
        if (m) return m[1].trim();
      }
      return "";
    };

    const n = get("Name");
    const cn = get("Chat Name");
    const b = get("Bio");
    const p = get("Personality");
    const s = get("Scenario");
    const im = get("Initial Message");
    const v = get("Voice")?.toLowerCase();
    const t = get("Tags");

    if (n) setName(n);
    if (cn) setChatName(cn);
    if (b) setBio(b);
    if (p) setPersonality(p);
    if (s) setScenario(s);
    if (im) setInitialMessage(im);
    if (v && ["ara", "rex", "sal", "eve", "leo"].includes(v)) setVoiceId(v as VoiceId);
    if (t) setTagsStr(t);
    setImportText("");
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      {/* Quick Import */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-zinc-100">Quick Import</h2>
        <p className="text-xs text-zinc-500">
          Paste a character definition and it will auto-fill the fields below.
        </p>
        <textarea
          className={`${inputClass} h-28 resize-y`}
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder={"**Name:** Greg\n**Bio:** A grizzled former dock worker...\n**Personality:** You are Greg...\n**Voice:** Rex\n**Tags:** mystery, noir"}
        />
        <button
          type="button"
          onClick={handleImport}
          disabled={!importText.trim()}
          className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700 disabled:opacity-50"
        >
          Parse and Fill
        </button>
      </section>

      {/* Identity */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-zinc-100">Identity</h2>
        <div>
          <label className={labelClass}>
            Name <span className="text-red-500">*</span>
          </label>
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Character name"
            required
          />
        </div>
        <div>
          <label className={labelClass}>Chat Name</label>
          <input
            className={inputClass}
            value={chatName}
            onChange={(e) => setChatName(e.target.value)}
            placeholder="Optional display name in chat"
          />
        </div>
      </section>

      {/* Description */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-zinc-100">Description</h2>
        <div>
          <label className={labelClass}>Bio</label>
          <textarea
            className={`${inputClass} h-24 resize-y`}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Short bio / description"
          />
        </div>
        <div>
          <label className={labelClass}>Personality</label>
          <textarea
            className={`${inputClass} h-40 resize-y`}
            value={personality}
            onChange={(e) => setPersonality(e.target.value)}
            placeholder="Detailed personality traits, speaking style, quirks..."
          />
          <p className="mt-1 text-xs text-zinc-600">
            ~{personality.length} characters
          </p>
        </div>
        <div>
          <label className={labelClass}>Scenario</label>
          <textarea
            className={`${inputClass} h-20 resize-y`}
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
            placeholder="Optional default scenario / context"
          />
        </div>
        <div>
          <label className={labelClass}>Initial Message</label>
          <textarea
            className={`${inputClass} h-20 resize-y`}
            value={initialMessage}
            onChange={(e) => setInitialMessage(e.target.value)}
            placeholder="The character's opening message"
          />
        </div>
      </section>

      {/* Settings */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-zinc-100">Settings</h2>
        <div>
          <label className={labelClass}>Voice</label>
          <select
            className={inputClass}
            value={voiceId}
            onChange={(e) => setVoiceId(e.target.value as VoiceId)}
          >
            {voices.map((v) => (
              <option key={v.value} value={v.value}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Tags</label>
          <input
            className={inputClass}
            value={tagsStr}
            onChange={(e) => setTagsStr(e.target.value)}
            placeholder="fantasy, mentor, wise (comma-separated)"
          />
        </div>
        <div className="flex gap-6">
          <div>
            <label className={labelClass}>Visibility</label>
            <div className="flex gap-2">
              {(["private", "public"] as Visibility[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVisibility(v)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    visibility === v
                      ? "bg-indigo-600 text-white"
                      : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelClass}>Content Rating</label>
            <div className="flex gap-2">
              {(["sfw", "mature"] as ContentRating[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setContentRating(r)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
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
        </div>
      </section>

      <button
        type="submit"
        disabled={submitting || !name}
        className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? "Saving..." : initial ? "Update Character" : "Create Character"}
      </button>
    </form>
  );
}
