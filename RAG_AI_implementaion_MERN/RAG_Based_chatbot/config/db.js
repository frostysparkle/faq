'use strict';

/**
 * db.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Establishes a singleton Mongoose connection to MongoDB Atlas and exports the
 * QADocument schema used by the RAG chatbot vector store.
 *
 * Environment variables consumed:
 *   MONGO_URI           — MongoDB Atlas connection string (required)
 *   ATLAS_VECTOR_INDEX  — Name of the Atlas Vector Search index
 *                         (default: "qa_vector_index")
 *
 * Atlas Vector Search index definition (apply once via Atlas UI or Atlas CLI):
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ {                                                                       │
 * │   "mappings": {                                                         │
 * │     "dynamic": false,                                                   │
 * │     "fields": {                                                         │
 * │       "embedding": {                                                    │
 * │         "type": "knnVector",                                            │
 * │         "dimensions": 384,   ← 384 for MiniLM / 768 for mpnet          │
 * │         "similarity": "cosine"                                          │
 * │       }                                                                 │
 * │     }                                                                   │
 * │   }                                                                     │
 * │ }                                                                       │
 * └─────────────────────────────────────────────────────────────────────────┘
 * Index name  : qa_vector_index   (must match ATLAS_VECTOR_INDEX env var)
 * Collection  : qadocuments       (Mongoose auto-pluralises "QADocument")
 */

const mongoose = require('mongoose');

// ── Connection ────────────────────────────────────────────────────────────────

const connectDB = async () => {
  // Idempotent — safe to call multiple times
  if (mongoose.connection.readyState >= 1) {
    console.log('[DB] Already connected to MongoDB Atlas.');
    return;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS:          45000,
    });
    console.log(`[DB] MongoDB Atlas connected: ${conn.connection.host}`);
  } catch (err) {
    console.error('[DB] Connection error:', err.message);
    process.exit(1);
  }
};

// ── QADocument Schema ─────────────────────────────────────────────────────────

/**
 * Represents a single Q&A pair in the knowledge base.
 *
 * Key fields:
 *   question  → string    — The canonical question text; this is what gets embedded.
 *   answer    → string    — Returned verbatim on a direct match (S ≥ 0.95).
 *   embedding → number[]  — Flat float array produced by embeddingService.
 *                           Dimensionality must match the Atlas index definition:
 *                             384  → Xenova/all-MiniLM-L6-v2  (default, faster)
 *                             768  → Xenova/all-mpnet-base-v2  (more accurate)
 *   tags      → string[]  — Optional labels for analytics / filtering.
 */
const qaDocumentSchema = new mongoose.Schema(
  {
    question:  { type: String, required: true, trim: true },
    answer:    { type: String, required: true, trim: true },
    embedding: { type: [Number], required: true },
    tags:      { type: [String], default: [] },
  },
  { timestamps: true }
);

const QADocument = mongoose.model('QADocument', qaDocumentSchema);

module.exports = { connectDB, QADocument };
