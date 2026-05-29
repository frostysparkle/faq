'use strict';
const mongoose = require('mongoose');

const flagSchema = new mongoose.Schema({
  entityType: { type: String, enum: ['faq', 'question', 'answer'], required: true },
  entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
  reason: { type: String, required: true },
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['open', 'resolved', 'dismissed'], default: 'open' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewNote: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Flag', flagSchema);
