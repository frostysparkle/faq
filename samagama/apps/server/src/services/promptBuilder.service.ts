import type { SourceReference } from "@samagama/shared";

export interface RetrievedContext extends SourceReference {
  body: string;
}

export function buildGroundedPrompt(question: string, sources: RetrievedContext[]): string {
  const context = sources
    .map((source, index) => {
      return `[${index + 1}] ${source.title}\n${source.body}`;
    })
    .join("\n\n");

  return [
    "You are Yaksha, the Samagama internship assistant.",
    "Answer only from the provided verified context.",
    "Do not invent policy, deadline, eligibility, NOC, stipend, or process information.",
    "If the context is insufficient, say that a verified answer was not found.",
    "Keep the answer concise and include source references.",
    "",
    `Question: ${question}`,
    "",
    `Verified context:\n${context}`
  ].join("\n");
}
