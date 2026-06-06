// Shared conversation logic for the two Yaksha surfaces (ChatbotFab widget + ChatbotPage).
//
// Owns the message list, the active session id, send/feedback/retract actions, and — new in
// the MongoDB-backed history work — auto-restoring the user's persisted thread on open and a
// "start new" action. The two components keep their own JSX/styling and consume this hook so
// the logic lives in exactly one place.
import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChatQueryResponse } from '@samagama/shared';
import {
  useActiveChatSession,
  useRetractChatFeedback,
  useSendMessage,
  useStartNewChat,
  useSubmitChatFeedback,
} from './queries';

export interface DisplayMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: { id: string; title: string; similarity: number }[];
  fallback_triggered?: boolean;
  escalated?: boolean;
  messageIndex?: number;
  feedback?: 'helpful' | 'incorrect';
}

interface Options {
  /** The client-only greeting shown when the thread is empty (never persisted). */
  welcome: DisplayMessage;
  /** Whether the surface is visible — gates the one-time history fetch (e.g. widget open). */
  active: boolean;
}

export function useChatConversation({ welcome, active }: Options) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DisplayMessage[]>([welcome]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [ollamaError, setOllamaError] = useState(false);
  // Guards against re-restoring (and clobbering live state) after the first hydration.
  const restoredRef = useRef(false);

  const sendMutation = useSendMessage();
  const feedbackMutation = useSubmitChatFeedback();
  const retractMutation = useRetractChatFeedback();
  const newChatMutation = useStartNewChat();

  // Auto-restore the persisted thread the first time the surface becomes active.
  const activeQuery = useActiveChatSession(active && !restoredRef.current);
  useEffect(() => {
    if (!active || restoredRef.current) return;
    const data = activeQuery.data;
    if (!data) return;
    restoredRef.current = true;
    if (data.sessionId && data.messages.length > 0) {
      setSessionId(data.sessionId);
      // messageIndex mirrors the server's array position so feedback works on history too.
      setMessages([
        welcome,
        ...data.messages.map((m, i) => ({
          role: m.role,
          content: m.content,
          messageIndex: m.role === 'assistant' ? i : undefined,
        })),
      ]);
    }
  }, [active, activeQuery.data, welcome]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || sendMutation.isPending) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setIsTyping(true);
    try {
      const result: ChatQueryResponse = await sendMutation.mutateAsync({
        message: text,
        sessionId: sessionId ?? undefined,
      });
      if (!sessionId) setSessionId(result.sessionId);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: result.answer,
          sources: result.sources,
          fallback_triggered: result.fallback_triggered,
          escalated: result.escalated,
          messageIndex: result.messageIndex,
        },
      ]);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.error?.code === 'OLLAMA_NOT_CONNECTED') {
        setOllamaError(true);
      } else {
        // A timeout (no response received) means the model is just slow, not broken.
        const timedOut = axios.isAxiosError(err) && err.code === 'ECONNABORTED';
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: timedOut
              ? 'That took longer than expected and timed out. The assistant may be busy — please try asking again.'
              : 'Sorry, something went wrong. Please try again.',
            sources: [],
          },
        ]);
      }
    } finally {
      setIsTyping(false);
    }
  }, [input, sendMutation, sessionId]);

  const handleFeedback = useCallback(
    (msgIdx: number, displayIdx: number, rating: 'helpful' | 'incorrect') => {
      if (!sessionId) return;
      const current = messages[displayIdx]?.feedback;
      // Clicking the already-active rating retracts it (undo a misclick) — locally + server.
      if (current === rating) {
        setMessages((prev) =>
          prev.map((m, i) => (i === displayIdx ? { ...m, feedback: undefined } : m)),
        );
        retractMutation.mutate({ sessionId, messageIndex: msgIdx });
        return;
      }
      setMessages((prev) => prev.map((m, i) => (i === displayIdx ? { ...m, feedback: rating } : m)));
      feedbackMutation.mutate({ sessionId, messageIndex: msgIdx, rating });
    },
    [messages, sessionId, feedbackMutation, retractMutation],
  );

  // "Clear / Start new": close the server thread, then reset to the welcome state.
  const startNew = useCallback(async () => {
    restoredRef.current = true; // don't auto-restore the thread we're closing
    try {
      await newChatMutation.mutateAsync();
    } catch {
      // Even if the close call fails, reset the UI; a stale active thread is harmless.
    }
    setSessionId(null);
    setMessages([welcome]);
    setInput('');
    setOllamaError(false);
  }, [newChatMutation, welcome]);

  return {
    sessionId,
    messages,
    input,
    setInput,
    isTyping,
    ollamaError,
    setOllamaError,
    send,
    handleFeedback,
    startNew,
    isSending: sendMutation.isPending,
  };
}
