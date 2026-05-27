#!/usr/bin/env node
// ==============================================
// src/search.js
//
// INTERACTIVE SEMANTIC SEARCH CLI
// --------------------------------
// mirrors the Python while-loop query interface
// but backed by MongoDB Atlas Vector Search.
//
// Run:  node src/search.js
// ==============================================

import readline from "readline";
import "dotenv/config";
import chalk from "chalk";

import { getEmbedder, embedQuery } from "./embedder.js";
import { getCollection, closeDb } from "./db.js";

const MODEL = process.env.EMBED_MODEL || "Xenova/bge-small-en-v1.5";
const TOP_K = parseInt(process.env.TOP_K || "2");
const COLL_NAME = process.env.COLLECTION_NAME || "faq_embeddings";

// ──────────────────────────────────────────────
// Atlas $vectorSearch aggregation pipeline
// ──────────────────────────────────────────────
function buildVectorPipeline(queryVector, k) {
  return [
    {
      $vectorSearch: {
        index: "vector_index",         // name you gave in Atlas UI
        path: "embedding",             // field holding the vector
        queryVector: queryVector,
        numCandidates: k * 10,         // oversample → better recall
        limit: k,
      },
    },
    {
      $project: {
        _id: 0,
        faq_id: 1,
        section: 1,
        question: 1,
        answer: 1,
        score: { $meta: "vectorSearchScore" },  // cosine similarity
      },
    },
  ];
}

// ──────────────────────────────────────────────
// Pretty-print a single result
// ──────────────────────────────────────────────
function printResult(doc, rank) {
  const score = (doc.score * 100).toFixed(2);
  const bar = "█".repeat(Math.round(doc.score * 20)).padEnd(20, "░");

  console.log(chalk.gray("\n" + "═".repeat(64)));
  console.log(
    chalk.bold.yellow(`  Rank ${rank}`) +
      chalk.gray(`  [${doc.faq_id}]  `) +
      chalk.cyan(`${bar} ${score}%`)
  );
  console.log(chalk.gray(`  Section: `) + chalk.white(doc.section));
  console.log("\n" + chalk.bold("Question:"));
  console.log("  " + chalk.white(doc.question));
  console.log("\n" + chalk.bold("Answer:"));
  // wrap answer at 70 chars
  const words = doc.answer.split(" ");
  let line = "  ";
  for (const w of words) {
    if (line.length + w.length > 72) {
      console.log(chalk.gray(line));
      line = "  ";
    }
    line += w + " ";
  }
  if (line.trim()) console.log(chalk.gray(line));
}

// ──────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────
async function main() {
  console.log(chalk.bold.blue("\n╔══════════════════════════════════════════════╗"));
  console.log(chalk.bold.blue("║   FAQ Semantic Search — Interactive CLI      ║"));
  console.log(chalk.bold.blue("║   Node.js + MongoDB Atlas Vector Search      ║"));
  console.log(chalk.bold.blue("╚══════════════════════════════════════════════╝\n"));

  // Load model first (warm-up)
  process.stdout.write(chalk.cyan("Loading embedding model... "));
  const t0 = Date.now();
  const pipe = await getEmbedder(MODEL);
  console.log(chalk.green("ready") + chalk.gray(` (${Date.now() - t0}ms)`));

  // Connect to MongoDB
  process.stdout.write(chalk.cyan("Connecting to MongoDB Atlas... "));
  const t1 = Date.now();
  const coll = await getCollection();
  console.log(chalk.green("connected") + chalk.gray(` (${Date.now() - t1}ms)`));

  const count = await coll.countDocuments();
  console.log(chalk.gray(`   Collection: ${chalk.white(COLL_NAME)} | ${count} documents`));

  console.log(chalk.gray('\n   Type your query and press Enter. Type "exit" to quit.\n'));
  console.log(chalk.gray("─".repeat(64)));

  // ── Interactive loop ───────────────────────
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const ask = () => {
    rl.question(chalk.bold.green("\nQuery: "), async (query) => {
      query = query.trim();

      if (query.toLowerCase() === "exit" || query.toLowerCase() === "quit") {
        console.log(chalk.yellow("\nGoodbye!\n"));
        await closeDb();
        rl.close();
        return;
      }

      if (!query) {
        ask();
        return;
      }

      try {
        const tEmbed = Date.now();
        const vec = await embedQuery(query, pipe);
        const embedMs = Date.now() - tEmbed;

        const tSearch = Date.now();
        const pipeline = buildVectorPipeline(vec, TOP_K);
        const results = await coll.aggregate(pipeline).toArray();
        const searchMs = Date.now() - tSearch;

        if (results.length === 0) {
          console.log(chalk.red("\n   No results found. Is the vector index created in Atlas?"));
        } else {
          console.log(
            chalk.gray(
              `\n  embed=${embedMs}ms  |  atlas_search=${searchMs}ms  |  total=${embedMs + searchMs}ms`
            )
          );
          results.forEach((doc, i) => printResult(doc, i + 1));
          console.log(chalk.gray("\n" + "═".repeat(64)));
        }
      } catch (err) {
        if (err.message.includes("$vectorSearch")) {
          console.log(
            chalk.red(
              '\n   Vector search failed. Did you create the "vector_index" in Atlas?\n' +
                "   Run ingest.js first and follow the index creation instructions."
            )
          );
        } else {
          console.log(chalk.red("\n Error: " + err.message));
        }
      }

      ask();
    });
  };

  ask();
}

main().catch((err) => {
  console.error(chalk.red("\nSearch failed:"), err.message);
  process.exit(1);
});
