"use client";

import { useState } from "react";
import { Share2, Check, Copy } from "lucide-react";

export function ShareButton({ sessionId }: { sessionId: string }) {
  const [slug, setSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleShare() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to share");
      setSlug(data.slug);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to share");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!slug) return;
    const url = `${window.location.origin}/shared/${slug}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (slug) {
    const url = `${window.location.origin}/shared/${slug}`;
    return (
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={url}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 w-64"
        />
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={handleShare}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
      >
        <Share2 className="h-4 w-4" />
        {loading ? "Sharing..." : "Share"}
      </button>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}
