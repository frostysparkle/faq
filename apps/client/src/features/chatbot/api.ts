import type { ApiSuccess, ChatFeedbackInput, ChatMessage, ChatQueryInput, ChatQueryResponse } from '@samagama/shared';
import { apiClient } from '../../lib/api-client';

export async function sendChatMessage(input: ChatQueryInput): Promise<ChatQueryResponse> {
  const res = await apiClient.post<ApiSuccess<ChatQueryResponse>>('/api/chat/query', input);
  return res.data.data;
}

export async function getChatSession(sessionId: string): Promise<ChatMessage[]> {
  const res = await apiClient.get<ApiSuccess<ChatMessage[]>>(`/api/chat/session/${sessionId}`);
  return res.data.data;
}

export async function submitChatFeedback(input: ChatFeedbackInput): Promise<void> {
  await apiClient.post('/api/chat/feedback', input);
}
