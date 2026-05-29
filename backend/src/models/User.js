'use strict';
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  name: { type: String, trim: true },
  role: { type: String, enum: ['student', 'moderator', 'admin'], default: 'student' },
  tokenVersion: { type: Number, default: 0 },
  spurtiPoints: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
