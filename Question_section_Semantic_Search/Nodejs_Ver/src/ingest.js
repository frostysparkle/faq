#!/usr/bin/env node
// ==============================================
// src/ingest.js
//
// ONE-TIME SETUP SCRIPT
// ---------------------
// 1. Reads faqdataset_complete.json
// 2. Generates embeddings in batches (Node.js)
// 3. Upserts documents into MongoDB Atlas
// 4. Prints Atlas Vector Search index definition
//    (you paste this once in the Atlas UI)
//
// Run:  node src/ingest.js
// ==============================================

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";

import cliProgress from "cli-progress";
import chalk from "chalk";

import { getEmbedder, embedBatch } from "./embedder.js";
import { getCollection, closeDb, DB_NAME, COLL } from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.resolve(__dirname, "../faqdataset_complete.json");
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || "16");
const MODEL = process.env.EMBED_MODEL || "Xenova/bge-small-en-v1.5";

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function loadFAQs(filePath) {
  const raw = fs.readFileSync(filePath, "utf-8");
  const data = JSON.parse(raw);
  const faqs = [];
  for (const section of data.sections) {
    for (const qa of section.qa_pairs) {
      faqs.push({
        id: qa.id,
        section: section.section_title,
        question: qa.question,
        answer: qa.answer,
        document: qa.question + " " + qa.answer, // combined text for embedding
      });
    }
  }
  return faqs;
}

function printIndexInstructions(dim) {
  const indexDef = {
    name: "vector_index",
    type: "vectorSearch",
    definition: {
      fields: [
        {
          type: "vector",
          path: "embedding",
          numDimensions: dim,
          similarity: "cosine",
        },
      ],
    },
  };

  console.log(chalk.yellow("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"));
  console.log(chalk.yellow.bold("ATLAS VECTOR SEARCH INDEX — ACTION REQUIRED"));
  console.log(chalk.yellow("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"));
  console.log(chalk.cyan("\n  Go to: Atlas UI → your cluster → Search Indexes → Create Index"));
  console.log(chalk.cyan(`  Database : ${chalk.white(DB_NAME)}`));
  console.log(chalk.cyan(`  Collection: ${chalk.white(COLL)}\n`));
  console.log(chalk.white("  Paste this JSON definition:\n"));
  console.log(chalk.green(JSON.stringify(indexDef, null, 4)));
  console.log(chalk.yellow("\n  OR run this in mongosh / Atlas CLI:"));
  console.log(
    chalk.green(
      `\n  db.${COLL}.createSearchIndex(${JSON.stringify(indexDef)})\n`
    )
  );
  console.log(chalk.yellow("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"));
}

// ──────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────

async function main() {
  console.log(chalk.bold.blue("\n╔══════════════════════════════════════════════╗"));
  console.log(chalk.bold.blue("║   FAQ Semantic Search — Ingest Pipeline      ║"));
  console.log(chalk.bold.blue("║   Node.js + MongoDB Atlas Vector Search      ║"));
  console.log(chalk.bold.blue("╚══════════════════════════════════════════════╝\n"));

  // ── Step 1: Load FAQs ──────────────────────
  console.log(chalk.cyan("Loading FAQ dataset..."));
  const startLoad = Date.now();
  const faqs = loadFAQs(DATA_PATH);
  console.log(
    chalk.green(`   ✔ Loaded ${chalk.white.bold(faqs.length)} FAQ pairs`) +
      chalk.gray(` (${Date.now() - startLoad}ms)`)
  );

  // ── Step 2: Load embedding model ───────────
  console.log(chalk.cyan(`\nLoading embedding model: ${chalk.white(MODEL)}`));
  console.log(chalk.gray("   (First run downloads ~23MB ONNX model — cached after that)"));
  const startModel = Date.now();
  const pipe = await getEmbedder(MODEL);
  console.log(
    chalk.green("   ✔ Model ready") + chalk.gray(` (${Date.now() - startModel}ms)`)
  );

  // ── Step 3: Generate embeddings in batches ─
  console.log(chalk.cyan(`\nGenerating embeddings (batch_size=${BATCH_SIZE})...\n`));
  const bar = new cliProgress.SingleBar(
    {
      format:
        "   {bar} {percentage}% | Batch {value}/{total} | ETA: {eta}s | Elapsed: {duration}s",
      barCompleteChar: "█",
      barIncompleteChar: "░",
      hideCursor: true,
    },
    cliProgress.Presets.shades_classic
  );

  const totalBatches = Math.ceil(faqs.length / BATCH_SIZE);
  bar.start(totalBatches, 0);

  const startEmbed = Date.now();
  const docs = []; // will be upserted into MongoDB

  for (let i = 0; i < faqs.length; i += BATCH_SIZE) {
    const batch = faqs.slice(i, i + BATCH_SIZE);
    const texts = batch.map((f) => f.document);

    // Parallel embedding within the batch
    const vectors = await embedBatch(texts, pipe);

    for (let j = 0; j < batch.length; j++) {
      docs.push({
        faq_id: batch[j].id,
        section: batch[j].section,
        question: batch[j].question,
        answer: batch[j].answer,
        embedding: vectors[j],       // number[] — 384 floats
        ingested_at: new Date(),
      });
    }

    bar.increment();
  }

  bar.stop();
  const embedTime = ((Date.now() - startEmbed) / 1000).toFixed(2);
  const dim = docs[0].embedding.length;

  console.log(
    chalk.green(`\n   ✔ ${docs.length} embeddings generated`) +
      chalk.gray(` in ${embedTime}s | dim=${dim}`)
  );
  console.log(
    chalk.gray(
      `   ⚡ Throughput: ${(faqs.length / parseFloat(embedTime)).toFixed(1)} docs/sec`
    )
  );

  // ── Step 4: Upsert into MongoDB ────────────
  console.log(chalk.cyan("\nUpserting documents into MongoDB Atlas..."));
  const startDb = Date.now();
  const coll = await getCollection();

  // Bulk upsert: match on faq_id, replace doc
  const ops = docs.map((doc) => ({
    replaceOne: {
      filter: { faq_id: doc.faq_id },
      replacement: doc,
      upsert: true,
    },
  }));

  const result = await coll.bulkWrite(ops, { ordered: false });
  console.log(
    chalk.green(
      `   ✔ Upserted ${result.upsertedCount} new + ${result.modifiedCount} updated`
    ) + chalk.gray(` (${Date.now() - startDb}ms)`)
  );

  // ── Step 5: Print index instructions ───────
  printIndexInstructions(dim);

  // ── Summary ────────────────────────────────
  const totalTime = ((Date.now() - startLoad) / 1000).toFixed(2);
  console.log(chalk.bold.green("Ingest complete!"));
  console.log(chalk.gray(`   Total wall-clock time: ${totalTime}s\n`));

  await closeDb();
}

main().catch((err) => {
  console.error(chalk.red("\nIngest failed:"), err.message);
  process.exit(1);
});
