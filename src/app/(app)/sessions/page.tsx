import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Eye } from "lucide-react";

export default async function SessionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: sessions } = await supabase
    .from("sessions")
    .select("*, characters:active_character_ids")
    .eq("user_id", user!.id)
    .order("updated_at", { ascending: false });

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-100 mb-6">Sessions</h1>

      {!sessions?.length ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 py-16">
          <p className="text-zinc-400 mb-4">No sessions yet</p>
          <Link
            href="/characters"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Pick a character to start
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-4 transition-colors hover:border-zinc-700"
            >
              <Link href={`/sessions/${session.id}`} className="flex-1">
                <p className="text-sm font-medium text-zinc-100">
                  Session
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  {new Date(session.created_at).toLocaleDateString()}
                </p>
              </Link>
              <div className="flex items-center gap-3">
                <Link
                  href={`/sessions/${session.id}/replay`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700 transition-colors"
                >
                  <Eye className="h-3.5 w-3.5" />
                  View
                </Link>
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
