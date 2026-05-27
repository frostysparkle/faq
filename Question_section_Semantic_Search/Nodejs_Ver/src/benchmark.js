#!/usr/bin/env node
// ==============================================
// src/benchmark.js
//
// PERFORMANCE BENCHMARK — CONCURRENT USERS
// -----------------------------------------
// Simulates N concurrent users firing queries
// simultaneously. Shows:
//   - Latency per query (p50, p95, p99)
//   - Throughput (queries/sec)
//   - How Node.js event loop handles concurrency
//
// Run:  node src/benchmark.js [--users 50] [--queries 200]
// ==============================================

import "dotenv/config";
import chalk from "chalk";
import cliProgress from "cli-progress";

import { getEmbedder, embedQuery } from "./embedder.js";
import { getCollection, closeDb } from "./db.js";

const MODEL = process.env.EMBED_MODEL || "Xenova/bge-small-en-v1.5";
const TOP_K = parseInt(process.env.TOP_K || "5");

// ──────────────────────────────────────────────
// CLI args parsing (simple, no extra deps)
// ──────────────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { users: 20, queries: 100 };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--users" && args[i + 1]) opts.users = parseInt(args[i + 1]);
    if (args[i] === "--queries" && args[i + 1]) opts.queries = parseInt(args[i + 1]);
  }
  return opts;
}

// ──────────────────────────────────────────────
// Sample queries (representative of real use)
// ──────────────────────────────────────────────
const SAMPLE_QUERIES = [
  "How do I get my NOC signed?",
  "When does the internship start?",
  "Is there a stipend?",
  "How do I submit the Rosetta journal?",
  "Can I take a leave during the internship?",
  "What is ViBe and how do I log in?",
  "How do I accept the offer letter?",
  "Can alumni apply to VINS?",
  "What are the phases of the internship?",
  "Is the certificate e-certificate or physical?",
  "How many hours per day is required?",
  "What if my HOD refuses to sign the NOC?",
  "Can I use ChatGPT for my journal entries?",
  "What happens if I miss a day in Rosetta?",
  "How does the team formation work?",
  "What is the deadline to finish the internship?",
  "Can I switch from VINS to VISE?",
  "What does the quiet helper on ViBe do?",
  "How do I fix Access Restricted error on ViBe?",
  "Is there a WhatsApp group for interns?",
];

function randomQuery() {
  return SAMPLE_QUERIES[Math.floor(Math.random() * SAMPLE_QUERIES.length)];
}

// ──────────────────────────────────────────────
// Percentile helper
// ──────────────────────────────────────────────
function percentile(sorted, p) {
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function stats(latencies) {
  const sorted = [...latencies].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean: Math.round(sum / sorted.length),
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
  };
}

// ──────────────────────────────────────────────
// Single query (embed + search)
// ──────────────────────────────────────────────
async function runQuery(query, pipe, coll) {
  const t0 = Date.now();
  const vec = await embedQuery(query, pipe);
  const embedMs = Date.now() - t0;

  const t1 = Date.now();
  await coll
    .aggregate([
      {
        $vectorSearch: {
          index: "vector_index",
          path: "embedding",
          queryVector: vec,
          numCandidates: TOP_K * 10,
          limit: TOP_K,
        },
      },
      { $project: { _id: 0, question: 1, score: { $meta: "vectorSearchScore" } } },
    ])
    .toArray();
  const searchMs = Date.now() - t1;

  return { total: Date.now() - t0, embedMs, searchMs };
}

// ──────────────────────────────────────────────
// Concurrency wave: fire `users` queries at once
// ──────────────────────────────────────────────
async function runWave(users, pipe, coll) {
  const promises = Array.from({ length: users }, () =>
    runQuery(randomQuery(), pipe, coll)
  );
  return Promise.all(promises);
}

// ──────────────────────────────────────────────
// Print table row
// ──────────────────────────────────────────────
function row(label, val, unit = "ms", color = chalk.white) {
  const padded = label.padEnd(28);
  console.log(`  ${chalk.gray(padded)} ${color.bold(val + unit)}`);
}

// ──────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────
async function main() {
  const { users, queries } = parseArgs();

  console.log(chalk.bold.blue("\n╔══════════════════════════════════════════════════╗"));
  console.log(chalk.bold.blue("║   FAQ Semantic Search — Performance Benchmark    ║"));
  console.log(chalk.bold.blue("║   Node.js + MongoDB Atlas Vector Search          ║"));
  console.log(chalk.bold.blue("╚══════════════════════════════════════════════════╝\n"));

  console.log(chalk.cyan("Config:"));
  console.log(chalk.gray(`  Concurrent users : ${chalk.white(users)}`));
  console.log(chalk.gray(`  Total queries    : ${chalk.white(queries)}`));
  console.log(chalk.gray(`  Model            : ${chalk.white(MODEL)}`));
  console.log(chalk.gray(`  Top-K            : ${chalk.white(TOP_K)}\n`));

  // Warm up
  process.stdout.write(chalk.cyan("Loading model... "));
  const pipe = await getEmbedder(MODEL);
  console.log(chalk.green("ready"));

  process.stdout.write(chalk.cyan("Connecting to Atlas... "));
  const coll = await getCollection();
  console.log(chalk.green("ready\n"));

  // Warm-up query (exclude from stats)
  await runQuery("warm-up query", pipe, coll).catch(() => {});

  // ── Phase 1: Sequential baseline ──────────
  console.log(chalk.bold("─".repeat(52)));
  console.log(chalk.bold.white("  Phase 1 — Sequential (1 user at a time)"));
  console.log(chalk.bold("─".repeat(52)));

  const seqLatencies = [];
  const barSeq = new cliProgress.SingleBar(
    {
      format: "  {bar} {percentage}% | {value}/{total} queries",
      barCompleteChar: "█",
      barIncompleteChar: "░",
    },
    cliProgress.Presets.shades_classic
  );
  barSeq.start(queries, 0);

  const seqStart = Date.now();
  for (let i = 0; i < queries; i++) {
    const r = await runQuery(randomQuery(), pipe, coll);
    seqLatencies.push(r.total);
    barSeq.increment();
  }
  const seqWall = Date.now() - seqStart;
  barSeq.stop();

  const seqStats = stats(seqLatencies);
  const seqQPS = (queries / (seqWall / 1000)).toFixed(1);

  console.log(chalk.green("\n  ✔ Done\n"));
  row("Total wall time", (seqWall / 1000).toFixed(2), "s");
  row("Throughput", seqQPS, " q/s", chalk.yellow);
  row("Latency — min", seqStats.min);
  row("Latency — mean", seqStats.mean);
  row("Latency — p50", seqStats.p50, "ms", chalk.green);
  row("Latency — p95", seqStats.p95, "ms", chalk.yellow);
  row("Latency — p99", seqStats.p99, "ms", chalk.red);
  row("Latency — max", seqStats.max);

  // ── Phase 2: Concurrent users ──────────────
  console.log("\n" + chalk.bold("─".repeat(52)));
  console.log(chalk.bold.white(`  Phase 2 — Concurrent (${users} users simultaneously)`));
  console.log(chalk.bold("─".repeat(52)));

  const concLatencies = [];
  const waves = Math.ceil(queries / users);
  const barConc = new cliProgress.SingleBar(
    {
      format: "  {bar} {percentage}% | wave {value}/{total}",
      barCompleteChar: "█",
      barIncompleteChar: "░",
    },
    cliProgress.Presets.shades_classic
  );
  barConc.start(waves, 0);

  const concStart = Date.now();
  for (let w = 0; w < waves; w++) {
    const results = await runWave(users, pipe, coll);
    results.forEach((r) => concLatencies.push(r.total));
    barConc.increment();
  }
  const concWall = Date.now() - concStart;
  barConc.stop();

  const concStats = stats(concLatencies);
  const concQPS = (concLatencies.length / (concWall / 1000)).toFixed(1);
  const speedup = (parseFloat(concQPS) / parseFloat(seqQPS)).toFixed(2);

  console.log(chalk.green("\n  ✔ Done\n"));
  row("Total wall time", (concWall / 1000).toFixed(2), "s");
  row("Throughput", concQPS, " q/s", chalk.yellow);
  row("Latency — min", concStats.min);
  row("Latency — mean", concStats.mean);
  row("Latency — p50", concStats.p50, "ms", chalk.green);
  row("Latency — p95", concStats.p95, "ms", chalk.yellow);
  row("Latency — p99", concStats.p99, "ms", chalk.red);
  row("Latency — max", concStats.max);
  row("Speedup vs sequential", speedup, "x", chalk.magenta);

  // ── Summary ────────────────────────────────
  console.log("\n" + chalk.bold("─".repeat(52)));
  console.log(chalk.bold.white("  Summary"));
  console.log(chalk.bold("─".repeat(52)));
  console.log(
    chalk.gray(`\n  Sequential QPS  : `) + chalk.yellow.bold(seqQPS + " q/s")
  );
  console.log(
    chalk.gray(`  Concurrent QPS  : `) + chalk.yellow.bold(concQPS + " q/s")
  );
  console.log(
    chalk.gray(`  Speedup         : `) + chalk.magenta.bold(speedup + "x")
  );

  console.log(chalk.cyan("\n  Why concurrent is faster:"));
  console.log(
    chalk.gray(
      "  Node.js is single-threaded but non-blocking.\n" +
      "  While one query awaits Atlas network I/O, the\n" +
      "  event loop fires the next — no thread overhead.\n" +
      "  MongoDB driver's connection pool (maxPoolSize=20)\n" +
      "  lets multiple Atlas requests travel in parallel.\n"
    )
  );

  await closeDb();
}

main().catch((err) => {
  console.error(chalk.red("\nBenchmark failed:"), err.message);
  process.exit(1);
});
