'use strict';

/**
 * chatController.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Core RAG chatbot handler.  Entirely offline — no external cloud calls.
 *
 * Request flow:
 *   1. Embed user query locally via embeddingService (ONNX model in-process).
 *   2. Run Atlas $vectorSearch to retrieve the closest Q&A document.
 *   3. Route on cosine similarity score S:
 *        S ≥ 0.95   → DIRECT_MATCH  : return stored answer verbatim, skip LLM.
 *        0.80 ≤ S < 0.95 → RAG_GENERATION : call local Ollama (gemma3:3b).
 *        S < 0.80   → FALLBACK      : return UI flags, no LLM call.
 *
 * Environment variables consumed:
 *   MONGO_URI           — MongoDB Atlas URI (consumed via db.js / connectDB)
 *   EMBEDDING_MODEL     — Local ONNX model ID (consumed via embeddingService)
 *   ATLAS_VECTOR_INDEX  — Atlas Search index name (default: "qa_vector_index")
 *   OLLAMA_BASE_URL     — Ollama HTTP base URL  (default: "http://localhost:11434")
 *   OLLAMA_MODEL        — Ollama model tag      (default: "gemma3:3b")
 *   OLLAMA_TIMEOUT_MS   — Ollama request timeout in ms (default: 60000)
 *
 * Key variable glossary (mirrored in component_detail.md §7):
 *   queryVector   → number[]  — Local embedding of the user query
 *   topDoc        → object    — Highest-scoring QADocument from Atlas
 *   score         → number    — Cosine similarity ∈ [0,1] from $vectorSearchScore
 *   contextString → string    — "Q: …\nA: …" block injected into Ollama prompt
 *   llmResponse   → string    — Trimmed text from Ollama response
 */

const { QADocument }        = require('../config/db');
const { generateEmbedding } = require('../services/embeddingService');

// ── Thresholds ────────────────────────────────────────────────────────────────

const SCORE_DIRECT_MATCH  = 0.95; // S ≥ this → verbatim answer, no LLM
const SCORE_RAG_THRESHOLD = 0.80; // S ≥ this (but < DIRECT) → Ollama RAG
                                   // S < 0.80 → fallback buttons

// ── Ollama config ─────────────────────────────────────────────────────────────

const OLLAMA_BASE_URL  = (process.env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(/\/$/, '');
const OLLAMA_MODEL     = process.env.OLLAMA_MODEL    || 'gemma3:3b';
const OLLAMA_TIMEOUT   = parseInt(process.env.OLLAMA_TIMEOUT_MS || '60000', 10);

// ── Atlas config ──────────────────────────────────────────────────────────────

const ATLAS_VECTOR_INDEX = process.env.ATLAS_VECTOR_INDEX || 'qa_vector_index';

// ── POST /api/chat ────────────────────────────────────────────────────────────

/**
 * Main RAG endpoint handler.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 */
const handleChat = async (req, res) => {
  const { query } = req.body;

  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({
      success: false,
      error:   'Request body must include a non-empty "query" string.',
    });
  }

  const sanitisedQuery = query.trim();

  try {
    // ── Step 1: Local embedding ───────────────────────────────────────────
    /**
     * queryVector: number[]
     * Produced entirely in-process by the ONNX model loaded in embeddingService.
     * No network call is made at this step.
     */
    const queryVector = await generateEmbedding(sanitisedQuery);

    // ── Step 2: Atlas Vector Search ───────────────────────────────────────
    /**
     * $vectorSearch finds the nearest stored embedding using the HNSW index.
     *
     * topDoc  — best matching QADocument (undefined if collection is empty)
     * score   — cosine similarity returned by $meta: 'vectorSearchScore'
     */
    const [searchResult] = await QADocument.aggregate([
      {
        $vectorSearch: {
          index:         ATLAS_VECTOR_INDEX,
          path:          'embedding',
          queryVector,
          numCandidates: 100, // EF_SEARCH equivalent; increase for better recall
          limit:         1,
        },
      },
      {
        $project: {
          question: 1,
          answer:   1,
          tags:     1,
          score: { $meta: 'vectorSearchScore' },
        },
      },
    ]);

    // Empty collection fallback
    if (!searchResult) {
      return res.status(200).json(buildFallbackResponse(sanitisedQuery, null));
    }

    const topDoc = searchResult;
    /**
     * score: number
     * Cosine similarity between queryVector and topDoc.embedding.
     * Range: [0, 1] — 1.0 means identical vectors.
     */
    const score = topDoc.score;

    console.log(`[ChatController] query="${sanitisedQuery}" | score=${score.toFixed(4)} | route=${routeLabel(score)}`);

    // ── Step 3: Similarity-based routing ─────────────────────────────────

    // ── BRANCH A: Direct Match ────────────────────────────────────────────
    if (score >= SCORE_DIRECT_MATCH) {
      return res.status(200).json({
        success:    true,
        route:      'DIRECT_MATCH',
        score,
        query:      sanitisedQuery,
        answer:     topDoc.answer, // verbatim from DB — zero LLM calls
        documentId: topDoc._id,
        tags:       topDoc.tags,
      });
    }

    // ── BRANCH B: RAG Generation via local Ollama ────────────────────────
    if (score >= SCORE_RAG_THRESHOLD) {
      /**
       * contextString: string
       * Human-readable context block passed to Gemma 3 inside the prompt.
       * Format keeps the LLM grounded in retrieved knowledge.
       */
      const contextString = `Q: ${topDoc.question}\nA: ${topDoc.answer}`;

      const llmResponse = await callOllama(sanitisedQuery, contextString);

      return res.status(200).json({
        success:          true,
        route:            'RAG_GENERATION',
        score,
        query:            sanitisedQuery,
        answer:           llmResponse,
        sourceDocumentId: topDoc._id,
        tags:             topDoc.tags,
      });
    }

    // ── BRANCH C: Fallback ────────────────────────────────────────────────
    return res.status(200).json(buildFallbackResponse(sanitisedQuery, score));

  } catch (err) {
    console.error('[ChatController] Unhandled error:', err.message);
    return res.status(500).json({
      success: false,
      error:   'An internal error occurred. Please try again later.',
      detail:  process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
};

// ── Ollama helper ─────────────────────────────────────────────────────────────

/**
 * Sends a RAG prompt to the locally running Ollama instance.
 *
 * Ollama must be running:  ollama serve
 * Model must be pulled:    ollama pull gemma3:3b
 *
 * Uses the /api/chat endpoint with stream: false so we get a single JSON
 * response rather than a newline-delimited stream.
 *
 * @param   {string} userQuery     — Original user question.
 * @param   {string} contextString — Retrieved Q&A context to ground the answer.
 * @returns {Promise<string>}       — llmResponse: trimmed generated text.
 */
const callOllama = async (userQuery, contextString) => {
  const endpoint = `${OLLAMA_BASE_URL}/api/chat`;

  const systemPrompt =
    'You are a precise, helpful assistant. ' +
    'Answer the user\'s question using ONLY the provided context. ' +
    'If the context does not fully address the question, acknowledge the gap honestly. ' +
    'Do not fabricate information outside the context.';

  const userMessage =
    `Context:\n${contextString}\n\nQuestion: ${userQuery}\n\nAnswer:`;

  const body = JSON.stringify({
    model:  OLLAMA_MODEL,
    stream: false, // single JSON object response; no SSE streaming
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userMessage  },
    ],
    options: {
      temperature: 0.3,   // Low temp → factual, consistent outputs
      num_predict: 512,   // Max tokens to generate
    },
  });

  // AbortController provides a clean timeout for slow local inference
  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT);

  let response;
  try {
    response = await fetch(endpoint, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal:  controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(
        `[ChatController] Ollama request timed out after ${OLLAMA_TIMEOUT}ms. ` +
        'Ensure Ollama is running ("ollama serve") and the model is loaded.'
      );
    }
    throw new Error(
      `[ChatController] Could not reach Ollama at ${endpoint}. ` +
      'Is "ollama serve" running? — ' + err.message
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(
      `[ChatController] Ollama HTTP ${response.status}: ${errBody}`
    );
  }

  const data = await response.json();

  /**
   * llmResponse: string
   * Ollama /api/chat (non-streaming) returns:
   *   { message: { role: 'assistant', content: '…' }, done: true, … }
   */
  const llmResponse = data?.message?.content?.trim();

  if (!llmResponse) {
    throw new Error('[ChatController] Ollama returned an empty response body.');
  }

  return llmResponse;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Builds the FALLBACK payload (S < 0.80).
 *
 * Front-end flags consumed by the React UI:
 *   showEscalateButton     → render "Escalate to support" button
 *   showAskCommunityButton → render "Ask the community" button
 */
const buildFallbackResponse = (query, score) => ({
  success:               true,
  route:                 'FALLBACK',
  score,
  query,
  answer:                null,
  message:               "I'm sorry, I couldn't find a confident answer to your question.",
  showEscalateButton:    true,
  showAskCommunityButton: true,
});

/** Human-readable route label for console logging. */
const routeLabel = (score) => {
  if (score >= SCORE_DIRECT_MATCH)  return 'DIRECT_MATCH';
  if (score >= SCORE_RAG_THRESHOLD) return 'RAG_GENERATION';
  return 'FALLBACK';
};

module.exports = { handleChat };
