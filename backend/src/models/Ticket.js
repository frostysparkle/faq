'use strict';
const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  summary: { type: String, required: true },
  conversationHistory: [{ role: String, content: String }],
  isGeneralQuery: { type: Boolean, default: false },
  status: { type: String, enum: ['open', 'resolved'], default: 'open' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  sessionId: { type: String },
  expiresAt: { type: Date },
}, { timestamps: true });

ticketSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Ticket', ticketSchema);
