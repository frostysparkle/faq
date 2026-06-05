// HTTP calls for the Yaksha chatbot feature: send a message, load a session, submit feedback.
import type {
  ApiSuccess,
  ChatFeedbackInput,
  ChatMessage,
  ChatQueryInput,
  ChatQueryResponse,
} from '@samagama/shared';
import { apiClient } from '../../lib/api-client';

// Local LLM inference (Ollama/gemma) with a full RAG context routinely takes 20-30s,
// well past the api-client's 15s default. Give chat queries a generous per-request timeout
// so a slow-but-working backend isn't mistaken for a failure.
const CHAT_QUERY_TIMEOUT_MS = 90_000;

export async function sendChatMessage(input: ChatQueryInput): Promise<ChatQueryResponse> {
  const res = await apiClient.post<ApiSuccess<ChatQueryResponse>>('/api/chat/query', input, {
    timeout: CHAT_QUERY_TIMEOUT_MS,
  });
  return res.data.data;
}

export async function getChatSession(sessionId: string): Promise<ChatMessage[]> {
  const res = await apiClient.get<ApiSuccess<ChatMessage[]>>(`/api/chat/session/${sessionId}`);
  return res.data.data;
}

export async function submitChatFeedback(input: ChatFeedbackInput): Promise<void> {
  await apiClient.post('/api/chat/feedback', input);
}
