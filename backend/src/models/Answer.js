'use strict';
const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
  body: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewNote: { type: String },
  embedding: [{ type: Number }],
}, { timestamps: true });

answerSchema.index({ questionId: 1, status: 1 });
answerSchema.index({ status: 1, createdAt: 1 });

module.exports = mongoose.model('Answer', answerSchema);
