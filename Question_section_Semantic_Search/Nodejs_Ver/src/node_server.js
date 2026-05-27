import express from "express";
import dotenv from "dotenv";
import { pipeline } from "@xenova/transformers";
import { MongoClient } from "mongodb";

dotenv.config();

const app = express();
app.use(express.json());

const URI = process.env.MONGODB_URI;
const DB = process.env.DB_NAME;
const COL = process.env.COLLECTION;
const INDEX = process.env.INDEX_NAME;

let embedder;
let collection;

async function init() {
  console.log("Loading model...");
  embedder = await pipeline("feature-extraction", "Xenova/bge-small-en-v1.5");

  const client = new MongoClient(URI);
  await client.connect();

  collection = client.db(DB).collection(COL);

  console.log("Node server ready");
}

app.post("/search", async (req, res) => {
  const start = performance.now();

  const emb = await embedder(req.body.question, {
    pooling: "mean",
    normalize: true,
  });

  const result = await collection.aggregate([
    {
      $vectorSearch: {
        index: INDEX,
        path: "embedding",
        queryVector: Array.from(emb.data),
        numCandidates: 50,
        limit: 1,
      },
    },
  ]).toArray();

  const end = performance.now();

  res.json({
    answer: result?.[0]?.answer || "NO MATCH",
    latency_ms: end - start,
  });
});

init().then(() => {
  app.listen(3000, () => console.log("Node running on 3000"));
});