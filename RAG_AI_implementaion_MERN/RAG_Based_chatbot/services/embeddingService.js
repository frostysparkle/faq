'use strict';

/**
 * embeddingService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Generates dense vector embeddings 100% locally using the
 * @huggingface/transformers (formerly @xenova/transformers) npm package.
 *
 * The model is downloaded once from the HuggingFace Hub on first run and then
 * cached to disk (default: ~/.cache/huggingface/hub/).  After that initial
 * download the entire pipeline is offline — no network calls are ever made
 * at inference time.
 *
 * Installation:
 *   npm install @huggingface/transformers
 *
 * Environment variables consumed:
 *   EMBEDDING_MODEL  — HF model ID to use (optional).
 *                      Default: "Xenova/all-MiniLM-L6-v2"  → 384-dim vectors
 *                      Override: "Xenova/all-mpnet-base-v2" → 768-dim vectors
 *                      ⚠  If you change this after data is already indexed you
 *                         MUST re-index all documents; vector dims must match
 *                         the Atlas Search index definition exactly.
 *
 * Exported surface:
 *   generateEmbedding(text: string): Promise<number[]>
 *     Returns a normalised float array whose length equals the model's
 *     hidden-state dimensionality (384 or 768).
 *
 * Key variables (referenced in component_detail.md):
 *   _pipeline        — singleton FeatureExtractionPipeline; loaded once,
 *                      reused for every subsequent call.
 *   rawTensor        — Tensor object returned by the pipeline.
 *   pooledVector     — number[]  — mean-pooled + L2-normalised sentence vector.
 */

const { pipeline, mean_pooling, AutoTokenizer } = (() => {
  try {
    // @huggingface/transformers ≥ 3.x uses named exports
    return require('@huggingface/transformers');
  } catch {
    // Fallback for older @xenova/transformers installs
    return require('@xenova/transformers');
  }
})();

// ── Constants ─────────────────────────────────────────────────────────────────

const MODEL_ID = process.env.EMBEDDING_MODEL || 'Xenova/all-MiniLM-L6-v2';

// ── Singleton pipeline ────────────────────────────────────────────────────────

/**
 * _pipeline: FeatureExtractionPipeline | null
 *
 * Holds the loaded model pipeline across requests.
 * Initialised lazily on the first call to generateEmbedding().
 * Subsequent calls skip the expensive model-load step entirely.
 */
let _pipeline = null;
let _initPromise = null;

/**
 * Returns the singleton pipeline, initialising it if needed.
 * Thread-safe against concurrent warm-up calls via promise deduplication.
 *
 * @returns {Promise<FeatureExtractionPipeline>}
 */
const getPipeline = () => {
  if (_pipeline) return Promise.resolve(_pipeline);

  // Deduplicate concurrent warm-up calls
  if (_initPromise) return _initPromise;

  console.log(`[EmbeddingService] Loading local model: ${MODEL_ID} …`);
  console.log('[EmbeddingService] (First run downloads model to ~/.cache/huggingface/hub/)');

  _initPromise = pipeline('feature-extraction', MODEL_ID, {
    // quantized: true loads the int8 ONNX model — 4× smaller, ~same accuracy
    quantized: true,
  })
    .then((p) => {
      _pipeline = p;
      _initPromise = null;
      console.log(`[EmbeddingService] Model ready: ${MODEL_ID}`);
      return _pipeline;
    })
    .catch((err) => {
      _initPromise = null;
      throw err;
    });

  return _initPromise;
};

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Generates a sentence embedding for the given text using the local model.
 *
 * Processing pipeline:
 *   1. Tokenise text (handled internally by the HF pipeline).
 *   2. Run ONNX forward pass → per-token hidden states (rawTensor).
 *   3. Mean-pool token vectors → single sentence vector.
 *   4. L2-normalise → unit vector (required for cosine similarity in Atlas).
 *   5. Return as a plain JavaScript number[].
 *
 * @param {string} text — Raw text to embed.
 * @returns {Promise<number[]>} — Normalised float array (384 or 768 dims).
 */
const generateEmbedding = async (text) => {
  if (!text || typeof text !== 'string' || !text.trim()) {
    throw new Error('[EmbeddingService] Input must be a non-empty string.');
  }

  const extractor = await getPipeline();

  /**
   * rawTensor: Tensor { data: Float32Array, dims: [1, tokenCount, hiddenSize] }
   *
   * pooling: 'mean'         → mean-pools over the token dimension
   * normalize: true         → L2-normalises the output vector
   *
   * These two options together produce a unit-length sentence embedding
   * identical to what sentence-transformers produces in Python.
   */
  const rawTensor = await extractor(text.trim(), {
    pooling:   'mean',
    normalize: true,
  });

  /**
   * pooledVector: number[]
   *
   * rawTensor.data is a Float32Array with shape [hiddenSize] after pooling.
   * We spread it into a plain JS array so it can be stored in MongoDB and
   * passed directly to Atlas $vectorSearch as queryVector.
   */
  const pooledVector = Array.from(rawTensor.data);

  if (pooledVector.length === 0) {
    throw new Error('[EmbeddingService] Pipeline returned an empty vector.');
  }

  return pooledVector;
};

/**
 * Warm up the pipeline at server start to avoid cold-start latency on the
 * first real request.  Call once from server.js:
 *
 *   const { warmUp } = require('./services/embeddingService');
 *   warmUp().catch(console.error);
 *
 * @returns {Promise<void>}
 */
const warmUp = async () => {
  await getPipeline();
  // Run a throwaway inference to load ONNX weights into memory
  await generateEmbedding('warm up');
  console.log('[EmbeddingService] Pipeline warm-up complete.');
};

module.exports = { generateEmbedding, warmUp, MODEL_ID };
