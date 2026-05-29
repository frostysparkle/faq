'use strict';
const mongoose = require('mongoose');
const { MONGODB_URI } = require('./env');

mongoose.connection.on('connected', () => console.log('[db] MongoDB connected'));
mongoose.connection.on('error', (err) => {
  if (err.code === 85 || err.codeName === 'IndexOptionsConflict') {
    console.error('[db] Index conflict detected. Run: node scripts/setup-indexes.js');
  } else {
    console.error('[db] MongoDB error:', err.message);
  }
});
mongoose.connection.on('disconnected', () => console.warn('[db] MongoDB disconnected'));

async function connectDB() {
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
}

module.exports = connectDB;
