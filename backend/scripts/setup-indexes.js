'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI || MONGODB_URI.includes('<')) {
  console.error('ERROR: Set a valid MONGODB_URI in backend/.env before running setup-indexes.');
  process.exit(1);
}

async function dropTextIndex(collection, indexName) {
  try {
    const indexes = await collection.indexes();
    const exists = indexes.find((i) => i.name === indexName || (i.weights && Object.keys(i.weights).length));
    if (exists) {
      await collection.dropIndex(exists.name);
      console.log(`[indexes] Dropped old index "${exists.name}" on ${collection.collectionName}`);
    }
  } catch (e) {
    // Index may not exist — fine
  }
}

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('[indexes] Connected to MongoDB\n');

  const db = mongoose.connection.db;

  // ── faqs ──────────────────────────────────────────────
  const faqs = db.collection('faqs');
  await dropTextIndex(faqs, 'title_text_answer_text');
  await faqs.createIndex(
    { title: 'text', tags: 'text', answer: 'text' },
    { weights: { title: 10, tags: 5, answer: 1 }, name: 'faq_text_search' }
  );
  await faqs.createIndex({ status: 1, createdAt: -1 });
  await faqs.createIndex({ categories: 1, status: 1 });
  console.log('[indexes] faqs: OK (text search + compound)');

  // ── questions ─────────────────────────────────────────
  const questions = db.collection('questions');
  await dropTextIndex(questions, 'title_text_description_text');
  await questions.createIndex(
    { title: 'text', description: 'text', tags: 'text' },
    { weights: { title: 10, tags: 5, description: 1 }, name: 'question_text_search' }
  );
  await questions.createIndex({ status: 1, type: 1, createdAt: -1 });
  await questions.createIndex({ askedBy: 1, createdAt: -1 });
  console.log('[indexes] questions: OK (text search + compound)');

  // ── answers ───────────────────────────────────────────
  const answers = db.collection('answers');
  await answers.createIndex({ questionId: 1, status: 1 });
  await answers.createIndex({ status: 1, createdAt: 1 });
  console.log('[indexes] answers: OK');

  // ── auditlogs ─────────────────────────────────────────
  const auditlogs = db.collection('auditlogs');
  await auditlogs.createIndex({ actorId: 1, createdAt: -1 });
  await auditlogs.createIndex({ action: 1, createdAt: -1 });
  console.log('[indexes] auditlogs: OK');

  // ── tickets (TTL) ─────────────────────────────────────
  const tickets = db.collection('tickets');
  await tickets.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'tickets_ttl' });
  console.log('[indexes] tickets: OK (TTL)');

  // ── users ─────────────────────────────────────────────
  const users = db.collection('users');
  await users.createIndex({ email: 1 }, { unique: true });
  console.log('[indexes] users: OK (unique email)');

  console.log('\n[indexes] All indexes configured successfully.');
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('[indexes] Error:', err.message);
  process.exit(1);
});
