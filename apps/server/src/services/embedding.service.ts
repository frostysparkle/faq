// Embedding service. Mirrors remote utils/embeddings.js architecture.
//
// Generates 384-dimensional vector embeddings for FAQ titles and question
// titles. These are used for semantic duplicate detection and (Phase 6)
// vector search in MongoDB Atlas.
//
// Provider selection via EMBEDDING_PROVIDER env var:
//   mock   — returns deterministic zero-vector; no external calls (default / CI).
//   gemini — calls Google Gemini embeddings API (requires GEMINI_API_KEY).
//
// The remote backend used @xenova/transformers (local ML model). We mirror the
// same interface but keep the provider pluggable so the team can switch to a
// local model later without changing call-sites.
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

const EMBEDDING_DIM = 384;

/** Generate a 384-dim embedding for the given text. */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) return new Array(EMBEDDING_DIM).fill(0);

  try {
    switch (env.EMBEDDING_PROVIDER) {
      case 'gemini':
        return await geminiEmbed(text);
      case 'mock':
      default:
        return mockEmbed(text);
    }
  } catch (err) {
    logger.warn({ err, provider: env.EMBEDDING_PROVIDER }, 'embedding generation failed — falling back to mock');
    return mockEmbed(text);
  }
}

/** Cosine similarity between two equal-length vectors. Returns -1 to 1. */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// ─── Provider implementations ─────────────────────────────────────────────────

/**
 * Mock embedding — deterministic, fast, zero external deps.
 * Maps each character to a float contribution so similar strings
 * produce similar vectors (good enough for dev/test deduplication).
 */
function mockEmbed(text: string): number[] {
  const vec = new Array(EMBEDDING_DIM).fill(0) as number[];
  const norm = text.toLowerCase().trim();
  for (let i = 0; i < norm.length; i++) {
    const idx = norm.charCodeAt(i) % EMBEDDING_DIM;
    vec[idx] += 1 / (i + 1);
  }
  // L2 normalise.
  const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / mag);
}

/** Gemini text-embedding-004 — 768 dims, truncated/padded to 384. */
async function geminiEmbed(text: string): Promise<number[]> {
  if (!env.GEMINI_API_KEY) {
    logger.warn('GEMINI_API_KEY not set — falling back to mock embedding');
    return mockEmbed(text);
  }

  const url =
    'https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent' +
    `?key=${env.GEMINI_API_KEY}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'models/text-embedding-004', content: { parts: [{ text }] } }),
  });

  if (!res.ok) {
    throw new Error(`Gemini embedding API error: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as { embedding: { values: number[] } };
  const raw = json.embedding.values;

  // Truncate or pad to 384 dims to match the stored schema validation.
  if (raw.length >= EMBEDDING_DIM) return raw.slice(0, EMBEDDING_DIM);
  return [...raw, ...new Array(EMBEDDING_DIM - raw.length).fill(0)];
}
