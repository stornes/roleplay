import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function SharedSessionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  // Fetch shared session by slug
  const { data: shared } = await supabase
    .from("shared_sessions")
    .select("*")
    .eq("share_slug", slug)
    .single();

  if (!shared) notFound();

  // Fetch session
  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", shared.session_id)
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

  // Build display name list
  const charNameList = characterIds
    .map((id) => characterNames[id] ?? "Unknown")
    .join(", ");

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900 px-6 py-4">
        <h1 className="text-xl font-bold text-zinc-100">
          Shared Roleplay Session
        </h1>
        {charNameList && (
          <p className="mt-1 text-sm text-zinc-400">
            Featuring: {charNameList}
          </p>
        )}
      </header>

      {/* Transcript */}
      <main className="mx-auto max-w-3xl px-4 py-8">
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
          <div className="flex items-center justify-center py-16">
            <p className="text-zinc-400">No messages in this session.</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 px-6 py-4 text-center">
        <Link
          href="/login"
          className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          Created with RolePlay
        </Link>
      </footer>
    </div>
  );
}
