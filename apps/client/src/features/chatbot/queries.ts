// React Query hooks wrapping the chatbot API calls.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ChatFeedbackInput, ChatQueryInput } from '@samagama/shared';
import { getChatSession, sendChatMessage, submitChatFeedback } from './api';

// Send a chat message (mutation — each send is a one-off request).
export function useSendMessage() {
  return useMutation({
    mutationFn: (input: ChatQueryInput) => sendChatMessage(input),
  });
}

// Load a chat session's history. Disabled until a sessionId exists; never goes stale
// (history is immutable once fetched and updated locally as new messages arrive).
export function useChatSession(sessionId: string | null) {
  return useQuery({
    queryKey: ['chat', 'session', sessionId],
    queryFn: () => getChatSession(sessionId!),
    enabled: !!sessionId,
    staleTime: Infinity,
  });
}

// Submit feedback on a chatbot answer; refreshes the admin feedback list on success.
export function useSubmitChatFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ChatFeedbackInput) => submitChatFeedback(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chatbot', 'feedback'] });
    },
  });
}
