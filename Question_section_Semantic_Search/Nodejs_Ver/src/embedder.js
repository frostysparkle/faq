// ==============================================
// src/embedder.js
// Wraps @xenova/transformers pipeline to match
// fastembed's TextEmbedding interface exactly.
//
// fastembed uses BAAI/bge-small-en-v1.5 by default
// (384-dim vectors). We use the ONNX-quantised
// Xenova mirror — identical weights, runs in Node.
// ==============================================

import { pipeline, env } from "@xenova/transformers";

// Disable the browser-specific fetch override so
// Node's native fetch (or node-fetch) is used
env.allowLocalModels = false;

let _pipe = null;

/**
 * Load (or return cached) embedding pipeline.
 * First call downloads the model (~23 MB).
 */
export async function getEmbedder(modelName = "Xenova/bge-small-en-v1.5") {
  if (_pipe) return _pipe;
  _pipe = await pipeline("feature-extraction", modelName, {
    quantized: true, // use int8 ONNX — faster, same accuracy for retrieval
  });
  return _pipe;
}

/**
 * Embed a batch of strings.
 * Returns Float32Array[] — one per input text.
 *
 * @param {string[]} texts
 * @param {object} pipe  — result of getEmbedder()
 * @returns {number[][]}
 */
export async function embedBatch(texts, pipe) {
  const output = await pipe(texts, {
    pooling: "mean",
    normalize: true, // L2-normalise → cosine similarity == dot product
  });
  // output.data is a flat Float32Array; reshape into rows
  const dim = output.dims[1]; // 384 for bge-small-en-v1.5
  const result = [];
  for (let i = 0; i < texts.length; i++) {
    result.push(Array.from(output.data.slice(i * dim, (i + 1) * dim)));
  }
  return result;
}

/**
 * Embed a single query string.
 * @param {string} text
 * @param {object} pipe
 * @returns {number[]}
 */
export async function embedQuery(text, pipe) {
  const [vec] = await embedBatch([text], pipe);
  return vec;
}
