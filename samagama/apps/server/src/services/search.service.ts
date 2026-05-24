import type { FilterQuery, SortOrder } from "mongoose";
import type { FaqSearchInput, SourceReference } from "@samagama/shared";
import { env } from "../config/env.js";
import { AnswerModel } from "../models/Answer.js";
import { FaqModel, type Faq } from "../models/Faq.js";
import { SearchLogModel } from "../models/SearchLog.js";
import { toPublicFaq } from "../utils/publicFaq.js";
import { cosineSimilarity, embeddingService } from "./embedding.service.js";

export interface RankedFaq {
  faq: unknown;
  score: number;
}

export async function searchFaqs(input: FaqSearchInput, userId?: string): Promise<RankedFaq[]> {
  const filter: FilterQuery<Faq> = {};
  if (input.status) filter.status = input.status;
  else filter.status = { $in: ["published", "outdated"] };
  if (input.categoryIds?.length) filter.categories = { $in: input.categoryIds };
  if (input.tagIds?.length) filter.tags = { $in: input.tagIds };

  const sort: Record<string, SortOrder> =
    input.sort === "recently_updated"
      ? { updatedAt: -1 }
      : input.sort === "most_viewed"
        ? { viewCount: -1 }
        : input.sort === "most_helpful"
          ? { helpfulCount: -1 }
          : { updatedAt: -1 };

  const candidateLimit = input.query ? 300 : input.limit * 3;
  const query = FaqModel.find(filter).populate("categories tags").sort(sort).lean();
  const candidates = await query.limit(candidateLimit);

  let ranked = candidates.map((faq) => ({ faq: toPublicFaq(faq), score: 0.5 }));
  if (input.query) {
    const queryEmbedding = await embeddingService.embed(input.query);
    ranked = candidates
      .map((faq) => {
        const semanticScore = cosineSimilarity(queryEmbedding, faq.embedding ?? []);
        const keywordScore = `${faq.title} ${faq.answer}`
          .toLowerCase()
          .includes(input.query!.toLowerCase())
          ? 1
          : 0;
        const freshnessScore = Math.max(
          0,
          1 - (Date.now() - new Date(faq.updatedAt).getTime()) / 2_592_000_000
        );
        const helpfulnessScore =
          faq.helpfulCount + faq.notHelpfulCount === 0
            ? 0
            : faq.helpfulCount / (faq.helpfulCount + faq.notHelpfulCount);
        const popularityScore = Math.min(1, faq.viewCount / 500);
        const score =
          0.45 * semanticScore +
          0.25 * keywordScore +
          0.15 * freshnessScore +
          0.1 * helpfulnessScore +
          0.05 * popularityScore;
        return { faq: toPublicFaq(faq), score: Number(score.toFixed(4)) };
      })
      .sort((left, right) => right.score - left.score);
  }

  const pageStart = (input.page - 1) * input.limit;
  const results = ranked.slice(pageStart, pageStart + input.limit);
  if (input.query) {
    await SearchLogModel.create({
      userId,
      query: input.query,
      source: "faq",
      resultCount: results.length,
      topScore: results[0]?.score ?? 0
    });
  }
  return results;
}

export async function retrieveKnowledgeSources(query: string): Promise<SourceReference[]> {
  const queryEmbedding = await embeddingService.embed(query);
  const faqs = await FaqModel.find({ status: "published" }).limit(200).lean();
  const answers = await AnswerModel.find({ status: "approved" }).limit(200).lean();

  const faqSources = faqs.map((faq) => ({
    id: String(faq._id),
    type: "faq" as const,
    title: faq.title,
    score: cosineSimilarity(queryEmbedding, faq.embedding ?? [])
  }));
  const answerSources = answers.map((answer) => ({
    id: String(answer._id),
    type: "answer" as const,
    title: `Community answer for question ${String(answer.questionId)}`,
    score: cosineSimilarity(queryEmbedding, answer.embedding ?? [])
  }));

  return [...faqSources, ...answerSources]
    .filter((source) => source.score >= env.CHATBOT_RETRIEVAL_THRESHOLD)
    .sort((left, right) => right.score - left.score)
    .slice(0, env.CHATBOT_MAX_SOURCES);
}
