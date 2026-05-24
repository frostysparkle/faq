# AI Modules — Component Detail & Integration Guide
### (100% Local / Offline Architecture)

> **Audience:** Backend engineers integrating the `RAG_Based_chatbot` and  
> `Semantic_question_checking` modules into the wider MERN application.  
> No external API keys are required at runtime.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Component Map](#2-component-map)
3. [Environment Variables](#3-environment-variables)
4. [Local Dependency Setup](#4-local-dependency-setup)
   - 4.1 Install npm packages
   - 4.2 Install & run Ollama
   - 4.3 Pull Gemma 3 model
   - 4.4 Create Atlas Vector Search indexes
5. [Integration Guide](#5-integration-guide)
   - 5.1 Mounting in Express
   - 5.2 RAG Chatbot endpoints
   - 5.3 Semantic Deduplication endpoints
6. [Isolated Testing Instructions](#6-isolated-testing-instructions)
   - 6.1 Verify local embedding pipeline
   - 6.2 Verify Ollama / Gemma 3
   - 6.3 Seed the QA vector store
   - 6.4 Test RAG chatbot (cURL)
   - 6.5 Test semantic deduplication (cURL)
   - 6.6 All-in-one test script
7. [Key Variable Glossary](#7-key-variable-glossary)
8. [Error Reference](#8-error-reference)

---

## 1. Architecture Overview

```
User Request
     │
     ▼
Express Route
     │
     ▼
embeddingService.js ◄── @huggingface/transformers ◄── ONNX model (local disk)
     │  (in-process, no network)
     ▼
MongoDB Atlas $vectorSearch
     │
     ├─ score ≥ 0.95  ──► Return DB answer verbatim
     │
     ├─ 0.80 ≤ score < 0.95  ──► Ollama HTTP (localhost:11434)
     │                              └─ gemma3:3b (local GPU/CPU)
     │
     └─ score < 0.80  ──► Fallback JSON with UI flags
```

**Zero external dependencies at runtime.** The only outbound call ever made is
the one-time model download from HuggingFace Hub on first startup (or `npm install`).
After that, everything runs on localhost.

---

## 2. Component Map

### `RAG_Based_chatbot/`

| File | Responsibility | Key variables |
|------|---------------|---------------|
| `config/db.js` | Mongoose connection + `QADocument` schema | `QADocument` (question, answer, **embedding** `number[]`, tags) |
| `services/embeddingService.js` | Loads ONNX model once as `_pipeline`; generates embeddings in-process | `_pipeline` (singleton), `rawTensor` (HF Tensor), `pooledVector` (mean-pooled + L2-normed `number[]`) |
| `controllers/chatController.js` | Embed → search → threshold routing → Ollama call | `queryVector`, `topDoc`, `score`, `contextString`, `llmResponse` |
| `routes/chatRoutes.js` | Mounts `POST /`, `POST /index`, `GET /health` | Health endpoint also checks Ollama reachability |

### `Semantic_question_checking/`

| File | Responsibility | Key variables |
|------|---------------|---------------|
| `controllers/semanticController.js` | 7-day window dedup: embed → pre-filtered search → Case A/B/NEW | `incomingVector`, `windowStart`, `topMatch`, `simScore`; `runDeduplicationCheck()` shared by both handlers |
| `routes/semanticRoutes.js` | Mounts `POST /check`, `POST /submit`, `GET /health` | |

### Shared dependency

Both modules import `generateEmbedding` from  
`RAG_Based_chatbot/services/embeddingService.js`.  
The singleton `_pipeline` is loaded **once** at process startup (via `warmUp()`)
and reused across all requests — there is no per-request model load.

---

## 3. Environment Variables

```dotenv
# ── MongoDB ────────────────────────────────────────────────────────────────────
MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/<db>?retryWrites=true&w=majority

# ── Local Embedding Model ──────────────────────────────────────────────────────
# Xenova/all-MiniLM-L6-v2  → 384-dim vectors, ~30 MB, faster  (default)
# Xenova/all-mpnet-base-v2 → 768-dim vectors, ~90 MB, more accurate
EMBEDDING_MODEL=Xenova/all-MiniLM-L6-v2

# ── Ollama (local LLM) ─────────────────────────────────────────────────────────
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=gemma3:3b
OLLAMA_TIMEOUT_MS=60000        # ms before Ollama request is aborted (default 60s)

# ── Atlas Vector Search ────────────────────────────────────────────────────────
ATLAS_VECTOR_INDEX=qa_vector_index     # index for RAG chatbot (qadocuments)
ATLAS_SEMANTIC_INDEX=semantic_index    # index for semantic dedup (questiondocuments)

# ── Thresholds ──────────────────────────────────────────────────────────────────
SEMANTIC_DUPE_THRESHOLD=0.85   # cosine score floor for duplicate detection

# ── App ─────────────────────────────────────────────────────────────────────────
NODE_ENV=development
PORT=5000
```

> **Dimension consistency rule:**  
> The `EMBEDDING_MODEL` determines vector dimensionality.  
> If you change the model after data is indexed you **must** re-index all  
> documents AND update your Atlas index `"dimensions"` value to match.

---

## 4. Local Dependency Setup

### 4.1 Install npm packages

```bash
npm install @huggingface/transformers mongoose express dotenv
```

The `@huggingface/transformers` package bundles an ONNX Runtime for Node.js.
The model weights are downloaded automatically from HuggingFace Hub on first use
and cached at:

```
~/.cache/huggingface/hub/   (Linux/macOS)
%USERPROFILE%\.cache\huggingface\hub\   (Windows)
```

To pre-download (recommended for CI / air-gapped environments):

```bash
node -e "
const { pipeline } = require('@huggingface/transformers');
pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { quantized: true })
  .then(() => { console.log('Model cached.'); process.exit(0); });
"
```

### 4.2 Install & run Ollama

Ollama is a local LLM runtime.  Install it once:

```bash
# macOS
brew install ollama

# Linux (one-liner)
curl -fsSL https://ollama.com/install.sh | sh

# Windows — download installer from https://ollama.com/download
```

Start the Ollama background service:

```bash
ollama serve
# Listens on http://localhost:11434 by default
```

> **Tip:** On macOS, Ollama runs as a menubar app after installation.  
> You do not need to run `ollama serve` manually in that case.

### 4.3 Pull the Gemma 3 model

```bash
ollama pull gemma3:3b
```

This downloads ~2 GB of model weights to `~/.ollama/models/`.  
After the pull, the model is available offline permanently.

Verify it works:

```bash
ollama run gemma3:3b "Hello, are you working?"
# Should print a short reply then exit
```

### 4.4 Create Atlas Vector Search indexes

In **Atlas UI → your cluster → Search → Create Index**, select **JSON editor**
and create the following two indexes.

#### Index 1 — RAG chatbot (`qa_vector_index`)

- **Database/Collection:** `<your-db>/qadocuments`
- **Index name:** `qa_vector_index`

```json
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "embedding": {
        "type": "knnVector",
        "dimensions": 384,
        "similarity": "cosine"
      }
    }
  }
}
```

*(Change `384` to `768` if you switched to `Xenova/all-mpnet-base-v2`.)*

#### Index 2 — Semantic dedup (`semantic_index`)

- **Database/Collection:** `<your-db>/questiondocuments`
- **Index name:** `semantic_index`

```json
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "embedding": {
        "type": "knnVector",
        "dimensions": 384,
        "similarity": "cosine"
      },
      "createdAt": {
        "type": "date"
      }
    }
  }
}
```

> `createdAt` must be mapped as `"type": "date"` to support the `$vectorSearch`
> pre-filter.  This requires **Atlas M10+ cluster** — free-tier M0/M2/M5 clusters
> do **not** support pre-filters.

---

## 5. Integration Guide

### 5.1 Mounting in Express

```js
// server.js
require('dotenv').config();
const express        = require('express');
const { connectDB }  = require('./RAG_Based_chatbot/config/db');
const { warmUp }     = require('./RAG_Based_chatbot/services/embeddingService');
const chatRoutes     = require('./RAG_Based_chatbot/routes/chatRoutes');
const semanticRoutes = require('./Semantic_question_checking/routes/semanticRoutes');

const app = express();
app.use(express.json());

(async () => {
  await connectDB();           // Connect to Atlas
  await warmUp();              // Load ONNX model into memory once
  app.use('/api/chat',     chatRoutes);
  app.use('/api/semantic', semanticRoutes);
  app.listen(process.env.PORT || 5000, () =>
    console.log(`Server on port ${process.env.PORT || 5000}`)
  );
})();
```

---

### 5.2 RAG Chatbot Endpoints

#### `POST /api/chat`

**Request**
```json
{ "query": "How do I reset my password?" }
```

**Response — DIRECT_MATCH** `(score ≥ 0.95)`
```json
{
  "success": true,
  "route": "DIRECT_MATCH",
  "score": 0.974,
  "query": "How do I reset my password?",
  "answer": "Go to Settings → Account → Reset Password.",
  "documentId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "tags": ["account", "security"]
}
```

**Response — RAG_GENERATION** `(0.80 ≤ score < 0.95)`
```json
{
  "success": true,
  "route": "RAG_GENERATION",
  "score": 0.872,
  "query": "How do I reset my password?",
  "answer": "Based on the available information, you can reset your password by navigating to your account settings...",
  "sourceDocumentId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "tags": ["account"]
}
```

**Response — FALLBACK** `(score < 0.80)`
```json
{
  "success": true,
  "route": "FALLBACK",
  "score": 0.38,
  "query": "How do I reset my password?",
  "answer": null,
  "message": "I'm sorry, I couldn't find a confident answer to your question.",
  "showEscalateButton": true,
  "showAskCommunityButton": true
}
```

---

#### `POST /api/chat/index` — Seed a Q&A document

```json
// Request
{
  "question": "How do I cancel my subscription?",
  "answer": "Go to Billing → Subscriptions → Cancel Plan.",
  "tags": ["billing"]
}

// Response
{
  "success": true,
  "documentId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "embeddingDims": 384
}
```

---

#### `GET /api/chat/health`

```json
{
  "success": true,
  "module": "RAG_Based_chatbot",
  "status": "operational",
  "ollama": {
    "status": "reachable",
    "configuredModel": "gemma3:3b",
    "modelLoaded": true,
    "availableModels": ["gemma3:3b", "llama3.2:3b"]
  },
  "ts": "2025-01-15T10:00:00.000Z"
}
```

> Use this endpoint to verify both the Node process and Ollama are healthy  
> before running end-to-end tests.

---

### 5.3 Semantic Deduplication Endpoints

#### `POST /api/semantic/check` — Read-only

**Request**
```json
{ "question": "What is your refund policy?" }
```

**Response — NEW**
```json
{
  "success": true,
  "classification": "NEW",
  "message": "No similar question found in the last 7 days. Proceed to post.",
  "question": "What is your refund policy?",
  "simScore": 0.58,
  "proceed": true
}
```

**Response — DUPLICATE_ANSWERED**
```json
{
  "success": true,
  "classification": "DUPLICATE_ANSWERED",
  "message": "A similar question was already answered.",
  "simScore": 0.93,
  "historicalId": "64f1a2b3c4d5e6f7a8b9c0d2",
  "historicalQuestion": "What's your return and refund policy?",
  "answer": "We offer a 30-day full refund on all orders.",
  "answeredAt": "2025-01-10T14:23:00.000Z"
}
```

**Response — DUPLICATE_UNANSWERED**
```json
{
  "success": true,
  "classification": "DUPLICATE_UNANSWERED",
  "message": "Your question has already been asked and is awaiting an answer.",
  "simScore": 0.89,
  "historicalId": "64f1a2b3c4d5e6f7a8b9c0d3",
  "historicalQuestion": "What's your return and refund policy?",
  "askedAt": "2025-01-12T09:00:00.000Z"
}
```

---

#### `POST /api/semantic/submit` — Check + persist

Same request shape as `/check` (add optional `"authorId"`).  
Returns duplicate responses from above, plus — when NEW:

```json
{
  "success": true,
  "created": true,
  "classification": "NEW",
  "message": "Your question has been posted successfully.",
  "documentId": "64f1a2b3c4d5e6f7a8b9c0d4"
}
```

Duplicate responses gain an extra `"created": false` field.

---

## 6. Isolated Testing Instructions

### 6.1 Verify local embedding pipeline

Create `scripts/test-embedding.js`:

```js
require('dotenv').config();
const { generateEmbedding, warmUp, MODEL_ID } = require('./RAG_Based_chatbot/services/embeddingService');

(async () => {
  console.log('Model ID:', MODEL_ID);
  await warmUp();

  const vec = await generateEmbedding('How do I reset my password?');
  console.log('Embedding dims:', vec.length);       // 384 (MiniLM) or 768 (mpnet)
  console.log('First 5 values:', vec.slice(0, 5));  // small floats near 0
  console.log('Type:', typeof vec[0]);              // "number"

  // Verify normalisation — L2 norm should be ≈ 1.0
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
  console.log('L2 norm (should be ≈ 1.0):', norm.toFixed(6));
})();
```

```bash
node scripts/test-embedding.js
```

Expected output:
```
[EmbeddingService] Loading local model: Xenova/all-MiniLM-L6-v2 …
[EmbeddingService] Pipeline warm-up complete.
Embedding dims: 384
First 5 values: [ 0.0234, -0.0412, 0.1183, ... ]
Type: number
L2 norm (should be ≈ 1.0): 1.000000
```

---

### 6.2 Verify Ollama / Gemma 3

```bash
# 1. Check Ollama is running
curl http://localhost:11434/api/tags
# Expected: JSON list of installed models

# 2. Test generation directly against Ollama
curl -s http://localhost:11434/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemma3:3b",
    "stream": false,
    "messages": [
      { "role": "user", "content": "Reply with exactly three words." }
    ]
  }' | jq .message.content
# Expected: a 3-word string
```

If `curl` times out, run `ollama serve` in a separate terminal first.

---

### 6.3 Seed the QA vector store

Start your Express server, then run:

```bash
# Index a Q&A pair (embedding generated locally, stored in Atlas)
curl -s -X POST http://localhost:5000/api/chat/index \
  -H "Content-Type: application/json" \
  -d '{
    "question": "How do I reset my password?",
    "answer":   "Navigate to Settings → Account → Reset Password and follow the emailed link.",
    "tags":     ["account", "security"]
  }' | jq .

# Seed several more pairs to exercise all similarity bands
curl -s -X POST http://localhost:5000/api/chat/index \
  -H "Content-Type: application/json" \
  -d '{"question":"How do I cancel my subscription?","answer":"Go to Billing → Cancel Plan.","tags":["billing"]}' | jq .

curl -s -X POST http://localhost:5000/api/chat/index \
  -H "Content-Type: application/json" \
  -d '{"question":"Where can I download my invoice?","answer":"Billing → Invoices → Download PDF.","tags":["billing"]}' | jq .
```

---

### 6.4 Test RAG chatbot (cURL)

```bash
# ── DIRECT_MATCH (exact phrasing → score ≥ 0.95) ──────────────────────────
curl -s -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "How do I reset my password?"}' | jq '{route,score,answer}'

# ── RAG_GENERATION (rephrase → 0.80 ≤ score < 0.95) ───────────────────────
curl -s -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "I forgot my login credentials, what steps should I follow?"}' | jq '{route,score,answer}'

# ── FALLBACK (unrelated topic → score < 0.80) ─────────────────────────────
curl -s -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "What is the boiling point of nitrogen?"}' | jq '{route,score,showEscalateButton}'

# ── Health check (shows Ollama status) ────────────────────────────────────
curl -s http://localhost:5000/api/chat/health | jq .
```

**What to verify:**

| Test | Expected `route` | Expected `score` range | LLM called? |
|------|-----------------|----------------------|-------------|
| Exact phrasing | `DIRECT_MATCH` | ≥ 0.95 | No |
| Rephrased | `RAG_GENERATION` | 0.80–0.94 | Yes (Ollama) |
| Unrelated | `FALLBACK` | < 0.80 | No |

---

### 6.5 Test semantic deduplication (cURL)

```bash
# ── Step 1: Submit a new question ─────────────────────────────────────────
RESP=$(curl -s -X POST http://localhost:5000/api/semantic/submit \
  -H "Content-Type: application/json" \
  -d '{"question": "What is your refund policy?"}')
echo $RESP | jq .
# Expected: classification = "NEW", created = true
DOC_ID=$(echo $RESP | jq -r .documentId)

# ── Step 2: Check a semantically similar question ─────────────────────────
curl -s -X POST http://localhost:5000/api/semantic/check \
  -H "Content-Type: application/json" \
  -d '{"question": "How does your return and refund process work?"}' | jq '{classification,simScore,historicalQuestion}'
# Expected: classification = "DUPLICATE_UNANSWERED"

# ── Step 3: Mark the original as answered (run in mongosh / Atlas UI) ─────
# db.questiondocuments.updateOne(
#   { _id: ObjectId("<DOC_ID>") },
#   { $set: { answered: true, answer: "We offer 30-day full refunds on all orders." } }
# )

# ── Step 4: Re-check (should now see answered = true) ─────────────────────
curl -s -X POST http://localhost:5000/api/semantic/check \
  -H "Content-Type: application/json" \
  -d '{"question": "How does your return and refund process work?"}' | jq '{classification,answer}'
# Expected: classification = "DUPLICATE_ANSWERED"

# ── Step 5: Completely unrelated question ─────────────────────────────────
curl -s -X POST http://localhost:5000/api/semantic/check \
  -H "Content-Type: application/json" \
  -d '{"question": "How do I change my profile picture?"}' | jq '{classification,proceed}'
# Expected: classification = "NEW", proceed = true
```

---

### 6.6 All-in-one test script

Save as `scripts/test-all.js` and run with `node scripts/test-all.js`  
(requires the Express server to be running):

```js
require('dotenv').config();

const BASE = `http://localhost:${process.env.PORT || 5000}`;
const post = async (path, body) => {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return r.json();
};
const get = async (path) => (await fetch(`${BASE}${path}`)).json();

const sep = (label) => console.log(`\n${'─'.repeat(60)}\n▶ ${label}\n${'─'.repeat(60)}`);

(async () => {
  sep('Health — RAG Chatbot (checks Ollama status)');
  console.log(JSON.stringify(await get('/api/chat/health'), null, 2));

  sep('Health — Semantic module');
  console.log(JSON.stringify(await get('/api/semantic/health'), null, 2));

  sep('Seed Q&A document');
  console.log(await post('/api/chat/index', {
    question: 'How do I cancel my subscription?',
    answer:   'Go to Billing → Subscriptions → Cancel Plan.',
    tags:     ['billing'],
  }));

  sep('RAG Chat — direct match (exact phrase)');
  const dm = await post('/api/chat', { query: 'How do I cancel my subscription?' });
  console.log({ route: dm.route, score: dm.score?.toFixed(4), answer: dm.answer });

  sep('RAG Chat — RAG generation (rephrased)');
  const rag = await post('/api/chat', { query: 'I want to stop my monthly plan, what do I do?' });
  console.log({ route: rag.route, score: rag.score?.toFixed(4), answer: rag.answer?.slice(0, 120) });

  sep('RAG Chat — fallback (unrelated)');
  const fb = await post('/api/chat', { query: 'What is the capital of Iceland?' });
  console.log({ route: fb.route, score: fb.score?.toFixed(4), showEscalateButton: fb.showEscalateButton });

  sep('Semantic Submit — new question');
  const sq = await post('/api/semantic/submit', { question: 'Can I get a refund after 30 days?' });
  console.log(sq);

  sep('Semantic Check — similar question (should be DUPE)');
  const sc = await post('/api/semantic/check', { question: 'Is it possible to get my money back after a month?' });
  console.log({ classification: sc.classification, simScore: sc.simScore?.toFixed(4) });

  sep('Semantic Check — unrelated question (should be NEW)');
  const sn = await post('/api/semantic/check', { question: 'How do I upload a profile photo?' });
  console.log({ classification: sn.classification, proceed: sn.proceed });

  console.log('\n✅ All tests complete.');
})().catch(console.error);
```

---

## 7. Key Variable Glossary

| Variable | Type | File | Description |
|----------|------|------|-------------|
| `_pipeline` | `FeatureExtractionPipeline` | `embeddingService.js` | ONNX model singleton; loaded once at `warmUp()`, reused forever |
| `rawTensor` | `Tensor` | `embeddingService.js` | HF pipeline output before pooling; shape `[1, tokenCount, hiddenDim]` |
| `pooledVector` | `number[]` | `embeddingService.js` | Mean-pooled + L2-normalised sentence vector; stored as `QADocument.embedding` |
| `queryVector` | `number[]` | `chatController.js` | Embedding of the incoming user query; passed to `$vectorSearch.queryVector` |
| `topDoc` | `QADocument` | `chatController.js` | Highest-scoring Atlas result; fields: `question`, `answer`, `score`, `tags` |
| `score` | `number` | `chatController.js` | `$meta: 'vectorSearchScore'` — cosine similarity ∈ [0,1] |
| `contextString` | `string` | `chatController.js` | `"Q: …\nA: …"` block injected into Ollama system prompt |
| `llmResponse` | `string` | `chatController.js` | `data.message.content` from Ollama `/api/chat` (non-streaming) |
| `incomingVector` | `number[]` | `semanticController.js` | Local embedding of submitted question |
| `windowStart` | `Date` | `semanticController.js` | `new Date(Date.now() - 7 * 86400000)` — pre-filter lower bound |
| `topMatch` | `QuestionDocument` | `semanticController.js` | Best match in 7-day window |
| `simScore` | `number` | `semanticController.js` | Cosine similarity of `topMatch` vs `incomingVector` |

---

## 8. Error Reference

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `ECONNREFUSED localhost:11434` | Ollama not running | Run `ollama serve` in a separate terminal |
| `model "gemma3:3b" not found` | Model not pulled | Run `ollama pull gemma3:3b` |
| Ollama request timed out | Slow CPU inference | Increase `OLLAMA_TIMEOUT_MS`; consider GPU |
| `Pipeline returned empty vector` | Blank input string | Ensure `.trim()` on all input before calling `generateEmbedding` |
| `$vectorSearch failed` | Index missing or wrong name | Verify index name matches `ATLAS_VECTOR_INDEX` / `ATLAS_SEMANTIC_INDEX` |
| `Pre-filter not supported` | Free-tier Atlas cluster | Upgrade to M10+ (required for `filter` in `$vectorSearch`) |
| Vector dim mismatch in Atlas | Model changed after indexing | Re-index all documents; update Atlas index `dimensions` to match new model |
| First request is slow (~5–10s) | ONNX model cold start | Call `warmUp()` at server startup before accepting traffic |
