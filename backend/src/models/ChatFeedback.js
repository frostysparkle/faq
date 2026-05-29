'use strict';
const mongoose = require('mongoose');

const chatFeedbackSchema = new mongoose.Schema({
  chatSessionId: { type: String, required: true },
  messageIndex: { type: Number, required: true },
  rating: { type: String, enum: ['helpful', 'unhelpful', 'incorrect'], required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  message: { type: String },
  response: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('ChatFeedback', chatFeedbackSchema);
