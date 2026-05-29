'use strict';
const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  type: { type: String, enum: ['personal', 'community'], default: 'community' },
  status: { type: String, enum: ['open', 'answered', 'closed'], default: 'open' },
  askedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tags: [{ type: String, trim: true }],
}, { timestamps: true });

questionSchema.index(
  { title: 'text', description: 'text', tags: 'text' },
  { weights: { title: 10, tags: 5, description: 1 }, name: 'question_text_search' }
);
questionSchema.index({ status: 1, type: 1, createdAt: -1 });
questionSchema.index({ askedBy: 1, createdAt: -1 });

module.exports = mongoose.model('Question', questionSchema);
