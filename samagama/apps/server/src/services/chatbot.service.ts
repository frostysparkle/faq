import { ChatFeedbackModel, ChatSessionModel } from "../models/Chat.js";
import { FaqModel } from "../models/Faq.js";
import { AnswerModel } from "../models/Answer.js";
import { SearchLogModel } from "../models/SearchLog.js";
import { llmProvider } from "../providers/llm.provider.js";
import { AppError } from "../utils/AppError.js";
import { buildGroundedPrompt, type RetrievedContext } from "./promptBuilder.service.js";
import { retrieveKnowledgeSources } from "./search.service.js";

async function hydrateSources(query: string): Promise<RetrievedContext[]> {
  const sources = await retrieveKnowledgeSources(query);
  const contexts: RetrievedContext[] = [];

  for (const source of sources) {
    if (source.type === "faq") {
      const faq = await FaqModel.findById(source.id).lean();
      if (faq) contexts.push({ ...source, body: faq.answer });
    } else {
      const answer = await AnswerModel.findById(source.id).lean();
      if (answer) contexts.push({ ...source, body: answer.body });
    }
  }
  return contexts;
}

export async function queryChatbot(input: { message: string; sessionId?: string }, userId: string) {
  const sources = await hydrateSources(input.message);
  const prompt = buildGroundedPrompt(input.message, sources);
  const confidenceScore = sources[0]?.score ?? 0;
  const answer =
    sources.length === 0
      ? "I could not find a verified answer for this. You can post this in Community Q&A."
      : await llmProvider.generateAnswer({ question: input.message, prompt, sources });

  const session = input.sessionId
    ? await ChatSessionModel.findOne({ _id: input.sessionId, userId })
    : await ChatSessionModel.create({ userId, messages: [] });
  if (!session) throw new AppError(404, "CHAT_SESSION_NOT_FOUND", "Chat session was not found.");

  session.messages.push({ role: "user", content: input.message, createdAt: new Date() });
  session.messages.push({
    role: "assistant",
    content: answer,
    sourceFaqIds: sources.filter((source) => source.type === "faq").map((source) => source.id),
    sourceAnswerIds: sources
      .filter((source) => source.type === "answer")
      .map((source) => source.id),
    confidenceScore,
    createdAt: new Date()
  });
  await session.save();

  await SearchLogModel.create({
    userId,
    query: input.message,
    source: "chatbot",
    resultCount: sources.length,
    topScore: confidenceScore
  });

  return {
    sessionId: session.id,
    answer,
    sources,
    confidenceScore,
    fallback: sources.length === 0
  };
}

export async function listChatSessions(userId: string) {
  return ChatSessionModel.find({ userId }).sort({ updatedAt: -1 }).lean();
}

export async function getChatSession(id: string, userId: string) {
  const session = await ChatSessionModel.findOne({ _id: id, userId }).lean();
  if (!session) throw new AppError(404, "CHAT_SESSION_NOT_FOUND", "Chat session was not found.");
  return session;
}

export async function submitChatFeedback(
  input: {
    chatSessionId: string;
    messageIndex: number;
    rating: "helpful" | "incorrect";
    comment?: string;
  },
  userId: string
) {
  const session = await ChatSessionModel.findOne({ _id: input.chatSessionId, userId });
  if (!session) throw new AppError(404, "CHAT_SESSION_NOT_FOUND", "Chat session was not found.");
  return ChatFeedbackModel.create({ ...input, userId });
}
