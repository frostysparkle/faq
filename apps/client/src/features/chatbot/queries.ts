import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ChatFeedbackInput, ChatQueryInput } from '@samagama/shared';
import { getChatSession, sendChatMessage, submitChatFeedback } from './api';

export function useSendMessage() {
  return useMutation({
    mutationFn: (input: ChatQueryInput) => sendChatMessage(input),
  });
}

export function useChatSession(sessionId: string | null) {
  return useQuery({
    queryKey: ['chat', 'session', sessionId],
    queryFn: () => getChatSession(sessionId!),
    enabled: !!sessionId,
    staleTime: Infinity,
  });
}

export function useSubmitChatFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ChatFeedbackInput) => submitChatFeedback(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chatbot', 'feedback'] });
    },
  });
}
