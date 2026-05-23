import mongoose from "mongoose";
import { ANALYTICS_EVENTS } from "../constants/analyticsEvents.js";
import { HTTP_STATUS } from "../constants/httpStatus.js";
import { USER_ROLES } from "../constants/roles.js";
import { ANSWER_STATUS, FAQ_STATUS, FEEDBACK_ENTITY_TYPE, FEEDBACK_VALUE, QUESTION_STATUS } from "../constants/statuses.js";
import Answer from "../models/Answer.js";
import AnalyticsEvent from "../models/AnalyticsEvent.js";
import FeedbackEvent from "../models/FeedbackEvent.js";
import Faq from "../models/Faq.js";
import Question from "../models/Question.js";
import SearchLog from "../models/SearchLog.js";
import { AppError } from "../utils/AppError.js";
import { logAudit } from "../utils/auditLog.js";
import { cosineSimilarity, generateQueryEmbedding } from "../utils/embeddings.js";

const CHECK_TTL_MS = 10 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const ensureObjectId = (id, code = "INVALID_IDENTIFIER") => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError("Invalid resource identifier", HTTP_STATUS.BAD_REQUEST, code);
  }
};

const normalizePage = (page) => Math.max(Number(page) || 1, 1);
const normalizeLimit = (limit) => Math.min(Math.max(Number(limit) || 20, 1), 100);

const buildQuestionPreview = (description = "") => description.slice(0, 150);

const stripEmbedding = (item) => {
  if (!item) return item;
  const { embedding: _embedding, ...rest } = item;
  return rest;
};

export const checkExistingAnswers = async (userId, { query, categoryId, tags = [] }) => {
  const queryEmbedding = await generateQueryEmbedding(query);

  const [semanticFaqs, semanticQuestions, keywordFaqs, keywordQuestions] = await Promise.all([
    queryEmbedding
      ? Faq.find({ status: FAQ_STATUS.PUBLISHED })
          .select("+embedding _id title summary categories status")
          .lean()
      : Promise.resolve([]),
    queryEmbedding
      ? Question.find({ status: QUESTION_STATUS.RESOLVED })
          .select("+embedding _id title description categoryId status")
          .lean()
      : Promise.resolve([]),
    Faq.find(
      { status: FAQ_STATUS.PUBLISHED, $text: { $search: query } },
      { score: { $meta: "textScore" } }
    )
      .sort({ score: { $meta: "textScore" } })
      .limit(15)
      .populate("categories", "name")
      .lean(),
    Question.find(
      { status: QUESTION_STATUS.RESOLVED, $text: { $search: query } },
      { score: { $meta: "textScore" } }
    )
      .sort({ score: { $meta: "textScore" } })
      .limit(15)
      .lean()
  ]);

  const resultMap = new Map();
  const maxFaqKeywordScore = keywordFaqs[0]?.score || 1;

  for (const faq of keywordFaqs) {
    const key = `faq:${faq._id}`;
    resultMap.set(key, {
      _id: faq._id,
      type: "faq",
      title: faq.title,
      preview: faq.summary,
      category: faq.categories?.[0]?.name,
      keywordScore: Math.min((faq.score || 0) / maxFaqKeywordScore, 1),
      semanticScore: 0
    });
  }

  const maxQKeywordScore = keywordQuestions[0]?.score || 1;

  for (const question of keywordQuestions) {
    const key = `question:${question._id}`;
    resultMap.set(key, {
      _id: question._id,
      type: "question",
      title: question.title,
      preview: buildQuestionPreview(question.description),
      keywordScore: Math.min((question.score || 0) / maxQKeywordScore, 1),
      semanticScore: 0
    });
  }

  if (queryEmbedding) {
    for (const faq of semanticFaqs) {
      if (!faq.embedding || faq.embedding.length !== 384) continue;

      const semanticScore = cosineSimilarity(queryEmbedding, faq.embedding);
      if (semanticScore < 0.3) continue;

      const key = `faq:${faq._id}`;

      if (resultMap.has(key)) {
        resultMap.get(key).semanticScore = semanticScore;
      } else {
        resultMap.set(key, {
          _id: faq._id,
          type: "faq",
          title: faq.title,
          preview: faq.summary,
          keywordScore: 0,
          semanticScore
        });
      }
    }

    for (const question of semanticQuestions) {
      if (!question.embedding || question.embedding.length !== 384) continue;

      const semanticScore = cosineSimilarity(queryEmbedding, question.embedding);
      if (semanticScore < 0.3) continue;

      const key = `question:${question._id}`;

      if (resultMap.has(key)) {
        resultMap.get(key).semanticScore = semanticScore;
      } else {
        resultMap.set(key, {
          _id: question._id,
          type: "question",
          title: question.title,
          preview: buildQuestionPreview(question.description),
          keywordScore: 0,
          semanticScore
        });
      }
    }
  }

  const results = Array.from(resultMap.values())
    .map((item) => {
      const finalScore = queryEmbedding ? 0.65 * item.semanticScore + 0.35 * item.keywordScore : item.keywordScore;
      const relevanceLabel = finalScore > 0.8 ? "Strong match" : finalScore > 0.55 ? "Possible match" : "Related";

      return { ...item, finalScore, relevanceLabel };
    })
    .filter((item) => item.finalScore >= 0.4)
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, 8);

  const clean = results.map(stripEmbedding);

  SearchLog.create({
    userId,
    query,
    normalizedQuery: query.toLowerCase().trim().replace(/\s+/g, " "),
    filters: { categoryId, tags },
    resultCount: clean.length
  }).catch((err) => console.warn("[QuestionCheck] SearchLog failed:", err.message));

  return {
    matches: clean,
    query,
    checkedAt: new Date(),
    searchMode: queryEmbedding ? "hybrid" : "keyword_only"
  };
};

export const computeInitialPriorityScore = async (categoryId) => {
  const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS);
  const categoryVolume = await Question.countDocuments({
    categoryId,
    createdAt: { $gte: sevenDaysAgo }
  });
  const categoryDemandScore = Math.min(categoryVolume / 50, 1);

  return 0.3 * 1 + 0.25 * categoryDemandScore + 0.2 * 0 + 0.15 * 0 + 0.1 * 0;
};

export const createQuestion = async (studentId, payload) => {
  if (!payload.existingAnswerCheck?.checkedAt) {
    throw new AppError(
      "Existing answer check is required before submitting.",
      HTTP_STATUS.BAD_REQUEST,
      "EXISTING_CHECK_REQUIRED"
    );
  }

  const checkAge = Date.now() - new Date(payload.existingAnswerCheck.checkedAt).getTime();
  if (checkAge > CHECK_TTL_MS) {
    throw new AppError("Your existing answer check has expired. Please search again.", HTTP_STATUS.BAD_REQUEST, "CHECK_EXPIRED");
  }

  const priorityScore = await computeInitialPriorityScore(payload.categoryId);
  const question = await Question.create({
    title: payload.title,
    description: payload.description,
    categoryId: payload.categoryId,
    tags: payload.tags || [],
    askedBy: studentId,
    existingAnswerCheck: payload.existingAnswerCheck,
    priorityScore
  });

  const embeddingText = `${question.title}. ${question.description.slice(0, 300)}`;
  generateQueryEmbedding(embeddingText)
    .then((vector) => {
      if (vector) return Question.findByIdAndUpdate(question._id, { embedding: vector });
      return null;
    })
    .catch((err) => console.warn("[Question] Embedding generation failed:", err.message));

  AnalyticsEvent.create({
    actorId: studentId,
    eventType: ANALYTICS_EVENTS.QUESTION_CREATED,
    entityType: "question",
    entityId: question._id,
    metadata: { categoryId: payload.categoryId }
  }).catch(() => {});

  await logAudit(studentId, "QUESTION_CREATED", "question", question._id, null, question.toObject());

  return question;
};

export const listQuestions = async (
  _userId,
  userRole,
  { status, categoryId, tagId, page = 1, limit = 20, sortBy = "newest" }
) => {
  const normalizedPage = normalizePage(page);
  const normalizedLimit = normalizeLimit(limit);

  if (userRole === USER_ROLES.STUDENT && status === QUESTION_STATUS.ARCHIVED) {
    return {
      questions: [],
      total: 0,
      page: normalizedPage,
      totalPages: 0
    };
  }

  const filter = {};

  if (userRole === USER_ROLES.STUDENT) {
    filter.status = { $ne: QUESTION_STATUS.ARCHIVED };
  }

  if (status) {
    filter.status = status;
  }

  if (categoryId) {
    filter.categoryId = categoryId;
  }

  if (tagId) {
    filter.tags = tagId;
  }

  let sort = { createdAt: -1 };

  if (sortBy === "priority") {
    sort = { priorityScore: -1, createdAt: -1 };
  }

  if (sortBy === "unanswered") {
    filter.status = QUESTION_STATUS.OPEN;
    sort = { createdAt: 1 };
  }

  if (sortBy === "popular") {
    sort = { viewCount: -1, createdAt: -1 };
  }

  const [questions, total] = await Promise.all([
    Question.find(filter)
      .select("-embedding")
      .sort(sort)
      .skip((normalizedPage - 1) * normalizedLimit)
      .limit(normalizedLimit)
      .populate("categoryId", "name")
      .populate("tags", "name")
      .populate("askedBy", "name")
      .lean(),
    Question.countDocuments(filter)
  ]);

  return {
    questions,
    total,
    page: normalizedPage,
    totalPages: Math.ceil(total / normalizedLimit)
  };
};

export const getQuestionById = async (userId, questionId) => {
  ensureObjectId(questionId, "QUESTION_NOT_FOUND");

  const question = await Question.findById(questionId)
    .select("-embedding")
    .populate("categoryId", "name")
    .populate("tags", "name")
    .populate("askedBy", "name")
    .lean();

  if (!question) {
    throw new AppError("Question not found", HTTP_STATUS.NOT_FOUND, "QUESTION_NOT_FOUND");
  }

  await Question.findByIdAndUpdate(questionId, { $inc: { viewCount: 1 } });
  AnalyticsEvent.create({
    actorId: userId,
    eventType: ANALYTICS_EVENTS.QUESTION_VIEWED,
    entityType: "question",
    entityId: questionId
  }).catch(() => {});

  return question;
};

export const submitAnswer = async (studentId, questionId, body) => {
  ensureObjectId(questionId, "QUESTION_NOT_FOUND");

  const question = await Question.findById(questionId);

  if (!question) {
    throw new AppError("Question not found", HTTP_STATUS.NOT_FOUND, "QUESTION_NOT_FOUND");
  }

  if (question.status !== QUESTION_STATUS.OPEN) {
    throw new AppError("This question is not open for answers.", HTTP_STATUS.BAD_REQUEST, "QUESTION_CLOSED");
  }

  const answer = await Answer.create({
    questionId,
    body,
    answeredBy: studentId,
    status: ANSWER_STATUS.PENDING
  });

  await Question.findByIdAndUpdate(questionId, { $inc: { answerCount: 1 } });
  AnalyticsEvent.create({
    actorId: studentId,
    eventType: ANALYTICS_EVENTS.ANSWER_SUBMITTED,
    entityType: "answer",
    entityId: answer._id,
    metadata: { questionId }
  }).catch(() => {});

  return answer;
};

export const getAnswersForQuestion = async (userId, userRole, questionId) => {
  ensureObjectId(questionId, "QUESTION_NOT_FOUND");

  const filter =
    userRole === USER_ROLES.MODERATOR || userRole === USER_ROLES.ADMIN
      ? { questionId }
      : {
          questionId,
          $or: [{ status: ANSWER_STATUS.APPROVED }, { status: ANSWER_STATUS.PENDING, answeredBy: userId }]
        };

  const answers = await Answer.find(filter).populate("answeredBy", "name").lean();

  return answers.sort((a, b) => {
    const aRank = a.status === ANSWER_STATUS.APPROVED ? 0 : 1;
    const bRank = b.status === ANSWER_STATUS.APPROVED ? 0 : 1;

    if (aRank !== bRank) return aRank - bRank;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
};

export const recordAnswerFeedback = async (userId, answerId, value) => {
  ensureObjectId(answerId, "ANSWER_NOT_FOUND");

  const answer = await Answer.findById(answerId);

  if (!answer) {
    throw new AppError("Answer not found", HTTP_STATUS.NOT_FOUND, "ANSWER_NOT_FOUND");
  }

  const previous = await FeedbackEvent.findOne({
    userId,
    entityType: FEEDBACK_ENTITY_TYPE.ANSWER,
    entityId: answerId
  });

  if (previous?.value === value) {
    return {
      helpfulCount: answer.helpfulCount,
      notHelpfulCount: answer.notHelpfulCount
    };
  }

  const update = {};

  if (!previous) {
    update[value === FEEDBACK_VALUE.HELPFUL ? "$inc" : "$inc"] = {
      [value === FEEDBACK_VALUE.HELPFUL ? "helpfulCount" : "notHelpfulCount"]: 1
    };
  } else if (previous.value === FEEDBACK_VALUE.HELPFUL && value === FEEDBACK_VALUE.NOT_HELPFUL) {
    update.$inc = { helpfulCount: -1, notHelpfulCount: 1 };
  } else if (previous.value === FEEDBACK_VALUE.NOT_HELPFUL && value === FEEDBACK_VALUE.HELPFUL) {
    update.$inc = { helpfulCount: 1, notHelpfulCount: -1 };
  }

  await FeedbackEvent.findOneAndUpdate(
    {
      userId,
      entityType: FEEDBACK_ENTITY_TYPE.ANSWER,
      entityId: answerId
    },
    { value },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const updated = await Answer.findByIdAndUpdate(answerId, update, { new: true });

  return {
    helpfulCount: updated.helpfulCount,
    notHelpfulCount: updated.notHelpfulCount
  };
};

export const updatePriorityScores = async () => {
  const openQuestions = await Question.find({ status: QUESTION_STATUS.OPEN }).select("_id categoryId createdAt").lean();
  const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS);
  const categoryIds = [...new Set(openQuestions.map((question) => question.categoryId.toString()))];
  const volumeEntries = await Promise.all(
    categoryIds.map(async (categoryId) => [
      categoryId,
      await Question.countDocuments({
        categoryId,
        createdAt: { $gte: sevenDaysAgo }
      })
    ])
  );
  const volumeMap = new Map(volumeEntries);

  const operations = openQuestions.map((question) => {
    const hoursSinceCreation = (Date.now() - new Date(question.createdAt).getTime()) / (1000 * 60 * 60);
    const ageScore = Math.min(hoursSinceCreation / 72, 1);
    const categoryDemandScore = Math.min((volumeMap.get(question.categoryId.toString()) || 0) / 50, 1);
    const priorityScore = 0.3 * ageScore + 0.25 * categoryDemandScore + 0.2 * 0 + 0.15 * 0 + 0.1 * 0;

    return {
      updateOne: {
        filter: { _id: question._id },
        update: { $set: { priorityScore } }
      }
    };
  });

  if (operations.length > 0) {
    await Question.bulkWrite(operations);
  }

  console.info(`[PriorityScores] Updated ${operations.length} questions`);
  return { updated: operations.length };
};
