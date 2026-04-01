import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimitToken } from "@/lib/rate-limit";

export async function POST() {
  // Auth check: only authenticated users can get xAI tokens
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: max 60 token requests per hour
  const limit = rateLimitToken(user.id);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429 }
    );
  }

  const apiKey = process.env.XAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "XAI_API_KEY not configured" },
      { status: 500 }
    );
  }

  const res = await fetch("https://api.x.ai/v1/realtime/client_secrets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ expires_after: { seconds: 300 } }),
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json(
      { error: `xAI token request failed: ${text}` },
      { status: res.status }
    );
  }

  const data = await res.json();
  return NextResponse.json({
    value: data.value,
    expires_at: data.expires_at,
  });
}
