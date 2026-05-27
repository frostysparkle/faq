// System settings — configurable thresholds that control portal behavior.
import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

const systemSettingsSchema = new Schema(
  {
    /** Singleton key — only one settings document exists. */
    _id: { type: String, default: 'global' },
    duplicateWarnThreshold: { type: Number, default: 0.6, min: 0, max: 1 },
    duplicateStrongThreshold: { type: Number, default: 0.8, min: 0, max: 1 },
    chatbotConfidenceThreshold: { type: Number, default: 0.7, min: 0, max: 1 },
    chatbotMaxSources: { type: Number, default: 6, min: 1, max: 20 },
    communityAnswerCap: { type: Number, default: 10, min: 1, max: 50 },
    /** Max idle days before a question appears in the "urgent" bucket. */
    urgentIdleDays: { type: Number, default: 7 },
  },
  {
    timestamps: true,
  },
);

export type SystemSettingsDocument = HydratedDocument<InferSchemaType<typeof systemSettingsSchema>>;
export const SystemSettingsModel = model('SystemSettings', systemSettingsSchema);
