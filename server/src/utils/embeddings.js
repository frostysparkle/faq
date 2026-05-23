import { pipeline } from "@xenova/transformers";

// Singleton embedder loaded once and reused across requests.
// First load downloads/caches the local all-MiniLM-L6-v2 model; later calls reuse it.
let embedder = null;

async function getEmbedder() {
  if (!embedder) {
    console.info("[Embeddings] Loading all-MiniLM-L6-v2 model...");
    embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    console.info("[Embeddings] Model loaded and ready.");
  }

  return embedder;
}

export async function generateEmbedding(text) {
  const truncated = text.slice(0, 2000);

  try {
    const model = await getEmbedder();
    const output = await model(truncated, { pooling: "mean", normalize: true });
    return Array.from(output.data);
  } catch (err) {
    console.warn("[Embeddings] Failed to generate embedding:", err.message);
    return null;
  }
}

export function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) {
    return 0;
  }

  return a.reduce((sum, ai, i) => sum + ai * b[i], 0);
}

export async function generateFaqEmbedding(faq) {
  const text = `${faq.title}. ${faq.summary}. ${faq.answer.slice(0, 500)}`;
  return generateEmbedding(text);
}

export async function generateQueryEmbedding(query) {
  return generateEmbedding(query);
}
