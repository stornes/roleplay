import { NextResponse } from "next/server";

export async function POST() {
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
