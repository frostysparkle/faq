'use strict';

/**
 * semanticRoutes.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Express Router for the semantic deduplication module.
 *
 * Mount in server.js:
 *   const semanticRoutes = require('./Semantic_question_checking/routes/semanticRoutes');
 *   app.use('/api/semantic', semanticRoutes);
 *
 * Endpoints:
 *   POST /api/semantic/check    — Read-only duplicate check (no DB write)
 *   POST /api/semantic/submit   — Full flow: check + persist if NEW
 *   GET  /api/semantic/health   — Liveness check for this module
 */

const express = require('express');
const {
  checkQuestion,
  submitQuestion,
} = require('../controllers/semanticController');

const router = express.Router();

// ── POST /api/semantic/check ──────────────────────────────────────────────────
/**
 * Non-destructive.  Runs the 7-day sliding window check and returns
 * NEW / DUPLICATE_ANSWERED / DUPLICATE_UNANSWERED without writing anything.
 *
 * Body:     { "question": string }
 */
router.post('/check', checkQuestion);

// ── POST /api/semantic/submit ─────────────────────────────────────────────────
/**
 * Full submit flow.  Duplicate-checks first; only persists (with embedding)
 * when classification === "NEW".
 *
 * Body:     { "question": string, "authorId"?: string }
 */
router.post('/submit', submitQuestion);

// ── GET /api/semantic/health ──────────────────────────────────────────────────
router.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    module:  'Semantic_question_checking',
    status:  'operational',
    ts:      new Date().toISOString(),
  });
});

module.exports = router;
