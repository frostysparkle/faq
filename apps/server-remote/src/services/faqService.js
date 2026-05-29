import mongoose from "mongoose";
import { ANALYTICS_EVENTS } from "../constants/analyticsEvents.js";
import { ERROR_CODES } from "../constants/errorCodes.js";
import { HTTP_STATUS } from "../constants/httpStatus.js";
import { FAQ_SOURCE_TYPE, FAQ_STATUS, FEEDBACK_VALUE, QUESTION_STATUS } from "../constants/statuses.js";
import AnalyticsEvent from "../models/AnalyticsEvent.js";
import Answer from "../models/Answer.js";
import Category from "../models/Category.js";
import Faq from "../models/Faq.js";
import FeedbackEvent from "../models/FeedbackEvent.js";
import Question from "../models/Question.js";
import SearchLog from "../models/SearchLog.js";
import Tag from "../models/Tag.js";
import User from "../models/User.js";
import { AppError } from "../utils/AppError.js";
import { logAudit } from "../utils/auditLog.js";
import {
  cosineSimilarity,
  generateFaqEmbedding,
  generateQueryEmbedding
} from "../utils/embeddings.js";

const REQUIRED_FAQ_FIELDS = ["title", "answer", "summary", "categories", "tags"];
const UPDATE_ALLOWED_FIELDS = [
  "title",
  "answer",
  "summary",
  "categories",
  "tags",
  "reviewState",
  "duplicateOf",
  "lastReviewedAt"
];
const VIEW_DEBOUNCE_MS = 10 * 60 * 1000;
const faqViewWindow = new Map();

const statusTransitions = Object.freeze({
  [FAQ_STATUS.DRAFT]: [FAQ_STATUS.PUBLISHED],
  [FAQ_STATUS.PUBLISHED]: [FAQ_STATUS.NEEDS_REVIEW, FAQ_STATUS.ARCHIVED],
  [FAQ_STATUS.ARCHIVED]: [FAQ_STATUS.DRAFT],
  [FAQ_STATUS.NEEDS_REVIEW]: [FAQ_STATUS.PUBLISHED, FAQ_STATUS.ARCHIVED]
});

const normalizeId = (value) => value?.toString();

const normalizeIds = (values = []) => values.map((value) => normalizeId(value)).filter(Boolean);

const stripEmbedding = (value) => {
  if (!value) {
    return value;
  }

  const plain = typeof value.toObject === "function" ? value.toObject({ virtuals: true }) : { ...value };
  delete plain.embedding;
  return plain;
};

const ensureObjectId = (id, code = "INVALID_ID") => {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError("Invalid resource identifier", HTTP_STATUS.BAD_REQUEST, code);
  }
};

const ensureRequiredFaqPayload = (payload) => {
  const missing = REQUIRED_FAQ_FIELDS.filter((field) => payload[field] === undefined);

  if (missing.length > 0) {
    throw new AppError("Missing required FAQ fields", HTTP_STATUS.BAD_REQUEST, "FAQ_VALIDATION_FAILED", { missing });
  }

  if (!payload.title?.trim() || !payload.answer?.trim() || !payload.summary?.trim()) {
    throw new AppError("FAQ title, answer, and summary are required", HTTP_STATUS.BAD_REQUEST, "FAQ_VALIDATION_FAILED");
  }

  if (!Array.isArray(payload.categories) || payload.categories.length === 0) {
    throw new AppError("At least one category is required", HTTP_STATUS.BAD_REQUEST, "FAQ_VALIDATION_FAILED");
  }

  if (!Array.isArray(payload.tags) || payload.tags.length === 0) {
    throw new AppError("At least one tag is required", HTTP_STATUS.BAD_REQUEST, "FAQ_VALIDATION_FAILED");
  }
};

const ensureReferencesExist = async ({ categories, tags }) => {
  if (categories !== undefined) {
    const categoryIds = normalizeIds(categories);
    const categoryCount = await Category.countDocuments({ _id: { $in: categoryIds } });

    if (categoryCount !== categoryIds.length) {
      throw new AppError("One or more categories do not exist", HTTP_STATUS.BAD_REQUEST, "CATEGORY_NOT_FOUND");
    }
  }

  if (tags !== undefined) {
    const tagIds = normalizeIds(tags);
    const tagCount = await Tag.countDocuments({ _id: { $in: tagIds } });

    if (tagCount !== tagIds.length) {
      throw new AppError("One or more tags do not exist", HTTP_STATUS.BAD_REQUEST, "TAG_NOT_FOUND");
    }
  }
};

const scheduleFaqEmbedding = (faq) => {
  generateFaqEmbedding(faq)
    .then((vector) => {
      if (vector) {
        return Faq.findByIdAndUpdate(faq._id, { embedding: vector });
      }

      return null;
    })
    .catch((err) => console.warn("[FAQ] Embedding backfill failed:", err.message));
};

const tokenize = (text) => {
  const stopwords = new Set(["the", "a", "an", "is", "are", "was", "were", "to", "of", "in", "and", "or", "for", "on", "at", "by", "with"]);

  return new Set(
    (text || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopwords.has(word))
  );
};

const jaccard = (setA, setB) => {
  const intersection = new Set([...setA].filter((value) => setB.has(value)));
  const union = new Set([...setA, ...setB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
};

export const createFaq = async (adminId, payload) => {
  ensureRequiredFaqPayload(payload);
  await ensureReferencesExist(payload);
  await checkSimilarity({
    title: payload.title,
    answer: payload.answer,
    categories: payload.categories,
    tags: payload.tags
  });

  const savedFaq = await Faq.create({
    title: payload.title,
    answer: payload.answer,
    summary: payload.summary,
    categories: payload.categories,
    tags: payload.tags,
    status: FAQ_STATUS.DRAFT,
    createdBy: adminId
  });

  scheduleFaqEmbedding(savedFaq);
  await logAudit(adminId, "FAQ_CREATED", "faq", savedFaq._id, null, stripEmbedding(savedFaq));

  return stripEmbedding(savedFaq);
};

export const updateFaq = async (adminId, faqId, payload) => {
  ensureObjectId(faqId, "FAQ_NOT_FOUND");

  const existing = await Faq.findById(faqId);

  if (!existing) {
    throw new AppError("FAQ not found", HTTP_STATUS.NOT_FOUND, "FAQ_NOT_FOUND");
  }

  const contentChanged = ["title", "summary", "answer"].some(
    (field) => payload[field] !== undefined && payload[field] !== existing[field]
  );
  const before = stripEmbedding(existing);

  for (const field of UPDATE_ALLOWED_FIELDS) {
    if (payload[field] !== undefined) {
      existing[field] = payload[field];
    }
  }

  await ensureReferencesExist({
    categories: payload.categories,
    tags: payload.tags
  });

  existing.updatedBy = adminId;
  await existing.save();

  if (contentChanged) {
    scheduleFaqEmbedding(existing);
  }

  const after = stripEmbedding(existing);
  await logAudit(adminId, "FAQ_UPDATED", "faq", existing._id, before, after);

  return after;
};

export const changeFaqStatus = async (adminId, faqId, newStatus) => {
  ensureObjectId(faqId, "FAQ_NOT_FOUND");

  const faq = await Faq.findById(faqId);

  if (!faq) {
    throw new AppError("FAQ not found", HTTP_STATUS.NOT_FOUND, "FAQ_NOT_FOUND");
  }

  if (!statusTransitions[faq.status]?.includes(newStatus)) {
    throw new AppError("Invalid status transition", HTTP_STATUS.BAD_REQUEST, "INVALID_TRANSITION");
  }

  const before = stripEmbedding(faq);
  faq.status = newStatus;
  faq.updatedBy = adminId;

  if (newStatus === FAQ_STATUS.PUBLISHED) {
    faq.publishedAt = new Date();
  }

  await faq.save();
  const after = stripEmbedding(faq);
  await logAudit(adminId, "FAQ_STATUS_CHANGED", "faq", faq._id, before, after);

  return after;
};

export const searchFaqs = async (
  userId,
  userRole,
  { query, categoryId, tagId, tagIds = [], status, page = 1, limit = 20 }
) => {
  const normalizedPage = Number(page);
  const normalizedLimit = Number(limit);
  const filter = {};

  if (userRole === "student") {
    filter.status = FAQ_STATUS.PUBLISHED;
  } else if (status) {
    filter.status = status;
  }

  if (categoryId) {
    filter.categories = categoryId;
  }

  if (tagIds.length > 0) {
    filter.tags = { $all: tagIds };
  } else if (tagId) {
    filter.tags = tagId;
  }

  if (!query || query.trim() === "") {
    const [faqs, total] = await Promise.all([
      Faq.find(filter)
        .sort({ qualityScore: -1, updatedAt: -1 })
        .skip((normalizedPage - 1) * normalizedLimit)
        .limit(normalizedLimit)
        .populate("categories", "name slug")
        .populate("tags", "name slug"),
      Faq.countDocuments(filter)
    ]);

    return {
      faqs: faqs.map(stripEmbedding),
      total,
      page: normalizedPage,
      totalPages: Math.ceil(total / normalizedLimit),
      searchMode: "filter"
    };
  }

  const [queryEmbedding, keywordResults] = await Promise.all([
    generateQueryEmbedding(query),
    Faq.find({ ...filter, $text: { $search: query } }, { score: { $meta: "textScore" } })
      .sort({ score: { $meta: "textScore" } })
      .limit(40)
      .populate("categories", "name slug")
      .populate("tags", "name slug")
      .lean()
  ]);

  let semanticResults = [];

  if (queryEmbedding) {
    // For 10,000+ FAQs, pre-filter by category before fetching embeddings.
    const candidates = await Faq.find(filter)
      .select("+embedding")
      .populate("categories", "name slug")
      .populate("tags", "name slug")
      .lean();

    semanticResults = candidates
      .filter((faq) => faq.embedding && faq.embedding.length === 384)
      .map((faq) => ({
        ...faq,
        semanticScore: cosineSimilarity(queryEmbedding, faq.embedding),
        embedding: undefined
      }))
      .filter((faq) => faq.semanticScore > 0.25);
  }

  const resultMap = new Map();
  const maxTextScore = keywordResults[0]?.score || 1;

  for (const faq of keywordResults) {
    const keywordScore = Math.min((faq.score || 0) / maxTextScore, 1);
    resultMap.set(faq._id.toString(), { ...faq, keywordScore, semanticScore: 0 });
  }

  for (const faq of semanticResults) {
    const key = faq._id.toString();

    if (resultMap.has(key)) {
      resultMap.get(key).semanticScore = faq.semanticScore;
    } else {
      resultMap.set(key, { ...faq, keywordScore: 0 });
    }
  }

  const now = Date.now();
  const scored = Array.from(resultMap.values()).map((faq) => {
    const daysSinceUpdate = (now - new Date(faq.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
    const helpfulnessScore = faq.helpfulCount / (faq.helpfulCount + faq.notHelpfulCount + 1);
    const freshnessScore = Math.max(0, 1 - daysSinceUpdate / 90);
    const popularityScore = Math.min((faq.viewCount || 0) / 1000, 1);

    const finalScore =
      0.35 * (faq.semanticScore || 0) +
      0.25 * (faq.keywordScore || 0) +
      0.2 * helpfulnessScore +
      0.12 * freshnessScore +
      0.05 * (categoryId && faq.categories?.some((category) => category._id.toString() === categoryId) ? 1 : 0.8) +
      0.03 * popularityScore;

    const factors = [];
    if ((faq.semanticScore || 0) > 0.7) factors.push("Strong semantic match");
    else if ((faq.semanticScore || 0) > 0.45) factors.push("Semantic match");
    if ((faq.keywordScore || 0) > 0.6) factors.push("Keyword match");
    if (helpfulnessScore > 0.7) factors.push("Highly rated");
    if (freshnessScore > 0.8) factors.push("Recently updated");
    const resultExplanation = factors.join(" | ") || "Related content";

    return { ...faq, finalScore, resultExplanation };
  });

  scored.sort((a, b) => b.finalScore - a.finalScore);

  if (scored.length === 0) {
    SearchLog.create({
      userId,
      query,
      normalizedQuery: query.toLowerCase().trim().replace(/\s+/g, " "),
      filters: { categoryId, tagId, status },
      resultCount: 0
    }).catch((err) => console.warn("[SearchLog] Failed to log:", err.message));
  }

  const total = scored.length;
  const paginated = scored.slice((normalizedPage - 1) * normalizedLimit, normalizedPage * normalizedLimit);
  const clean = paginated.map(({ embedding: _embedding, ...rest }) => rest);

  return {
    faqs: clean,
    total,
    page: normalizedPage,
    totalPages: Math.ceil(total / normalizedLimit),
    query,
    searchMode: queryEmbedding ? "hybrid" : "keyword_only"
  };
};

export const getFaqById = async (userId, faqId) => {
  ensureObjectId(faqId, "FAQ_NOT_FOUND");

  const faq = await Faq.findById(faqId).populate("categories", "name slug").populate("tags", "name slug");

  if (!faq) {
    throw new AppError("FAQ not found", HTTP_STATUS.NOT_FOUND, "FAQ_NOT_FOUND");
  }

  const now = new Date();
  await Faq.findByIdAndUpdate(faqId, { $inc: { viewCount: 1 } });
  await User.findById(userId).then(async (user) => {
    if (!user) return;

    const latest = [
      { faqId, viewedAt: now },
      ...user.recentlyViewedFaqs.filter((item) => item.faqId.toString() !== faqId)
    ].slice(0, 20);
    user.recentlyViewedFaqs = latest;
    await user.save();
  });

  AnalyticsEvent.create({
    actorId: userId,
    eventType: ANALYTICS_EVENTS.FAQ_VIEWED,
    entityType: "faq",
    entityId: faqId,
    metadata: { viewedAt: now }
  }).catch((err) => console.warn("[AnalyticsEvent] Failed to log:", err.message));

  const relatedFilter = {
    _id: { $ne: faq._id },
    status: FAQ_STATUS.PUBLISHED,
    $or: [{ categories: { $in: faq.categories.map((category) => category._id) } }, { tags: { $in: faq.tags.map((tag) => tag._id) } }]
  };
  const relatedFaqs = await Faq.find(relatedFilter)
    .sort({ qualityScore: -1, updatedAt: -1 })
    .limit(4)
    .populate("categories", "name slug")
    .populate("tags", "name slug");

  return {
    faq: stripEmbedding(faq),
    relatedFaqs: relatedFaqs.map(stripEmbedding)
  };
};

export const trackFaqView = async (userId, faqId) => {
  ensureObjectId(faqId, "FAQ_NOT_FOUND");

  const key = `${userId}:${faqId}`;
  const now = Date.now();
  const previousViewAt = faqViewWindow.get(key) ?? 0;

  if (now - previousViewAt < VIEW_DEBOUNCE_MS) {
    const faq = await Faq.findById(faqId).select("viewCount");
    return { tracked: false, viewCount: faq?.viewCount ?? 0 };
  }

  faqViewWindow.set(key, now);
  const faq = await Faq.findByIdAndUpdate(faqId, { $inc: { viewCount: 1 } }, { new: true }).select("viewCount");

  if (!faq) {
    throw new AppError("FAQ not found", HTTP_STATUS.NOT_FOUND, "FAQ_NOT_FOUND");
  }

  return { tracked: true, viewCount: faq.viewCount };
};

export const recordFeedback = async (userId, faqId, value) => {
  ensureObjectId(faqId, "FAQ_NOT_FOUND");

  if (![FEEDBACK_VALUE.HELPFUL, FEEDBACK_VALUE.NOT_HELPFUL].includes(value)) {
    throw new AppError("Invalid feedback value", HTTP_STATUS.BAD_REQUEST, ERROR_CODES.BAD_REQUEST);
  }

  const faq = await Faq.findById(faqId).select("helpfulCount notHelpfulCount");

  if (!faq) {
    throw new AppError("FAQ not found", HTTP_STATUS.NOT_FOUND, "FAQ_NOT_FOUND");
  }

  const previous = await FeedbackEvent.findOne({ userId, entityType: "faq", entityId: faqId });
  const inc = {};

  if (!previous) {
    inc[value === FEEDBACK_VALUE.HELPFUL ? "helpfulCount" : "notHelpfulCount"] = 1;
  } else if (previous.value !== value) {
    inc[previous.value === FEEDBACK_VALUE.HELPFUL ? "helpfulCount" : "notHelpfulCount"] = -1;
    inc[value === FEEDBACK_VALUE.HELPFUL ? "helpfulCount" : "notHelpfulCount"] = 1;
  }

  await FeedbackEvent.findOneAndUpdate(
    { userId, entityType: "faq", entityId: faqId },
    {
      $set: { value },
      $setOnInsert: { userId, entityType: "faq", entityId: faqId }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const updatedFaq =
    Object.keys(inc).length > 0
      ? await Faq.findByIdAndUpdate(faqId, { $inc: inc }, { new: true }).select("helpfulCount notHelpfulCount")
      : faq;

  recalculateQualityScore(faqId).catch((err) => console.warn("[Quality] Recalc failed:", err.message));

  return {
    helpfulCount: updatedFaq.helpfulCount,
    notHelpfulCount: updatedFaq.notHelpfulCount
  };
};

export const checkSimilarity = async ({ title, answer, categories, tags }) => {
  const inputText = `${title}. ${(answer || "").slice(0, 300)}`;
  const inputEmbedding = await generateQueryEmbedding(inputText);
  const semanticScores = new Map();

  if (inputEmbedding) {
    const candidates = await Faq.find({ status: FAQ_STATUS.PUBLISHED }).select("+embedding _id title").lean();

    for (const candidate of candidates) {
      if (candidate.embedding?.length === 384) {
        const score = cosineSimilarity(inputEmbedding, candidate.embedding);
        if (score > 0.3) semanticScores.set(candidate._id.toString(), score);
      }
    }
  }

  const inputTitleTokens = tokenize(title);
  const inputBodyTokens = tokenize((answer || "").slice(0, 500));
  const keywordCandidates = await Faq.find({ status: FAQ_STATUS.PUBLISHED }).select("_id title answer categories tags").lean();
  const keywordScores = new Map();

  for (const candidate of keywordCandidates) {
    const titleOverlap = jaccard(inputTitleTokens, tokenize(candidate.title));
    const bodyOverlap = jaccard(inputBodyTokens, tokenize((candidate.answer || "").slice(0, 500)));
    const categoryOverlap = (categories || []).some((category) =>
      (candidate.categories || []).map(String).includes(String(category))
    )
      ? 1
      : 0;
    const tagUnion = new Set([...(tags || []).map(String), ...(candidate.tags || []).map(String)]);
    const tagIntersection = (tags || []).filter((tag) => (candidate.tags || []).map(String).includes(String(tag)));
    const tagOverlap = tagUnion.size === 0 ? 0 : tagIntersection.length / tagUnion.size;
    const keywordScore = 0.4 * titleOverlap + 0.25 * bodyOverlap + 0.2 * categoryOverlap + 0.15 * tagOverlap;

    if (keywordScore > 0.15) {
      keywordScores.set(candidate._id.toString(), keywordScore);
    }
  }

  const allIds = new Set([...semanticScores.keys(), ...keywordScores.keys()]);
  const merged = [];

  for (const id of allIds) {
    const semanticScore = semanticScores.get(id) || 0;
    const keywordScore = keywordScores.get(id) || 0;
    const finalSimilarity = inputEmbedding ? 0.6 * semanticScore + 0.4 * keywordScore : keywordScore;

    if (finalSimilarity >= 0.3) {
      const faq = keywordCandidates.find((candidate) => candidate._id.toString() === id);
      merged.push({ faqId: id, title: faq?.title, finalSimilarity, semanticScore, keywordScore });
    }
  }

  merged.sort((a, b) => b.finalSimilarity - a.finalSimilarity);
  return merged.slice(0, 5);
};

export const recalculateQualityScore = async (faqId) => {
  const qualityScore = await Faq.calculateQualityScore(faqId);
  await Faq.findByIdAndUpdate(faqId, { qualityScore });
  return qualityScore;
};

export const convertQuestionAnswerToFaq = async (adminId, questionId, answerId, payload) => {
  ensureObjectId(questionId, "QUESTION_NOT_FOUND");
  ensureObjectId(answerId, "ANSWER_NOT_FOUND");

  const [question, answer] = await Promise.all([Question.findById(questionId), Answer.findById(answerId)]);

  if (!question) {
    throw new AppError("Question not found", HTTP_STATUS.NOT_FOUND, "QUESTION_NOT_FOUND");
  }

  if (!answer) {
    throw new AppError("Answer not found", HTTP_STATUS.NOT_FOUND, "ANSWER_NOT_FOUND");
  }

  const faq = await Faq.create({
    title: payload.title ?? question.title,
    answer: payload.answer ?? answer.body,
    summary: payload.summary,
    categories: payload.categories ?? [question.categoryId],
    tags: payload.tags ?? question.tags,
    status: FAQ_STATUS.DRAFT,
    sourceType: FAQ_SOURCE_TYPE.COMMUNITY_CONVERSION,
    sourceQuestionId: questionId,
    createdBy: adminId
  });

  answer.eligibleForFaqConversion = true;
  answer.convertedFaqId = faq._id;
  await answer.save();

  if ([QUESTION_STATUS.OPEN, QUESTION_STATUS.ANSWERED].includes(question.status)) {
    question.status = QUESTION_STATUS.RESOLVED;
    question.resolvedAt = new Date();
    await question.save();
  }

  scheduleFaqEmbedding(faq);
  await logAudit(adminId, "FAQ_CONVERTED_FROM_QUESTION", "faq", faq._id, null, stripEmbedding(faq));

  return stripEmbedding(faq);
};
