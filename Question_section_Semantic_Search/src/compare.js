
// #!/usr/bin/env node
import chalk from "chalk";
import dotenv from "dotenv";
import { performance } from "perf_hooks";
import { pipeline } from "@xenova/transformers";
import { MongoClient } from "mongodb";

dotenv.config();

// ---------------- CONFIG ----------------
const URI = process.env.MONGODB_URI;
const DB = process.env.DB_NAME || "semantic_search";
const COL = process.env.COLLECTION || "faqs";
const INDEX = process.env.INDEX_NAME || "vector_index";

const USERS = 50;
const RAMP_STEP = 10;
const RAMP_DELAY_MS = 800;

// ---------------- GLOBAL ----------------
let embedder;

// ---------------- UTIL ----------------
const now = () => performance.now();

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function stats(arr) {
  const sorted = [...arr].sort((a, b) => a - b);

  const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
  const p50 = sorted[Math.floor(sorted.length * 0.5)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];
  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  return { avg, p50, p95, p99, min, max };
}

// ---------------- MODEL ----------------
async function loadModel() {
  const t0 = now();

  embedder = await pipeline(
    "feature-extraction",
    "Xenova/bge-small-en-v1.5"
  );

  return now() - t0;
}

// ---------------- SINGLE REQUEST ----------------
async function askQuestion(collection, question) {
  const t0 = now();

  try {
    const emb = await embedder(question, {
      pooling: "mean",
      normalize: true,
    });

    const result = await collection.aggregate([
      {
        $vectorSearch: {
          index: INDEX,
          path: "embedding",
          queryVector: Array.from(emb.data),
          numCandidates: 50,
          limit: 1,
        },
      },
      {
        $project: {
          _id: 0,
          question: 1,
          answer: 1,
          score: { $meta: "vectorSearchScore" },
        },
      },
    ]).toArray();

    return {
      time: now() - t0,
      success: true,
      answer: result?.[0]?.answer || "NO MATCH",
    };
  } catch (err) {
    return {
      time: now() - t0,
      success: false,
      error: err.message,
    };
  }
}

// ---------------- WORKER ----------------
async function userWorker(id, collection, questions, results) {
  const q = questions[Math.floor(Math.random() * questions.length)];

  await sleep(rand(50, 500)); // simulate real user delay

  console.log(chalk.gray(`[User ${id}] → ${q}`));

  const res = await askQuestion(collection, q);

  if (res.success) {
    console.log(
      chalk.green(
        `[User ${id}] OK → ${res.time.toFixed(2)} ms`
      )
    );
    results.push(res.time);
  } else {
    console.log(
      chalk.red(`[User ${id}] FAIL → ${res.error}`)
    );
  }
}

// ---------------- LOAD GENERATOR ----------------
async function runLoad(client) {
  const collection = client.db(DB).collection(COL);

  const questions = [
    "What is internship?",
    "How long is internship?",
    "Can I take leave during internship?",
    "What is ROSETTA?",
    "How is evaluation done?",
  ];

  let allResults = [];

  console.log(chalk.bold.cyan("\n🚀 STARTING PRODUCTION LOAD TEST\n"));

  const start = now();

  for (let batch = 0; batch < USERS; batch += RAMP_STEP) {
    const currentBatchSize = Math.min(RAMP_STEP, USERS - batch);

    console.log(
      chalk.yellow(
        `\n🔥 Ramp batch: ${batch + 1} → ${batch + currentBatchSize}`
      )
    );

    const tasks = [];

    for (let i = 0; i < currentBatchSize; i++) {
      const userId = batch + i + 1;
      tasks.push(
        userWorker(userId, collection, questions, allResults)
      );
    }

    await Promise.all(tasks);

    await sleep(RAMP_DELAY_MS);
  }

  const end = now();

  const s = stats(allResults);

  const qps = USERS / ((end - start) / 1000);

  console.log(chalk.bold.yellow("\n────────────────────────────"));
  console.log(chalk.bold.yellow("FINAL LOAD TEST REPORT"));
  console.log(chalk.bold.yellow("────────────────────────────"));

  console.log(`Users simulated   : ${USERS}`);
  console.log(`Total time        : ${(end - start).toFixed(2)} ms`);
  console.log(`Avg latency       : ${s.avg.toFixed(2)} ms`);
  console.log(`P50 latency       : ${s.p50.toFixed(2)} ms`);
  console.log(`P95 latency       : ${s.p95.toFixed(2)} ms`);
  console.log(`P99 latency       : ${s.p99.toFixed(2)} ms`);
  console.log(`Min / Max         : ${s.min.toFixed(2)} / ${s.max.toFixed(2)} ms`);
  console.log(`Throughput (QPS)  : ${qps.toFixed(2)}`);

  console.log(chalk.bold.green("\n✅ LOAD TEST COMPLETE"));
}

// ---------------- MAIN ----------------
async function main() {
  console.log(chalk.bold.blue("\n╔══════════════════════════════════════╗"));
  console.log(chalk.bold.blue("║   PRODUCTION LOAD TEST SYSTEM        ║"));
  console.log(chalk.bold.blue("╚══════════════════════════════════════╝\n"));

  if (!URI) {
    console.log(chalk.red("❌ MONGODB_URI missing"));
    process.exit(1);
  }

  console.log("📦 Loading embedding model...");
  const modelTime = await loadModel();
  console.log(`Model loaded in ${modelTime.toFixed(2)} ms`);

  console.log("\n🔗 Connecting MongoDB...");
  const client = new MongoClient(URI);
  await client.connect();
  console.log("Connected\n");

  await runLoad(client);

  await client.close();
}

main().catch(console.error);