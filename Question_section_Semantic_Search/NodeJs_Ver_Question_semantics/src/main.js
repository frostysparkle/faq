import { SemanticBackend } from "./backend.js";

async function main() {
  const backend = new SemanticBackend();
  await backend.init();
  await backend.buildFromDataset();

  const tests = [
    "What is the Vicharanashala internship?",
    "Can I take leave during internship?",
    "How to make ROSETTA question?",
    "This is a new unknown question"
  ];

  for (const q of tests) {
    await backend.queryFlow(q);
  }

  await backend.mongo1.client.close();
  await backend.mongo2.client.close();
}

main().catch(console.error);