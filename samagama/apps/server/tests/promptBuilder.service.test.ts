import { describe, expect, it } from "vitest";
import { buildGroundedPrompt } from "../src/services/promptBuilder.service.js";

describe("prompt builder", () => {
  it("contains guardrails that prevent unsupported policy answers", () => {
    const prompt = buildGroundedPrompt("Can I submit NOC late?", [
      {
        id: "faq-1",
        type: "faq",
        title: "NOC process",
        score: 0.92,
        body: "Submit NOC through Documents before the published deadline."
      }
    ]);

    expect(prompt).toContain("Answer only from the provided verified context.");
    expect(prompt).toContain("Do not invent policy");
    expect(prompt).toContain("NOC process");
  });
});
