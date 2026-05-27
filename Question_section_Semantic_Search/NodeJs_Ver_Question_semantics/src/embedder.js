import { pipeline } from "@xenova/transformers";
import { CONFIG } from "./config.js";

export class Embedder {
  constructor() {
    this.ready = null;
    this.model = null;
  }

  async init() {
    if (!this.ready) {
      this.ready = pipeline("feature-extraction", CONFIG.MODEL_NAME);
      this.model = await this.ready;
    }
  }

  async encodeOne(text) {
    await this.init();
    const output = await this.model(text, { pooling: "mean", normalize: true });
    return Array.from(output.data);
  }

  async encodeMany(texts) {
    const vectors = [];
    for (const text of texts) {
      vectors.push(await this.encodeOne(text));
    }
    return vectors;
  }
}