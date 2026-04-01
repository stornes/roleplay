import { createClient } from "@/lib/supabase/server";

/**
 * Compress the short-term memory window for a session.
 * Takes the oldest turns beyond the recent window and summarizes them
 * using the Grok text API, storing the result in sessions.stm_summary.
 *
 * Trigger: turn count > 20 OR estimated STM tokens > 4,000
 * Action: Summarize to ~200 tokens, store in sessions.stm_summary
 */
export async function compressStm(sessionId: string): Promise<void> {
  const supabase = await createClient();
  const apiKey = process.env.XAI_API_KEY;

  if (!apiKey) {
    console.error("XAI_API_KEY not set, skipping STM compression");
    return;
  }

  // Fetch all turns for this session
  const { data: allTurns } = await supabase
    .from("turns")
    .select("speaker, text, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (!allTurns || allTurns.length <= 20) return;

  // Get current stm_summary
  const { data: session } = await supabase
    .from("sessions")
    .select("stm_summary, active_character_ids")
    .eq("id", sessionId)
    .single();

  // Split: older turns to compress, recent 10 to keep
  const turnsToCompress = allTurns.slice(0, -10);
  const previousSummary = session?.stm_summary || "";

  // Build the compression prompt
  const turnsText = turnsToCompress
    .map((t) => `${t.speaker}: ${t.text}`)
    .join("\n");

  const prompt = [
    "Summarize this roleplay conversation into a concise narrative summary (under 200 words).",
    "Focus on: key events, relationship developments, important decisions, and plot points.",
    "Write in past tense, third person.",
    previousSummary ? `\nPrevious summary:\n${previousSummary}` : "",
    `\nConversation to summarize:\n${turnsText}`,
  ].join("\n");

  try {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "grok-3",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 300,
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      console.error("STM compression failed:", await res.text());
      return;
    }

    const data = await res.json();
    const summary = data.choices?.[0]?.message?.content || "";

    // Only proceed with deletion if we got a valid summary
    if (!summary || summary.length < 20) {
      console.error("STM compression produced empty/short summary, skipping turn deletion");
      return;
    }

    // Update session with new summary
    await supabase
      .from("sessions")
      .update({
        stm_summary: summary,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    // Delete the compressed turns (keep only recent 10)
    const cutoffDate = allTurns[allTurns.length - 10].created_at;
    await supabase
      .from("turns")
      .delete()
      .eq("session_id", sessionId)
      .lt("created_at", cutoffDate);

  } catch (err) {
    console.error("STM compression error:", err);
  }
}
