// HTTP calls for the Yaksha chatbot feature: send a message, load a session, submit feedback.
import type {
  ApiSuccess,
  ChatFeedbackInput,
  ChatMessage,
  ChatQueryInput,
  ChatQueryResponse,
} from '@samagama/shared';
import { apiClient } from '../../lib/api-client';

const CHAT_QUERY_TIMEOUT_MS = 90_000;

export type ChatStreamEvent =
  | { type: 'ping'; data: { timestamp: number } }
  | { type: 'response'; data: ChatQueryResponse }
  | { type: 'error'; data: { message: string } }
  | { type: 'timeout' };

export function streamChatMessage(
  sessionId: string | null,
  message: string,
  onEvent: (event: ChatStreamEvent) => void,
): () => void {
  let cancelled = false;

  const processStream = async () => {
    try {
      const url = `${import.meta.env.VITE_API_URL ?? ''}/api/chat/stream/${sessionId ?? ''}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        onEvent({ type: 'error', data: { message: `Server error: ${response.status}` } });
        return;
      }

      if (!response.body) {
        onEvent({ type: 'error', data: { message: 'No response body' } });
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        if (cancelled) break;
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (cancelled) break;
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6)) as { type: string; data?: unknown };
              if (data.type === 'ping') {
                onEvent({ type: 'ping', data: data.data as { timestamp: number } });
              } else if (data.type === 'response') {
                onEvent({ type: 'response', data: data.data as ChatQueryResponse });
              } else if (data.type === 'error') {
                onEvent({ type: 'error', data: data.data as { message: string } });
              } else if (data.type === 'timeout') {
                onEvent({ type: 'timeout' });
              }
            } catch {
              onEvent({ type: 'error', data: { message: 'Failed to parse server event' } });
            }
          }
        }
      }
    } catch (err) {
      if (!cancelled) {
        onEvent({ type: 'error', data: { message: err instanceof Error ? err.message : 'Connection failed' } });
      }
    }
  };

  processStream();

  return () => {
    cancelled = true;
  };
}

export async function sendChatMessage(input: ChatQueryInput): Promise<ChatQueryResponse> {
  const res = await apiClient.post<ApiSuccess<ChatQueryResponse>>('/api/chat/query', input, {
    timeout: CHAT_QUERY_TIMEOUT_MS,
  });
  return res.data.data;
}

export async function getChatSession(
  sessionId: string,
): Promise<{ messages: ChatMessage[]; metaSummary: string }> {
  const res = await apiClient.get<ApiSuccess<{ messages: ChatMessage[]; metaSummary: string }>>(
    `/api/chat/session/${sessionId}`,
  );
  return res.data.data;
}

export async function submitChatFeedback(input: ChatFeedbackInput): Promise<void> {
  await apiClient.post('/api/chat/feedback', input);
}
