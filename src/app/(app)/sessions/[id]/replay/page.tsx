import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ShareButton } from "@/components/share-button";
import { ArrowLeft } from "lucide-react";

export default async function SessionReplayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch session (must belong to user)
  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", id)
    .eq("user_id", user!.id)
    .single();

  if (!session) notFound();

  // Fetch turns
  const { data: turns } = await supabase
    .from("turns")
    .select("*")
    .eq("session_id", session.id)
    .order("created_at", { ascending: true });

  // Fetch character names
  const characterIds = session.active_character_ids ?? [];
  let characterNames: Record<string, string> = {};

  if (characterIds.length > 0) {
    const { data: chars } = await supabase
      .from("characters")
      .select("id, name")
      .in("id", characterIds);

    chars?.forEach((c) => {
      characterNames[c.id] = c.name;
    });
  }

  const charNameList = characterIds
    .map((cid) => characterNames[cid] ?? "Unknown")
    .join(", ");

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/sessions"
            className="rounded-lg bg-zinc-800 p-2 text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">
              Session Replay
            </h1>
            {charNameList && (
              <p className="text-sm text-zinc-400 mt-0.5">
                {charNameList}
              </p>
            )}
          </div>
        </div>
        <ShareButton sessionId={session.id} />
      </div>

      {/* Session meta */}
      <div className="mb-6 flex items-center gap-3 text-sm text-zinc-500">
        <span>{new Date(session.created_at).toLocaleDateString()}</span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            session.status === "active"
              ? "bg-emerald-900/50 text-emerald-400"
              : session.status === "paused"
                ? "bg-amber-900/50 text-amber-400"
                : "bg-zinc-800 text-zinc-500"
          }`}
        >
          {session.status}
        </span>
      </div>

      {/* Transcript */}
      <div className="space-y-4">
        {turns?.map((turn) => {
          const isUser = turn.speaker === "user";
          const speakerName = isUser
            ? "You"
            : characterNames[turn.speaker] ?? turn.speaker;

          return (
            <div
              key={turn.id}
              className={`flex ${isUser ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-xl px-4 py-3 ${
                  isUser
                    ? "bg-indigo-600 text-white"
                    : "bg-zinc-800 text-zinc-100"
                }`}
              >
                <p className="text-xs font-medium mb-1 opacity-70">
                  {speakerName}
                </p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {turn.text}
                </p>
                <p
                  className={`text-xs mt-1 ${
                    isUser ? "text-indigo-200" : "text-zinc-500"
                  }`}
                >
                  {new Date(turn.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {(!turns || turns.length === 0) && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 py-16">
          <p className="text-zinc-400">No messages in this session yet.</p>
        </div>
      )}
    </div>
  );
}
