'use strict';
const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema({
  _singleton: { type: String, default: 'settings', unique: true },
  confidenceThreshold: { type: Number, default: 0.7 },
  maxSources: { type: Number, default: 5 },
  fallbackMessage: { type: String, default: "I don't have an answer for you at the moment. You can escalate it to backend team: Type #escalate" },
}, { timestamps: true });

systemSettingsSchema.statics.get = async function () {
  return this.findOneAndUpdate(
    { _singleton: 'settings' },
    { $setOnInsert: {} },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
