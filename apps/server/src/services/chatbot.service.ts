// Yaksha chatbot service — RAG orchestration (Phase 6).
//
// Flow for a normal message:
//   1. Generate 384-dim query embedding.
//   2. Cosine-similarity search against published FAQs (chatbotConfidenceThreshold).
//   3. Assemble RAG payload: system prompt + FAQ context + conversation history.
//   4. Call LLM provider (mock | local-llama via rag/llm-server).
//   5. Persist response in TTL session cache (30 min idle timeout).
//   6. Return answer + source FAQ titles + fallback_triggered flag.
//
// #escalate / #forceescalate:
//   Intercept the command before the search step, call /internal/llm/summarize,
//   and record a ticket-style summary in ChatFeedback for moderator review.
//
// Conversation history is stored in the in-process TTL cache — no Redis required
// for testing. Each session lives for 30 minutes after the last message.
import { randomUUID } from 'crypto';
import { Types } from 'mongoose';
import type { ChatbotFeedbackStats, PublicChatFeedback } from '@samagama/shared';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { ApiError } from '../utils/api-error.js';
import { createTtlCache } from '../utils/ttl-cache.js';
import { generateEmbedding, cosineSimilarity } from './embedding.service.js';
import { FaqModel } from '../models/Faq.model.js';
import { SystemSettingsModel } from '../models/SystemSettings.model.js';
import { ChatFeedbackModel, type ChatFeedbackDocument } from '../models/ChatFeedback.model.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatSource {
  id: string;
  title: string;
  similarity: number;
}

export interface ChatQueryResult {
  sessionId: string;
  answer: string;
  sources: ChatSource[];
  fallback_triggered: boolean;
  escalated?: boolean;
  messageIndex: number;
}

interface SessionData {
  userId: string;
  messages: ChatMessage[];
  fallbackUnlocked: boolean; // true after a fallback response — unlocks #escalate
}

// Thrown by callOllamaLlm when the Ollama process is not reachable.
// Surfaces as a 503 OLLAMA_NOT_CONNECTED to the client instead of a silent fallback.
class OllamaConnectionError extends Error {
  constructor(cause?: unknown) {
    super('Ollama service is not running or unreachable');
    this.name = 'OllamaConnectionError';
    if (cause instanceof Error) this.cause = cause;
  }
}

// ─── In-process session cache (30-min idle TTL) ───────────────────────────────

const SESSION_TTL_MS = 30 * 60 * 1000;
const sessionCache = createTtlCache<SessionData>({ ttlMs: SESSION_TTL_MS, maxEntries: 500 });

// ─── Yaksha system prompt ─────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are Yaksha, the official Samagama Internship Portal assistant. \
Your role is to answer student questions about the internship programme based ONLY on the verified FAQ context provided below.

Rules:
- Answer concisely and clearly in 2-4 sentences.
- Use ONLY information from the provided context. Never invent deadlines, stipends, or policies.
- If the answer is not in the context, reply EXACTLY with: "I don't have an answer for you at the moment. You can raise a query for it."
- Be friendly and professional. Address the student directly.
- Do NOT repeat the question back.`;

const FALLBACK_STRING =
  "I don't have an answer for you at the moment. You can raise a query for it.";

// ─── Main chat query ──────────────────────────────────────────────────────────

export const chatbotService = {
  /** Process a student message and return Yaksha's response. */
  async processQuery(
    userId: string,
    sessionId: string | undefined,
    message: string,
  ): Promise<ChatQueryResult> {
    const sid = sessionId ?? randomUUID();
    const session = sessionCache.get(sid) ?? { userId, messages: [], fallbackUnlocked: false };

    const trimmed = message.trim();

    // ── Escalation commands ────────────────────────────────────────────────────
    const isForceEscalate = /^#forceescalate/i.test(trimmed);
    const isEscalate = /^#escalate/i.test(trimmed) && !isForceEscalate;

    if (isForceEscalate || (isEscalate && session.fallbackUnlocked)) {
      return this.handleEscalation(
        userId,
        sid,
        session,
        trimmed,
        isForceEscalate ? 'force' : 'standard',
      );
    }

    if (isEscalate && !session.fallbackUnlocked) {
      const answer =
        'Escalation is only available after Yaksha cannot answer your question. Please ask your question first.';
      session.messages.push({ role: 'user', content: trimmed });
      session.messages.push({ role: 'assistant', content: answer });
      sessionCache.set(sid, session);
      return {
        sessionId: sid,
        answer,
        sources: [],
        fallback_triggered: false,
        messageIndex: session.messages.length - 1,
      };
    }

    // ── Retrieve FAQ context via embedding + cosine similarity ─────────────────
    const settings = await SystemSettingsModel.findById('global').lean();
    const threshold = settings?.chatbotConfidenceThreshold ?? 0.7;
    const maxSources = settings?.chatbotMaxSources ?? 6;

    const sources = await retrieveFaqSources(trimmed, { threshold, maxSources });

    // ── Call LLM ───────────────────────────────────────────────────────────────
    const history = session.messages.slice(-10); // keep last 5 turns (10 messages)
    const ragContext = sources.map((s) => `FAQ: ${s.title}\nAnswer: ${s.answer}`);

    let answer: string;
    let fallback_triggered: boolean;
    try {
      ({ answer, fallback_triggered } = await callLlm({
        system_instruction: SYSTEM_PROMPT,
        rag_context: ragContext,
        conversation_history: history,
        current_message: trimmed,
        sources,
      }));
    } catch (err) {
      if (err instanceof OllamaConnectionError) {
        throw new ApiError(503, 'OLLAMA_NOT_CONNECTED', 'Ollama service is not running.');
      }
      throw err;
    }

    // ── Update session ─────────────────────────────────────────────────────────
    session.messages.push({ role: 'user', content: trimmed });
    session.messages.push({ role: 'assistant', content: answer });
    if (fallback_triggered) session.fallbackUnlocked = true;
    sessionCache.set(sid, session);

    return {
      sessionId: sid,
      answer,
      sources: sources.map((s) => ({ id: s.id, title: s.title, similarity: s.similarity })),
      fallback_triggered,
      messageIndex: session.messages.length - 1,
    };
  },

  /** Handle #escalate or #forceescalate commands. */
  async handleEscalation(
    userId: string,
    sessionId: string,
    session: SessionData,
    message: string,
    type: 'standard' | 'force',
  ): Promise<ChatQueryResult> {
    const forceReason =
      type === 'force'
        ? message.replace(/^#forceescalate\s*/i, '').trim() || 'User requested escalation'
        : 'Chatbot could not answer — student escalating';

    let summary = `Issue escalated by student. Reason: ${forceReason}`;

    // Try summarisation via LLM server if available.
    if (env.LLM_PROVIDER === 'local-llama' && env.LLM_BASE_URL && env.LLM_INTERNAL_SECRET) {
      try {
        const res = await fetch(`${env.LLM_BASE_URL}/internal/llm/summarize`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${env.LLM_INTERNAL_SECRET}`,
          },
          body: JSON.stringify({
            escalation_type: type === 'force' ? 'force_escalate' : 'escalate',
            force_reason: forceReason,
            conversation_history: session.messages.slice(-10),
          }),
        });
        if (res.ok) {
          const json = (await res.json()) as { status: string; data: { summary: string } };
          if (json.status === 'success') summary = json.data.summary;
        }
      } catch (err) {
        logger.warn({ err }, 'LLM summarise call failed — using fallback summary');
      }
    }

    // Record escalation as a ChatFeedback with rating='incorrect' so it lands in the mod inbox.
    const lastUserMsg =
      session.messages.filter((m) => m.role === 'user').at(-1)?.content ?? message;
    await ChatFeedbackModel.create({
      chatSessionId: undefined,
      messageIndex: session.messages.length,
      query: lastUserMsg,
      answer: summary,
      rating: 'incorrect',
      comment: `Escalation (${type}): ${forceReason}`,
      userId: new Types.ObjectId(userId),
      status: 'open',
    });

    const answer = `✅ Your issue has been escalated to the moderation team. They'll review it shortly.\n\n**Summary:** ${summary}`;
    session.messages.push({ role: 'user', content: message });
    session.messages.push({ role: 'assistant', content: answer });
    session.fallbackUnlocked = false;
    sessionCache.set(sessionId, session);

    return {
      sessionId,
      answer,
      sources: [],
      fallback_triggered: false,
      escalated: true,
      messageIndex: session.messages.length - 1,
    };
  },

  /** Get all messages in a session for the frontend to restore state. */
  getSession(sessionId: string): ChatMessage[] {
    return sessionCache.get(sessionId)?.messages ?? [];
  },

  /** Student rates a bot response (helpful / incorrect). */
  async submitFeedback(opts: {
    userId: string;
    sessionId: string;
    messageIndex: number;
    rating: 'helpful' | 'incorrect';
    comment?: string;
  }): Promise<void> {
    const session = sessionCache.get(opts.sessionId);
    const botMsg = session?.messages[opts.messageIndex];
    const userMsg = session?.messages[opts.messageIndex - 1];

    const query = userMsg?.content ?? '';
    const answer = botMsg?.content ?? '';
    const messages = session?.messages ?? [];

    // Upsert so re-rating the same message updates the existing record instead of
    // creating a duplicate. Key on userId + messageIndex (unique per session message).
    await ChatFeedbackModel.findOneAndUpdate(
      { userId: new Types.ObjectId(opts.userId), messageIndex: opts.messageIndex },
      {
        $set: {
          rating: opts.rating,
          comment: opts.comment,
          status: 'open',
          query,
          answer,
          messages,
        },
        $setOnInsert: { chatSessionId: undefined },
      },
      { upsert: true, new: true },
    );
  },

  // ── Admin/mod read paths (unchanged) ──────────────────────────────────────

  async listFeedback(
    filter: 'all' | 'helpful' | 'unhelpful' | 'archived',
  ): Promise<PublicChatFeedback[]> {
    const q: Record<string, unknown> = {};
    if (filter === 'archived') {
      q.status = 'archived';
    } else {
      q.status = { $ne: 'archived' };
      if (filter === 'helpful') q.rating = 'helpful';
      if (filter === 'unhelpful') q.rating = 'incorrect';
    }

    interface PopulatedFeedback extends Omit<ChatFeedbackDocument, 'userId' | 'messages'> {
      userId: { _id: Types.ObjectId; name: string };
      messages?: Array<{ role: 'user' | 'assistant'; content: string }>;
    }

    const rows = await ChatFeedbackModel.find(q)
      .sort({ createdAt: -1 })
      .limit(200)
      .populate('userId', 'name')
      .lean<PopulatedFeedback[]>();

    return rows.map((f) => ({
      id: f._id.toString(),
      query: f.query,
      answer: f.answer,
      rating: f.rating,
      comment: f.comment ?? undefined,
      user: { id: f.userId._id.toString(), name: f.userId.name },
      status: f.status as 'open' | 'reviewed' | 'actioned' | 'archived',
      messages: f.messages && f.messages.length > 0 ? f.messages : undefined,
      createdAt: f.createdAt.toISOString(),
    }));
  },

  async getStats(): Promise<ChatbotFeedbackStats> {
    const activeFilter = { status: { $ne: 'archived' } };
    const [total, helpful, unhelpful] = await Promise.all([
      ChatFeedbackModel.countDocuments(activeFilter),
      ChatFeedbackModel.countDocuments({ ...activeFilter, rating: 'helpful' }),
      ChatFeedbackModel.countDocuments({ ...activeFilter, rating: 'incorrect' }),
    ]);
    return { total, helpful, unhelpful };
  },

  async updateFeedbackStatus(
    id: string,
    status: 'reviewed' | 'actioned' | 'archived',
  ): Promise<void> {
    await ChatFeedbackModel.findByIdAndUpdate(id, { $set: { status } });
  },

  async deleteFeedback(id: string): Promise<void> {
    await ChatFeedbackModel.findByIdAndDelete(id);
  },
};

// ─── FAQ retrieval via embedding similarity ───────────────────────────────────

interface FaqSource {
  id: string;
  title: string;
  answer: string;
  similarity: number;
}

async function retrieveFaqSources(
  query: string,
  opts: { threshold: number; maxSources: number },
): Promise<FaqSource[]> {
  const queryEmbedding = await generateEmbedding(query);

  // Load published FAQs with their embeddings.
  const faqs = await FaqModel.find({ status: 'published' })
    .select('title answer embedding')
    .lean<{ _id: unknown; title: string; answer: string; embedding?: number[] }[]>();

  const scored = faqs
    .filter((f) => f.embedding && f.embedding.length === 384)
    .map((f) => ({
      id: (f._id as { toString(): string }).toString(),
      title: f.title,
      answer: f.answer,
      similarity: cosineSimilarity(queryEmbedding, f.embedding!),
    }))
    .filter((r) => r.similarity >= opts.threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, opts.maxSources);

  // Fallback to text search when embeddings are not yet populated.
  if (scored.length === 0 && query.trim()) {
    const textResults = await FaqModel.find(
      { status: 'published', $text: { $search: query } },
      { score: { $meta: 'textScore' } },
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(opts.maxSources)
      .lean<{ _id: unknown; title: string; answer: string }[]>();

    return textResults.map((f) => ({
      id: (f._id as { toString(): string }).toString(),
      title: f.title,
      answer: f.answer,
      similarity: 0.5, // no cosine score available
    }));
  }

  return scored;
}

// ─── LLM provider dispatch ────────────────────────────────────────────────────

async function callLlm(opts: {
  system_instruction: string;
  rag_context: string[];
  conversation_history: ChatMessage[];
  current_message: string;
  sources: FaqSource[];
}): Promise<{ answer: string; fallback_triggered: boolean }> {
  if (env.LLM_PROVIDER === 'local-llama' && env.LLM_BASE_URL && env.LLM_INTERNAL_SECRET) {
    return callLlmServer(opts);
  }

  if (env.LLM_PROVIDER === 'gemini' && env.GEMINI_API_KEY) {
    return callGeminiLlm(opts);
  }

  if (env.LLM_PROVIDER === 'groq' && env.GROQ_API_KEY) {
    return callGroqLlm(opts);
  }

  if (env.LLM_PROVIDER === 'ollama') {
    return callOllamaLlm(opts);
  }

  // Mock LLM — derive answer from top FAQ source.
  return mockLlm(opts);
}

async function callLlmServer(opts: {
  system_instruction: string;
  rag_context: string[];
  conversation_history: ChatMessage[];
  current_message: string;
}): Promise<{ answer: string; fallback_triggered: boolean }> {
  try {
    const res = await fetch(`${env.LLM_BASE_URL}/internal/llm/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.LLM_INTERNAL_SECRET}`,
      },
      body: JSON.stringify({
        system_instruction: opts.system_instruction,
        rag_context: opts.rag_context,
        conversation_history: opts.conversation_history,
        current_message: opts.current_message,
      }),
    });

    if (!res.ok) throw new Error(`LLM server returned ${res.status}`);

    const json = (await res.json()) as {
      status: string;
      data: { response_text: string; fallback_triggered: boolean };
    };
    return { answer: json.data.response_text, fallback_triggered: json.data.fallback_triggered };
  } catch (err) {
    logger.warn({ err }, 'LLM server call failed — falling back to mock');
    return mockLlm({
      rag_context: opts.rag_context,
      current_message: opts.current_message,
      sources: [],
    });
  }
}

async function callGeminiLlm(opts: {
  system_instruction: string;
  rag_context: string[];
  conversation_history: ChatMessage[];
  current_message: string;
  sources: FaqSource[];
}): Promise<{ answer: string; fallback_triggered: boolean }> {
  try {
    const contextBlock =
      opts.rag_context.length > 0
        ? `\n\nAPPROVED FAQ CONTEXT:\n${opts.rag_context.join('\n\n')}`
        : '';

    const historyContents = opts.conversation_history.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const body = {
      system_instruction: { parts: [{ text: opts.system_instruction + contextBlock }] },
      contents: [...historyContents, { role: 'user', parts: [{ text: opts.current_message }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 500 },
    };

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    );

    if (!res.ok) throw new Error(`Gemini LLM error: ${res.status}`);

    const json = (await res.json()) as {
      candidates: { content: { parts: { text: string }[] } }[];
    };
    const answer = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? FALLBACK_STRING;
    const fallback_triggered =
      answer === FALLBACK_STRING || answer.includes("I don't have an answer");
    return { answer, fallback_triggered };
  } catch (err) {
    logger.warn({ err }, 'Gemini LLM call failed — falling back to mock');
    return mockLlm(opts);
  }
}

async function callOllamaLlm(opts: {
  system_instruction: string;
  rag_context: string[];
  conversation_history: ChatMessage[];
  current_message: string;
  sources: FaqSource[];
}): Promise<{ answer: string; fallback_triggered: boolean }> {
  try {
    const contextBlock =
      opts.rag_context.length > 0
        ? `\n\nAPPROVED FAQ CONTEXT:\n${opts.rag_context.join('\n\n')}`
        : '';

    const messages = [
      { role: 'system', content: opts.system_instruction + contextBlock },
      ...opts.conversation_history.map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
      { role: 'user', content: opts.current_message },
    ];

    const res = await fetch(`${env.OLLAMA_BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: env.OLLAMA_MODEL,
        messages,
        temperature: 0.2,
        max_tokens: 500,
        stream: false,
      }),
    });

    if (!res.ok) throw new Error(`Ollama returned ${res.status}: ${await res.text()}`);

    const json = (await res.json()) as { choices: { message: { content: string } }[] };
    const answer = json.choices?.[0]?.message?.content?.trim() ?? FALLBACK_STRING;
    const fallback_triggered =
      answer === FALLBACK_STRING || answer.includes("I don't have an answer");
    return { answer, fallback_triggered };
  } catch (err) {
    logger.error({ err }, 'Ollama connection failed — service may not be running');
    throw new OllamaConnectionError(err);
  }
}

/**
 * Groq inference — uses llama-3.3-70b-versatile by default.
 * Free tier: 14,400 requests/day, 30 requests/minute.
 * Groq's API is OpenAI-compatible, so the request shape is identical to Ollama.
 * Typical response time: 200–500 ms (significantly faster than Gemini chat).
 */
async function callGroqLlm(opts: {
  system_instruction: string;
  rag_context: string[];
  conversation_history: ChatMessage[];
  current_message: string;
  sources: FaqSource[];
}): Promise<{ answer: string; fallback_triggered: boolean }> {
  try {
    const contextBlock =
      opts.rag_context.length > 0
        ? `\n\nAPPROVED FAQ CONTEXT:\n${opts.rag_context.join('\n\n')}`
        : '';

    const messages = [
      { role: 'system', content: opts.system_instruction + contextBlock },
      ...opts.conversation_history.map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
      { role: 'user', content: opts.current_message },
    ];

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: env.GROQ_MODEL,
        messages,
        temperature: 0.2,
        max_tokens: 500,
        stream: false,
      }),
    });

    if (!res.ok) throw new Error(`Groq returned ${res.status}: ${await res.text()}`);

    const json = (await res.json()) as { choices: { message: { content: string } }[] };
    const answer = json.choices?.[0]?.message?.content?.trim() ?? FALLBACK_STRING;
    const fallback_triggered =
      answer === FALLBACK_STRING || answer.includes("I don't have an answer");
    return { answer, fallback_triggered };
  } catch (err) {
    logger.warn({ err }, 'Groq call failed — falling back to mock');
    return mockLlm({
      rag_context: opts.rag_context,
      current_message: opts.current_message,
      sources: opts.sources,
    });
  }
}

function mockLlm(opts: { rag_context: string[]; current_message: string; sources: FaqSource[] }): {
  answer: string;
  fallback_triggered: boolean;
} {
  if (opts.sources.length === 0 || opts.rag_context.length === 0) {
    return { answer: FALLBACK_STRING, fallback_triggered: true };
  }

  // Extract the answer portion from the top source.
  const top = opts.sources[0];
  const excerpt = top.answer.length > 400 ? top.answer.slice(0, 400) + '…' : top.answer;
  return {
    answer: `Based on the Samagama FAQ, here's what I found:\n\n${excerpt}\n\n*Source: ${top.title}*`,
    fallback_triggered: false,
  };
}
