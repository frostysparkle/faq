'use strict';

/**
 * chatRoutes.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Express Router for the RAG chatbot module.
 *
 * Mount in server.js:
 *   const chatRoutes = require('./RAG_Based_chatbot/routes/chatRoutes');
 *   app.use('/api/chat', chatRoutes);
 *
 * Endpoints:
 *   POST /api/chat          — Main RAG query (embed → search → route → respond)
 *   POST /api/chat/index    — Seed a Q&A pair (generates & stores embedding)
 *   GET  /api/chat/health   — Liveness check (also confirms Ollama is reachable)
 */

const express               = require('express');
const { handleChat }        = require('../controllers/chatController');
const { QADocument }        = require('../config/db');
const { generateEmbedding } = require('../services/embeddingService');

const router = express.Router();

const OLLAMA_BASE_URL = (process.env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(/\/$/, '');
const OLLAMA_MODEL    = process.env.OLLAMA_MODEL    || 'gemma3:3b';

// ── POST /api/chat ────────────────────────────────────────────────────────────

router.post('/', handleChat);

// ── POST /api/chat/index ──────────────────────────────────────────────────────

/**
 * Seeds a new Q&A document into the vector store.
 * The embedding is generated locally — no network call needed.
 *
 * Body:
 *   { "question": string, "answer": string, "tags"?: string[] }
 *
 * Response:
 *   { success: true, documentId: ObjectId, embeddingDims: number }
 *
 * Restrict to admin middleware in production.
 */
router.post('/index', async (req, res) => {
  const { question, answer, tags = [] } = req.body;

  if (!question || !answer) {
    return res.status(400).json({
      success: false,
      error:   'Both "question" and "answer" fields are required.',
    });
  }

  try {
    // Embedding generated locally — no HF API call
    const embedding = await generateEmbedding(question.trim());

    const doc = await QADocument.create({
      question: question.trim(),
      answer:   answer.trim(),
      embedding,
      tags,
    });

    return res.status(201).json({
      success:       true,
      documentId:    doc._id,
      embeddingDims: embedding.length,
    });
  } catch (err) {
    console.error('[chatRoutes /index]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/chat/health ──────────────────────────────────────────────────────

/**
 * Liveness + dependency check.
 * Pings the local Ollama instance and reports its status.
 */
router.get('/health', async (_req, res) => {
  let ollamaStatus = 'unknown';
  let ollamaModels  = [];

  try {
    const r = await fetch(`${OLLAMA_BASE_URL}/api/tags`, { signal: AbortSignal.timeout(3000) });
    if (r.ok) {
      const data = await r.json();
      ollamaModels  = (data.models || []).map((m) => m.name);
      ollamaStatus  = 'reachable';
    } else {
      ollamaStatus = `http_error_${r.status}`;
    }
  } catch {
    ollamaStatus = 'unreachable — run: ollama serve';
  }

  const modelLoaded = ollamaModels.includes(OLLAMA_MODEL);

  return res.status(200).json({
    success:      true,
    module:       'RAG_Based_chatbot',
    status:       'operational',
    ollama:       { status: ollamaStatus, configuredModel: OLLAMA_MODEL, modelLoaded, availableModels: ollamaModels },
    ts:           new Date().toISOString(),
  });
});

module.exports = router;
