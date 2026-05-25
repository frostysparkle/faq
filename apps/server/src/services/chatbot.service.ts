// Chatbot feedback service.
//
// The actual chat flow ships in Phase 6 — until then this service exposes only the read paths
// the dashboard needs, plus an internal write helper used by the seed script.
import { Types } from 'mongoose';
import type { ChatbotFeedbackStats, PublicChatFeedback } from '@samagama/shared';
import { ChatFeedbackModel, type ChatFeedbackDocument } from '../models/ChatFeedback.model.js';

interface PopulatedFeedback extends Omit<ChatFeedbackDocument, 'userId'> {
  userId: { _id: Types.ObjectId; name: string };
}

function project(f: PopulatedFeedback): PublicChatFeedback {
  return {
    id: f._id.toString(),
    query: f.query,
    answer: f.answer,
    rating: f.rating,
    comment: f.comment ?? undefined,
    user: { id: f.userId._id.toString(), name: f.userId.name },
    status: f.status,
    createdAt: f.createdAt.toISOString(),
  };
}

export const chatbotService = {
  async listFeedback(filter: 'all' | 'helpful' | 'flagged'): Promise<PublicChatFeedback[]> {
    const q: Record<string, unknown> = {};
    if (filter === 'helpful') q.rating = 'helpful';
    if (filter === 'flagged') q.rating = 'incorrect'; // dashboard says "Flagged" = bad responses

    const rows = await ChatFeedbackModel.find(q)
      .sort({ createdAt: -1 })
      .limit(200)
      .populate('userId', 'name')
      .lean<PopulatedFeedback[]>();
    return rows.map(project);
  },

  async getStats(): Promise<ChatbotFeedbackStats> {
    const [total, helpful, flagged] = await Promise.all([
      ChatFeedbackModel.countDocuments({}),
      ChatFeedbackModel.countDocuments({ rating: 'helpful' }),
      ChatFeedbackModel.countDocuments({ rating: 'incorrect' }),
    ]);
    return { total, helpful, flagged };
  },
};
