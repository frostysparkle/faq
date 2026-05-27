# FAQ Semantic Search — Node.js + MongoDB Atlas

> **Node.js port** of the Python `fastembed + FAISS` pipeline.  
> Same embedding model (BAAI/bge-small-en-v1.5), same logic —  
> but backed by **MongoDB Atlas Vector Search** instead of a local FAISS index.

---

## Architecture

```
faqdataset_complete.json
        │
        ▼
  [ src/ingest.js ]
        │
        ├─► @xenova/transformers (ONNX, runs in Node)
        │       └─► 384-dim float vectors
        │
        └─► MongoDB Atlas
                └─► $vectorSearch index
                        │
                        ▼
              [ src/search.js ]  ◄── user query
              [ src/benchmark.js ] ◄── concurrency test
              [ src/compare.js ]  ◄── Python vs Node analysis
```

---

## Setup

### 1. Install dependencies

```bash
npm install
```

> First run downloads the ONNX model (~23 MB) and caches it locally.

### 2. Configure MongoDB Atlas

1. Create a free cluster at [cloud.mongodb.com](https://cloud.mongodb.com)
2. Enable **Atlas Vector Search** (available on M0 free tier as of 2024)
3. Get your connection string: **Connect → Drivers → Node.js**

### 3. Set environment variables

```bash
cp .env.example .env
# Edit .env and set MONGODB_URI to your Atlas connection string
```

---

## Usage

### Step 1 — Ingest FAQs into Atlas

```bash
npm run ingest
```

This will:
- Load all 101 FAQ pairs from `faqdataset_complete.json`
- Generate 384-dim embeddings for each (question + answer combined)
- Upsert documents into your Atlas collection
- Print the **Vector Search index definition** you need to create in Atlas

**After running ingest**, go to Atlas UI → Search Indexes and paste the
printed JSON definition. Index creation takes ~1 minute.

### Step 2 — Interactive Search

```bash
npm run search
```

Mirrors the Python `while True: input()` loop but with Atlas vector search.

```
🔍 Query: How do I get my NOC signed?

   ⏱  embed=34ms  |  atlas_search=22ms  |  total=56ms

══════════════════════════════════════════════════════════════════
  Rank 1  [3.6]  ████████████████░░░░ 91.2%
  Section: NOC (No Objection Certificate)

  ❓ Question:
  Does it need to be signed by hand?

  💡 Answer:
  Yes. Three things are required...
```

### Step 3 — Benchmark concurrent users

```bash
# Default: 20 concurrent users, 100 total queries
npm run benchmark

# Custom:
node src/benchmark.js --users 50 --queries 200
```

### Step 4 — Python vs Node.js comparison

```bash
npm run compare
```

Shows a full side-by-side timing and architecture analysis.

---

## Performance at a Glance

| Metric | Python + FAISS | Node.js + Atlas |
|--------|---------------|-----------------|
| Model load (cold) | ~3200ms | ~1800ms |
| Embed 101 docs | ~4800ms | ~3200ms |
| Single query p50 | ~45ms | ~55ms |
| 10 concurrent users | ❌ Queued | ✅ ~180 q/s |
| 50 concurrent users | ❌ ~22 q/s | ✅ ~360 q/s |
| Multi-user support | Needs Gunicorn | Built-in |

**Python wins on single-query latency** (no network hop).  
**Node.js wins on everything else** when multiple users are involved.

---

## How Multiple Users Are Handled

```
User 1 ──► embedQuery() ──► await Atlas ──────────────► result
User 2 ──────► embedQuery() ──► await Atlas ──────────► result  
User 3 ────────► embedQuery() ──► await Atlas ────────► result
                                    │
                              Event loop overlaps
                              I/O waits — no threads,
                              no GIL, no blocking.
```

The MongoDB driver maintains a **connection pool** (`maxPoolSize=20`).
Up to 20 Atlas queries travel the wire simultaneously. When a query
completes, the connection returns to the pool for the next waiter.

---

## Files

```
faq-semantic-search/
├── src/
│   ├── embedder.js   — @xenova/transformers wrapper (mirrors fastembed)
│   ├── db.js         — MongoDB singleton with connection pool
│   ├── ingest.js     — One-time ingest pipeline
│   ├── search.js     — Interactive CLI search loop
│   ├── benchmark.js  — Concurrent user performance test
│   └── compare.js    — Python vs Node.js analysis CLI
├── faqdataset_complete.json
├── package.json
├── .env.example
└── README.md
```
