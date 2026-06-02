// Chatbot contracts — Phase 6 (Yaksha RAG chatbot).
import { z } from 'zod';
import { CHAT_FEEDBACK_RATINGS } from '../enums.js';

// ─── Request schemas ──────────────────────────────────────────────────────────

export const chatQuerySchema = z.object({
  message: z.string().trim().min(1, 'Message is required').max(1000),
  sessionId: z.string().uuid().optional(),
});

export const chatFeedbackSchema = z.object({
  sessionId: z.string().uuid(),
  messageIndex: z.number().int().min(0),
  rating: z.enum(CHAT_FEEDBACK_RATINGS),
  comment: z.string().trim().max(500).optional(),
});

export type ChatQueryInput = z.infer<typeof chatQuerySchema>;
export type ChatFeedbackInput = z.infer<typeof chatFeedbackSchema>;

// ─── Response types ───────────────────────────────────────────────────────────

export interface ChatSource {
  id: string;
  title: string;
  similarity: number;
}

export interface ChatQueryResponse {
  sessionId: string;
  answer: string;
  sources: ChatSource[];
  fallback_triggered: boolean;
  escalated?: boolean;
  messageIndex: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ─── Feedback types ───────────────────────────────────────────────────────────

export interface PublicChatFeedback {
  id: string;
  query: string;
  answer: string;
  rating: (typeof CHAT_FEEDBACK_RATINGS)[number];
  comment?: string;
  user: { id: string; name: string };
  status: 'open' | 'reviewed' | 'resolved';
  /** Full conversation snapshot; populated for feedback submitted after Phase 6. */
  messages?: Array<{ role: 'user' | 'assistant'; content: string }>;
  createdAt: string;
}

export interface ChatbotFeedbackStats {
  total: number;
  helpful: number;
  unhelpful: number;
}
