import { tokenize } from "../utils/text.js";

export interface EmbeddingService {
  embed(text: string): Promise<number[]>;
}

const VECTOR_DIMENSIONS = 64;

function hashToken(token: string): number {
  let hash = 0;
  for (let index = 0; index < token.length; index += 1) {
    hash = (hash * 31 + token.charCodeAt(index)) >>> 0;
  }
  return hash % VECTOR_DIMENSIONS;
}

function normalize(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (magnitude === 0) return vector;
  return vector.map((value) => value / magnitude);
}

export function cosineSimilarity(left: number[], right: number[]): number {
  const length = Math.min(left.length, right.length);
  let score = 0;
  for (let index = 0; index < length; index += 1) {
    score += (left[index] ?? 0) * (right[index] ?? 0);
  }
  return Number(score.toFixed(4));
}

export class MockEmbeddingService implements EmbeddingService {
  async embed(text: string): Promise<number[]> {
    const vector = Array.from({ length: VECTOR_DIMENSIONS }, () => 0);
    for (const token of tokenize(text)) {
      const index = hashToken(token);
      vector[index] = (vector[index] ?? 0) + 1;
    }
    return normalize(vector);
  }
}

export const embeddingService = new MockEmbeddingService();
