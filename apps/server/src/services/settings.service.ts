// Settings service — get/update system-wide thresholds.
import { SystemSettingsModel } from '../models/SystemSettings.model.js';

export interface PublicSettings {
  duplicateWarnThreshold: number;
  duplicateStrongThreshold: number;
  chatbotConfidenceThreshold: number;
  chatbotMaxSources: number;
  communityAnswerCap: number;
  urgentIdleDays: number;
}

export const settingsService = {
  async get(): Promise<PublicSettings> {
    let doc = await SystemSettingsModel.findById('global').lean();
    if (!doc) {
      doc = await SystemSettingsModel.create({ _id: 'global' });
    }
    return {
      duplicateWarnThreshold: doc.duplicateWarnThreshold ?? 0.6,
      duplicateStrongThreshold: doc.duplicateStrongThreshold ?? 0.8,
      chatbotConfidenceThreshold: doc.chatbotConfidenceThreshold ?? 0.7,
      chatbotMaxSources: doc.chatbotMaxSources ?? 6,
      communityAnswerCap: doc.communityAnswerCap ?? 10,
      urgentIdleDays: doc.urgentIdleDays ?? 7,
    };
  },

  async update(input: Partial<PublicSettings>): Promise<PublicSettings> {
    const doc = await SystemSettingsModel.findByIdAndUpdate(
      'global',
      { $set: input },
      { new: true, upsert: true },
    );
    return {
      duplicateWarnThreshold: doc!.duplicateWarnThreshold ?? 0.6,
      duplicateStrongThreshold: doc!.duplicateStrongThreshold ?? 0.8,
      chatbotConfidenceThreshold: doc!.chatbotConfidenceThreshold ?? 0.7,
      chatbotMaxSources: doc!.chatbotMaxSources ?? 6,
      communityAnswerCap: doc!.communityAnswerCap ?? 10,
      urgentIdleDays: doc!.urgentIdleDays ?? 7,
    };
  },
};
