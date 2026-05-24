import { describe, expect, it } from "vitest";
import { MockEmbeddingService, cosineSimilarity } from "../src/services/embedding.service.js";

describe("embedding service", () => {
  it("returns deterministic normalized embeddings", async () => {
    const service = new MockEmbeddingService();
    const first = await service.embed("NOC submission deadline");
    const second = await service.embed("NOC submission deadline");
    expect(first).toEqual(second);
    expect(cosineSimilarity(first, second)).toBe(1);
  });

  it("keeps unrelated text at lower similarity than exact matches", async () => {
    const service = new MockEmbeddingService();
    const query = await service.embed("certificate download");
    const related = await service.embed("download certificate after internship");
    const unrelated = await service.embed("mentor attendance correction");
    expect(cosineSimilarity(query, related)).toBeGreaterThan(cosineSimilarity(query, unrelated));
  });
});
