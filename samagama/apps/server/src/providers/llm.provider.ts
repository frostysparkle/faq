import type { RetrievedContext } from "../services/promptBuilder.service.js";

export interface LlmProvider {
  generateAnswer(input: {
    question: string;
    prompt: string;
    sources: RetrievedContext[];
  }): Promise<string>;
}

export class MockLlmProvider implements LlmProvider {
  async generateAnswer(input: {
    question: string;
    prompt: string;
    sources: RetrievedContext[];
  }): Promise<string> {
    const topSource = input.sources[0];
    if (!topSource) {
      return "I could not find a verified answer for this. You can post this in Community Q&A.";
    }

    return [
      `Based on verified Samagama content, ${topSource.body}`,
      "",
      `Source: ${topSource.title}`
    ].join("\n");
  }
}

export const llmProvider = new MockLlmProvider();
