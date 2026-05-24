'use strict';

/**
 * semanticController.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Automated 7-day deduplication window for incoming community questions.
 * Entirely offline — embeddings are generated locally via the shared
 * embeddingService singleton.
 *
 * Logic:
 *   1. Generate embedding for the incoming question locally (no API call).
 *   2. Run Atlas $vectorSearch with a pre-filter: createdAt ≥ (now − 7 days).
 *      → Documents older than 7 days are completely invisible to the search.
 *   3. If top similarity score S ≥ DUPE_THRESHOLD (default 0.85):
 *        Case A  answered: true   → return historical Q + its answer.
 *        Case B  answered: false  → return "awaiting answer" message.
 *   4. If S < DUPE_THRESHOLD, or no docs exist in the window → NEW.
 *
 * Environment variables consumed:
 *   MONGO_URI                 — MongoDB Atlas URI (via Mongoose)
 *   EMBEDDING_MODEL           — Local ONNX model (via embeddingService)
 *   ATLAS_SEMANTIC_INDEX      — Atlas Vector Search index name
 *                               (default: "semantic_index")
 *   SEMANTIC_DUPE_THRESHOLD   — Min cosine similarity to trigger duplicate
 *                               detection (default: 0.85)
 *
 * Key variable glossary (mirrored in component_detail.md §7):
 *   incomingVector → number[]  — Local embedding of the submitted question
 *   windowStart    → Date      — now − 7 days; pre-filter lower bound
 *   topMatch       → object    — Best matching QuestionDocument in the window
 *   simScore       → number    — Cosine similarity ∈ [0,1] for topMatch
 *
 * Atlas Vector Search index definition for this collection:
 *   Index name : semantic_index          (must match ATLAS_SEMANTIC_INDEX)
 *   Collection : questiondocuments       (Mongoose auto-pluralises)
 *   JSON:
 *   {
 *     "mappings": {
 *       "dynamic": false,
 *       "fields": {
 *         "embedding": {
 *           "type": "knnVector",
 *           "dimensions": 384,    ← match your EMBEDDING_MODEL dims
 *           "similarity": "cosine"
 *         },
 *         "createdAt": { "type": "date" }   ← required for pre-filter
 *       }
 *     }
 *   }
 *
 * ⚠  Pre-filter on createdAt requires Atlas M10+ cluster.
 *    M0/M2/M5 free-tier clusters do NOT support $vectorSearch pre-filters.
 */

const mongoose              = require('mongoose');
const { generateEmbedding } = require('../../RAG_Based_chatbot/services/embeddingService');

// ── QuestionDocument schema ───────────────────────────────────────────────────

/**
 * Represents a community question posted by a user.
 *
 * answered  → false until a valid answer is accepted/posted by a moderator.
 * answer    → populated when answered = true.
 * embedding → 384/768-dim float array generated locally at submission time.
 * createdAt → auto-set by Mongoose; used as the $vectorSearch pre-filter key.
 */
const questionSchema = new mongoose.Schema(
  {
    question:  { type: String, required: true, trim: true },
    answer:    { type: String, default: null },
    answered:  { type: Boolean, default: false, index: true },
    authorId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    embedding: { type: [Number], required: true },
  },
  { timestamps: true } // adds createdAt + updatedAt
);

// Re-use model if already compiled (hot-reload safety in development)
const QuestionDocument =
  mongoose.models.QuestionDocument ||
  mongoose.model('QuestionDocument', questionSchema);

// ── Constants ─────────────────────────────────────────────────────────────────

const ATLAS_SEMANTIC_INDEX = process.env.ATLAS_SEMANTIC_INDEX    || 'semantic_index';
const DUPE_THRESHOLD       = parseFloat(process.env.SEMANTIC_DUPE_THRESHOLD || '0.85');
const WINDOW_DAYS          = 7;
const WINDOW_MS            = WINDOW_DAYS * 24 * 60 * 60 * 1000;

// ── checkQuestion ─────────────────────────────────────────────────────────────

/**
 * POST /api/semantic/check
 *
 * Read-only duplicate check — no documents are written.
 * Use for real-time UI validation as a user types their question.
 *
 * Body:     { "question": string }
 * Response: NEW | DUPLICATE_ANSWERED | DUPLICATE_UNANSWERED
 */
const checkQuestion = async (req, res) => {
  const { question } = req.body;

  if (!question || typeof question !== 'string' || !question.trim()) {
    return res.status(400).json({
      success: false,
      error:   'Request body must include a non-empty "question" string.',
    });
  }

  try {
    const result = await runDeduplicationCheck(question.trim());
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    console.error('[SemanticController] checkQuestion error:', err.message);
    return res.status(500).json({
      success: false,
      error:   'An internal error occurred during semantic checking.',
      detail:  process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
};

// ── submitQuestion ────────────────────────────────────────────────────────────

/**
 * POST /api/semantic/submit
 *
 * Full flow: duplicate-check → if NEW, persist to DB with embedding.
 * This is the endpoint the frontend calls when the user actually submits.
 *
 * Body:     { "question": string, "authorId"?: string }
 * Response: duplicate info (created: false) OR new doc info (created: true)
 */
const submitQuestion = async (req, res) => {
  const { question, authorId } = req.body;

  if (!question || typeof question !== 'string' || !question.trim()) {
    return res.status(400).json({
      success: false,
      error:   'Request body must include a non-empty "question" string.',
    });
  }

  const sanitised = question.trim();

  try {
    const dupeResult = await runDeduplicationCheck(sanitised);

    // Duplicate found — do not persist, return duplicate details
    if (dupeResult.classification !== 'NEW') {
      return res.status(200).json({ success: true, created: false, ...dupeResult });
    }

    // NEW — generate embedding and save
    const embedding = await generateEmbedding(sanitised);

    const doc = await QuestionDocument.create({
      question:  sanitised,
      embedding,
      answered:  false,
      authorId:  authorId || null,
    });

    return res.status(201).json({
      success:        true,
      created:        true,
      classification: 'NEW',
      message:        'Your question has been posted successfully.',
      documentId:     doc._id,
    });

  } catch (err) {
    console.error('[SemanticController] submitQuestion error:', err.message);
    return res.status(500).json({
      success: false,
      error:   err.message,
      detail:  process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
};

// ── Core deduplication logic (shared by check + submit) ──────────────────────

/**
 * Embeds the incoming question locally, runs the Atlas $vectorSearch with a
 * 7-day pre-filter, and returns a classification result object.
 *
 * @param   {string} sanitisedQuestion — Already trimmed input text.
 * @returns {Promise<object>}           — Classification result (no success wrapper).
 */
const runDeduplicationCheck = async (sanitisedQuestion) => {
  // ── Step 1: Embed locally ─────────────────────────────────────────────
  /**
   * incomingVector: number[]
   * Generated entirely in-process — identical to how indexed questions
   * were embedded, guaranteeing comparable cosine distances.
   */
  const incomingVector = await generateEmbedding(sanitisedQuestion);

  // ── Step 2: Define the sliding window ────────────────────────────────
  /**
   * windowStart: Date
   * Questions with createdAt < windowStart are invisible to this search.
   * Recalculated fresh on every request so the window slides in real-time.
   */
  const windowStart = new Date(Date.now() - WINDOW_MS);

  // ── Step 3: Atlas Vector Search with createdAt pre-filter ────────────
  /**
   * The pre-filter is applied BEFORE the ANN search, reducing the candidate
   * set to only documents created in the last 7 days.  This is more efficient
   * than a post-filter and is the Atlas-recommended approach.
   *
   * topMatch:  best matching QuestionDocument (or undefined if window is empty)
   * simScore:  cosine similarity from $meta: 'vectorSearchScore'
   */
  const [searchResult] = await QuestionDocument.aggregate([
    {
      $vectorSearch: {
        index:         ATLAS_SEMANTIC_INDEX,
        path:          'embedding',
        queryVector:   incomingVector,
        numCandidates: 100,
        limit:         1,
        filter: {
          // ← pre-filter: only evaluate documents in the 7-day window
          createdAt: { $gte: windowStart },
        },
      },
    },
    {
      $project: {
        question:  1,
        answer:    1,
        answered:  1,
        authorId:  1,
        createdAt: 1,
        updatedAt: 1,
        simScore:  { $meta: 'vectorSearchScore' },
      },
    },
  ]);

  // ── Step 4: Classify ──────────────────────────────────────────────────

  // No questions in the 7-day window → automatic NEW
  if (!searchResult) {
    return buildNewResult(sanitisedQuestion, null);
  }

  const topMatch = searchResult;
  /**
   * simScore: number
   * Cosine similarity between incomingVector and topMatch.embedding.
   * Compared against DUPE_THRESHOLD (default 0.85).
   */
  const simScore = topMatch.simScore;

  console.log(
    `[SemanticController] "${sanitisedQuestion}" | ` +
    `simScore=${simScore.toFixed(4)} | answered=${topMatch.answered} | ` +
    `windowStart=${windowStart.toISOString()}`
  );

  // Below threshold → semantically distinct → NEW
  if (simScore < DUPE_THRESHOLD) {
    return buildNewResult(sanitisedQuestion, simScore);
  }

  // ── DUPLICATE: Case A — already answered ─────────────────────────────
  if (topMatch.answered === true) {
    return {
      classification:     'DUPLICATE_ANSWERED',
      message:            'A similar question was already answered.',
      simScore,
      historicalId:       topMatch._id,
      historicalQuestion: topMatch.question,
      answer:             topMatch.answer,
      answeredAt:         topMatch.updatedAt || topMatch.createdAt,
    };
  }

  // ── DUPLICATE: Case B — awaiting answer ──────────────────────────────
  return {
    classification:     'DUPLICATE_UNANSWERED',
    message:            'Your question has already been asked and is awaiting an answer.',
    simScore,
    historicalId:       topMatch._id,
    historicalQuestion: topMatch.question,
    askedAt:            topMatch.createdAt,
  };
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const buildNewResult = (question, simScore) => ({
  classification: 'NEW',
  message:        'No similar question found in the last 7 days. Proceed to post.',
  question,
  simScore,
  proceed:        true,
});

module.exports = { checkQuestion, submitQuestion, QuestionDocument };
