import { CONFIG } from "./config.js";
import { loadAndFlatten } from "./utils.js";
import { Embedder } from "./embedder.js";
import { MongoVectorStore } from "./mongoStore.js";

export class SemanticBackend {
  constructor() {
    this.embedder = new Embedder();
    this.mongo1 = new MongoVectorStore(CONFIG.MONGODB_URI, CONFIG.DB_NAME, CONFIG.COLL_1);
    this.mongo2 = new MongoVectorStore(CONFIG.MONGODB_URI, CONFIG.DB_NAME, CONFIG.COLL_2);
  }

  async init() {
    await this.mongo1.init();
    await this.mongo2.init();
  }

  async buildFromDataset() {
    const docs = loadAndFlatten(CONFIG.DATA_PATH);
    const embeddings = await this.embedder.encodeMany(docs.map(d => d.question));

    const split = Math.floor(docs.length / 2);
    const docs1 = docs.slice(0, split);
    const emb1 = embeddings.slice(0, split);
    const docs2 = docs.slice(split);
    const emb2 = embeddings.slice(split);

    await this.mongo1.upsertMany(docs1, emb1);
    await this.mongo2.upsertMany(docs2, emb2);

    await this.mongo1.createTTLIndex(CONFIG.LAST_7_DAYS);
    await this.mongo2.createTTLIndex(CONFIG.LAST_7_DAYS);

    console.log(`Inserted ${docs1.length} docs into ${CONFIG.COLL_1}`);
    console.log(`Inserted ${docs2.length} docs into ${CONFIG.COLL_2}`);
    console.log("TTL indexes created for both collections.");
  }

  async queryFlow(question) {
    const queryVec = await this.embedder.encodeOne(question);

    console.log("\n" + "=".repeat(70));
    console.log("QUESTION:", question);
    console.log("=".repeat(70));

    console.log("\n[1] Searching collection 1...");
    const res1 = await this.mongo1.vectorSearch(queryVec, CONFIG.VECTOR_INDEX_1, 1);
    if (res1.length && res1[0].score >= CONFIG.SIM_THRESHOLD) {
      this.flash(res1[0], "collection 1");
      return res1[0];
    }

    console.log("\n[2] Searching collection 2...");
    const res2 = await this.mongo2.vectorSearch(queryVec, CONFIG.VECTOR_INDEX_2, 1);
    if (res2.length && res2[0].score >= CONFIG.SIM_THRESHOLD) {
      this.flash(res2[0], "collection 2");
      return res2[0];
    }

    console.log("\n[3] No match found. Saving question to collection 2...");
    await this.mongo2.collection.insertOne({
      id: `new_${Date.now()}`,
      question,
      answer: null,
      section_number: null,
      section_title: "new_questions",
      embedding: queryVec,
      created_at: new Date()
    });

    console.log("Saved to collection 2.");
    return null;
  }

  flash(result, source) {
    console.log("\n" + "🎉".repeat(20));
    console.log(`FOUND IN ${source.toUpperCase()}`);
    console.log(`Question: ${result.question}`);
    console.log(`Answer: ${result.answer}`);
    console.log(`Similarity: ${result.score.toFixed(3)}`);
    console.log("🎉".repeat(20));
  }
}