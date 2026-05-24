import { toSlug, type FaqCreateInput, type FaqSearchInput } from "@samagama/shared";
import { FaqModel } from "../models/Faq.js";
import { UserModel } from "../models/User.js";
import { AppError } from "../utils/AppError.js";
import { toPublicFaq } from "../utils/publicFaq.js";
import { summarize } from "../utils/text.js";
import { embeddingService } from "./embedding.service.js";
import { searchFaqs } from "./search.service.js";

export async function listFaqs(input: FaqSearchInput, userId?: string) {
  return searchFaqs(input, userId);
}

export async function getFaqById(id: string) {
  const faq = await FaqModel.findById(id).populate("categories tags").lean();
  if (!faq) throw new AppError(404, "FAQ_NOT_FOUND", "FAQ was not found.");
  return toPublicFaq(faq);
}

export async function listRecentlyUpdatedFaqs(limit = 8) {
  return FaqModel.find({ status: { $in: ["published", "outdated"] } })
    .populate("categories tags")
    .sort({ updatedAt: -1 })
    .limit(limit)
    .lean()
    .then((faqs) => faqs.map((faq) => toPublicFaq(faq)));
}

export async function listRecentlyViewedFaqs(userId: string) {
  const user = await UserModel.findById(userId)
    .populate({
      path: "recentlyViewedFaqs.faqId",
      populate: [{ path: "categories" }, { path: "tags" }]
    })
    .lean();
  if (!user) throw new AppError(404, "USER_NOT_FOUND", "User was not found.");
  return user.recentlyViewedFaqs.map((item) => ({
    faq:
      typeof item.faqId === "object" && item.faqId !== null
        ? toPublicFaq(item.faqId as never)
        : item.faqId,
    viewedAt: item.viewedAt
  }));
}

export async function createFaq(input: FaqCreateInput, actorId: string) {
  const embedding = await embeddingService.embed(`${input.title}\n${input.answer}`);
  const status = input.status ?? "draft";
  const faq = await FaqModel.create({
    title: input.title,
    slug: toSlug(input.title),
    answer: input.answer,
    summary: input.summary ?? summarize(input.answer),
    categories: input.categoryIds,
    tags: input.tagIds,
    status,
    sourceType: "manual",
    embedding,
    indexingStatus: status === "published" ? "indexed" : "pending",
    duplicateOverrideJustification: input.duplicateOverrideJustification,
    createdBy: actorId,
    updatedBy: actorId,
    publishedAt: status === "published" ? new Date() : undefined
  });
  return toPublicFaq(faq.toObject() as never);
}

export async function updateFaq(id: string, input: Partial<FaqCreateInput>, actorId: string) {
  const existing = await FaqModel.findById(id);
  if (!existing) throw new AppError(404, "FAQ_NOT_FOUND", "FAQ was not found.");

  const title = input.title ?? existing.title;
  const answer = input.answer ?? existing.answer;
  const status = input.status ?? existing.status;
  const shouldReembed =
    input.title !== undefined || input.answer !== undefined || input.status === "published";
  const embedding = shouldReembed
    ? await embeddingService.embed(`${title}\n${answer}`)
    : existing.embedding;

  existing.set({
    title,
    slug: input.title ? toSlug(input.title) : existing.slug,
    answer,
    summary: input.summary ?? existing.summary,
    categories: input.categoryIds ?? existing.categories,
    tags: input.tagIds ?? existing.tags,
    status,
    embedding,
    indexingStatus: status === "published" ? "indexed" : existing.indexingStatus,
    updatedBy: actorId,
    publishedAt: status === "published" && !existing.publishedAt ? new Date() : existing.publishedAt
  });
  const saved = await existing.save();
  return toPublicFaq(saved.toObject() as never);
}

export async function archiveFaq(id: string, actorId: string) {
  return updateFaq(id, { status: "archived" }, actorId);
}

export async function recordFaqView(faqId: string, userId: string) {
  const faq = await FaqModel.findByIdAndUpdate(faqId, { $inc: { viewCount: 1 } }, { new: true });
  if (!faq) throw new AppError(404, "FAQ_NOT_FOUND", "FAQ was not found.");

  await UserModel.findByIdAndUpdate(userId, {
    $pull: { recentlyViewedFaqs: { faqId } }
  });
  await UserModel.findByIdAndUpdate(userId, {
    $push: {
      recentlyViewedFaqs: {
        $each: [{ faqId, viewedAt: new Date() }],
        $position: 0,
        $slice: 20
      }
    }
  });
  return toPublicFaq(faq.toObject() as never);
}

export async function rateFaq(faqId: string, rating: "helpful" | "not_helpful") {
  const field = rating === "helpful" ? "helpfulCount" : "notHelpfulCount";
  const faq = await FaqModel.findByIdAndUpdate(faqId, { $inc: { [field]: 1 } }, { new: true });
  if (!faq) throw new AppError(404, "FAQ_NOT_FOUND", "FAQ was not found.");
  return toPublicFaq(faq.toObject() as never);
}

export async function checkFaqDuplicates(title: string, body: string, excludeFaqId?: string) {
  const queryEmbedding = await embeddingService.embed(`${title}\n${body}`);
  const filter = excludeFaqId
    ? { status: "published", _id: { $ne: excludeFaqId } }
    : { status: "published" };
  const faqs = await FaqModel.find(filter).limit(300).lean();
  const { cosineSimilarity } = await import("./embedding.service.js");

  return faqs
    .map((faq) => ({
      faq,
      score: cosineSimilarity(queryEmbedding, faq.embedding ?? [])
    }))
    .filter((candidate) => candidate.score >= 0.6)
    .sort((left, right) => right.score - left.score)
    .slice(0, 10);
}
