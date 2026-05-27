// ==============================================
// src/db.js
// Singleton MongoDB client with connection pool.
//
// MongoDB Node driver maintains a pool internally
// (default 5 connections, configurable via maxPoolSize).
// All scripts import getDb() — first call opens the
// pool, subsequent calls reuse it.
// ==============================================

import { MongoClient } from "mongodb";
import "dotenv/config";

const URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || "faq_semantic_search";
const COLL = process.env.COLLECTION_NAME || "faq_embeddings";

if (!URI) {
  console.error(
    "\nMONGODB_URI is not set.\n" +
      "    Copy .env.example → .env and fill in your Atlas connection string.\n"
  );
  process.exit(1);
}

// maxPoolSize=20 lets us serve up to 20 concurrent queries
// without waiting for a free connection.
const client = new MongoClient(URI, {
  maxPoolSize: 20,
  serverSelectionTimeoutMS: 5000,
});

let connected = false;

export async function getDb() {
  if (!connected) {
    await client.connect();
    connected = true;
  }
  return client.db(DB_NAME);
}

export async function getCollection() {
  const db = await getDb();
  return db.collection(COLL);
}

export async function closeDb() {
  if (connected) {
    await client.close();
    connected = false;
  }
}

export { DB_NAME, COLL };
