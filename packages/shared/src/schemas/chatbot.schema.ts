// Chatbot feedback contracts. The chatbot itself ships in Phase 6; this surface lets the
// moderator dashboard render real data ahead of that.
import { CHAT_FEEDBACK_RATINGS } from '../enums.js';

export interface PublicChatFeedback {
  id: string;
  query: string;
  answer: string;
  rating: (typeof CHAT_FEEDBACK_RATINGS)[number];
  comment?: string;
  user: { id: string; name: string };
  status: 'open' | 'reviewed' | 'resolved';
  createdAt: string;
}

export interface ChatbotFeedbackStats {
  total: number;
  helpful: number;
  flagged: number;
}
