/**
 * Generate embeddings using OpenAI text-embedding-3-small (1536 dimensions).
 * Used for LTM write (embed memory content) and LTM search (embed query).
 */

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;

export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("OPENAI_API_KEY not set, returning empty embedding");
    return new Array(EMBEDDING_DIMENSIONS).fill(0);
  }

  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text.slice(0, 8000), // Truncate to avoid token limit
    }),
  });

  if (!res.ok) {
    console.error("Embedding API error:", await res.text());
    return new Array(EMBEDDING_DIMENSIONS).fill(0);
  }

  const data = await res.json();
  return data.data[0].embedding;
}

export { EMBEDDING_DIMENSIONS };
