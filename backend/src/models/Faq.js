'use strict';
const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  answer: { type: String, required: true },
  categories: [{ type: String, trim: true }],
  tags: [{ type: String, trim: true }],
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
  helpfulCount: { type: Number, default: 0 },
  unhelpfulCount: { type: Number, default: 0 },
  viewCount: { type: Number, default: 0 },
  embedding: [{ type: Number }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

faqSchema.index(
  { title: 'text', tags: 'text', answer: 'text' },
  { weights: { title: 10, tags: 5, answer: 1 }, name: 'faq_text_search' }
);
faqSchema.index({ status: 1, createdAt: -1 });
faqSchema.index({ categories: 1, status: 1 });

module.exports = mongoose.model('Faq', faqSchema);
