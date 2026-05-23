import { ANALYTICS_EVENTS } from "../constants/analyticsEvents.js";
import { HTTP_STATUS } from "../constants/httpStatus.js";
import { ANSWER_STATUS, QUESTION_STATUS, REVIEW_ENTITY_TYPE, REVIEW_STATUS, REVIEW_TYPE } from "../constants/statuses.js";
import AuditLog from "../models/AuditLog.js";
import Answer from "../models/Answer.js";
import AnalyticsEvent from "../models/AnalyticsEvent.js";
import Question from "../models/Question.js";
import ReviewItem from "../models/ReviewItem.js";
import { AppError } from "../utils/AppError.js";
import { logAudit } from "../utils/auditLog.js";

const requireText = (value, message, code) => {
  if (!value?.trim()) {
    throw new AppError(message, HTTP_STATUS.BAD_REQUEST, code);
  }
};

const getAnswerOrThrow = async (answerId) => {
  const answer = await Answer.findById(answerId);

  if (!answer) {
    throw new AppError("Answer not found", HTTP_STATUS.NOT_FOUND, "ANSWER_NOT_FOUND");
  }

  return answer;
};

const getQuestionOrThrow = async (questionId) => {
  const question = await Question.findById(questionId);

  if (!question) {
    throw new AppError("Question not found", HTTP_STATUS.NOT_FOUND, "QUESTION_NOT_FOUND");
  }

  return question;
};

const clampPriority = (value) => Math.max(0, Math.min(1, Number(value) || 0));

const buildQueueItemFromAnswer = (answer) => {
  const question = answer.questionId;

  return {
    id: `answer:${answer._id}`,
    type: "pending_answer",
    answerId: answer._id,
    questionId: question?._id,
    title: question?.title ?? "Question unavailable",
    category: question?.categoryId ?? null,
    tags: question?.tags ?? [],
    priorityScore: clampPriority(question?.priorityScore),
    answerCount: question?.answerCount ?? 0,
    viewCount: question?.viewCount ?? 0,
    status: answer.status,
    questionStatus: question?.status,
    createdAt: answer.createdAt,
    updatedAt: answer.updatedAt,
    question,
    answer
  };
};

const buildQueueItemFromQuestion = (question) => ({
  id: `question:${question._id}`,
  type: "open_question",
  questionId: question._id,
  title: question.title,
  category: question.categoryId ?? null,
  tags: question.tags ?? [],
  priorityScore: clampPriority(question.priorityScore),
  answerCount: question.answerCount ?? 0,
  viewCount: question.viewCount ?? 0,
  status: question.status,
  createdAt: question.createdAt,
  updatedAt: question.updatedAt,
  question
});

const sortQueue = (items, sortBy = "priority") =>
  [...items].sort((a, b) => {
    if (sortBy === "age") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (sortBy === "category") return (a.category?.name ?? "").localeCompare(b.category?.name ?? "");
    return b.priorityScore - a.priorityScore || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

export const getPendingQueue = async ({ page = 1, limit = 20 } = {}) => {
  const normalizedPage = Math.max(Number(page) || 1, 1);
  const normalizedLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const filter = { status: { $in: [ANSWER_STATUS.PENDING, ANSWER_STATUS.NEEDS_CHANGES] } };
  const [answers, total] = await Promise.all([
    Answer.find(filter)
      .sort({ createdAt: 1 })
      .populate("questionId", "title status priorityScore")
      .populate("answeredBy", "name")
      .lean(),
    Answer.countDocuments(filter)
  ]);
  const sortedAnswers = answers
    .sort((a, b) => (b.questionId?.priorityScore ?? 0) - (a.questionId?.priorityScore ?? 0) || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice((normalizedPage - 1) * normalizedLimit, normalizedPage * normalizedLimit);

  return {
    answers: sortedAnswers,
    total,
    page: normalizedPage,
    totalPages: Math.ceil(total / normalizedLimit)
  };
};

export const getModerationQueue = async ({ filter = "all", sortBy = "priority", page = 1, limit = 50 } = {}) => {
  const normalizedPage = Math.max(Number(page) || 1, 1);
  const normalizedLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const shouldFetchAnswers = ["all", "pending_answers", "faq_candidates"].includes(filter);
  const answerFilter =
    filter === "faq_candidates"
      ? { eligibleForFaqConversion: true, convertedFaqId: { $exists: false } }
      : { status: { $in: [ANSWER_STATUS.PENDING, ANSWER_STATUS.NEEDS_CHANGES] } };

  const [pendingAnswers, openQuestions, faqReviewItems] = await Promise.all([
    shouldFetchAnswers
      ? Answer.find(answerFilter)
          .sort({ createdAt: 1 })
          .populate({
            path: "questionId",
            select: "-embedding",
            populate: [
              { path: "categoryId", select: "name" },
              { path: "tags", select: "name" },
              { path: "askedBy", select: "name" }
            ]
          })
          .populate("answeredBy", "name")
          .lean()
      : [],
    ["all", "unresolved", "duplicate_candidates"].includes(filter)
      ? Question.find({ status: QUESTION_STATUS.OPEN })
          .select("-embedding")
          .populate("categoryId", "name")
          .populate("tags", "name")
          .populate("askedBy", "name")
          .lean()
      : [],
    ["all", "faq_candidates"].includes(filter)
      ? ReviewItem.find({
          reviewType: REVIEW_TYPE.FAQ_CONVERSION_CANDIDATE,
          status: REVIEW_STATUS.OPEN
        }).lean()
      : []
  ]);

  let items = [
    ...pendingAnswers.filter((answer) => answer.questionId).map(buildQueueItemFromAnswer),
    ...openQuestions.map(buildQueueItemFromQuestion)
  ];

  if (filter === "duplicate_candidates") {
    items = items.filter((item) => item.question?.existingAnswerCheck?.matchedQuestions?.length > 0);
  }

  if (filter === "faq_candidates") {
    const candidateIds = new Set(faqReviewItems.map((item) => item.entityId.toString()));
    items = items.filter((item) => item.answerId && candidateIds.has(item.answerId.toString()));
  }

  const sorted = sortQueue(items, sortBy);
  const start = (normalizedPage - 1) * normalizedLimit;

  return {
    items: sorted.slice(start, start + normalizedLimit),
    total: sorted.length,
    page: normalizedPage,
    totalPages: Math.ceil(sorted.length / normalizedLimit),
    health: {
      pendingCount: sorted.length,
      trend: sorted.length > 10 ? "up" : sorted.length < 4 ? "down" : "steady"
    }
  };
};

export const getFaqConversionCandidates = async () => {
  const answers = await Answer.find({ eligibleForFaqConversion: true, convertedFaqId: { $exists: false } })
    .populate({
      path: "questionId",
      select: "-embedding",
      populate: [
        { path: "categoryId", select: "name" },
        { path: "tags", select: "name" }
      ]
    })
    .populate("answeredBy", "name")
    .populate("moderatorId", "name")
    .sort({ updatedAt: -1 })
    .lean();

  return answers.map((answer) => ({
    id: answer._id,
    answer,
    question: answer.questionId,
    approvedAt: answer.approvedAt,
    moderator: answer.moderatorId
  }));
};

export const getModerationAnalytics = async (moderatorId) => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const lastSixDays = Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(Date.now() - (6 - index) * 24 * 60 * 60 * 1000);
    date.setHours(0, 0, 0, 0);
    return date;
  });

  const [approvalsToday, approvalsThisWeek, pendingAnswers, openQuestions, moderatedAnswers] = await Promise.all([
    AuditLog.countDocuments({ actorId: moderatorId, action: "ANSWER_APPROVED", createdAt: { $gte: startOfToday } }),
    AuditLog.countDocuments({ actorId: moderatorId, action: "ANSWER_APPROVED", createdAt: { $gte: startOfWeek } }),
    Answer.find({ status: { $in: [ANSWER_STATUS.PENDING, ANSWER_STATUS.NEEDS_CHANGES] } })
      .populate({ path: "questionId", populate: { path: "categoryId", select: "name" } })
      .lean(),
    Question.find({ status: QUESTION_STATUS.OPEN }).populate("categoryId", "name").lean(),
    Answer.find({ moderatorId, approvedAt: { $exists: true } }).select("createdAt approvedAt").lean()
  ]);

  const averageResponseMs =
    moderatedAnswers.length === 0
      ? 0
      : moderatedAnswers.reduce((sum, answer) => sum + (new Date(answer.approvedAt).getTime() - new Date(answer.createdAt).getTime()), 0) /
        moderatedAnswers.length;

  const queueDepthTrend = lastSixDays.map((date, index) => {
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    const dayAnswers = pendingAnswers.filter((answer) => new Date(answer.createdAt) < next).length;
    const dayQuestions = openQuestions.filter((question) => new Date(question.createdAt) < next).length;

    return {
      label: index === 6 ? "Today" : date.toLocaleDateString("en", { weekday: "short" }),
      depth: dayAnswers + dayQuestions
    };
  });

  const categoryMap = new Map();

  for (const answer of pendingAnswers) {
    const name = answer.questionId?.categoryId?.name ?? "Uncategorized";
    categoryMap.set(name, (categoryMap.get(name) ?? 0) + 1);
  }

  for (const question of openQuestions) {
    const name = question.categoryId?.name ?? "Uncategorized";
    categoryMap.set(name, (categoryMap.get(name) ?? 0) + 1);
  }

  const pendingByCategory = [...categoryMap.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
  const topCategory = pendingByCategory[0]?.category ?? "current";

  return {
    approvalsToday,
    approvalsThisWeek,
    averageResponseHours: Number((averageResponseMs / (1000 * 60 * 60)).toFixed(1)),
    queueDepthTrend,
    pendingByCategory,
    insight: `Queue is ${queueDepthTrend.at(-1)?.depth > queueDepthTrend[0]?.depth ? "growing" : "stable"} - prioritize ${topCategory} category.`
  };
};

export const bulkModerationAction = async (moderatorId, { action, ids, reason }) => {
  const results = [];

  for (const id of ids) {
    if (action === "approve") {
      results.push(await approveAnswer(moderatorId, id));
    } else if (action === "reject") {
      results.push(await rejectAnswer(moderatorId, id, reason));
    } else if (action === "resolve") {
      results.push(await resolveQuestion(moderatorId, id));
    }
  }

  return { processed: results.length };
};

export const approveAnswer = async (moderatorId, answerId, moderationNote = "") => {
  const answer = await getAnswerOrThrow(answerId);
  const before = answer.toObject();

  answer.status = ANSWER_STATUS.APPROVED;
  answer.moderatorId = moderatorId;
  answer.moderationNote = moderationNote;
  answer.approvedAt = new Date();
  await answer.save();

  await Question.findByIdAndUpdate(answer.questionId, { status: QUESTION_STATUS.ANSWERED });
  await logAudit(moderatorId, "ANSWER_APPROVED", "answer", answer._id, before, answer.toObject());
  AnalyticsEvent.create({
    actorId: moderatorId,
    eventType: ANALYTICS_EVENTS.ANSWER_MODERATED,
    entityType: "answer",
    entityId: answer._id,
    metadata: { status: ANSWER_STATUS.APPROVED, questionId: answer.questionId }
  }).catch(() => {});

  return answer;
};

export const rejectAnswer = async (moderatorId, answerId, reason) => {
  requireText(reason, "Rejection reason is required.", "REJECTION_REASON_REQUIRED");

  const answer = await getAnswerOrThrow(answerId);
  const before = answer.toObject();

  answer.status = ANSWER_STATUS.REJECTED;
  answer.moderatorId = moderatorId;
  answer.moderationNote = reason;
  await answer.save();

  await logAudit(moderatorId, "ANSWER_REJECTED", "answer", answer._id, before, answer.toObject());
  AnalyticsEvent.create({
    actorId: moderatorId,
    eventType: ANALYTICS_EVENTS.ANSWER_MODERATED,
    entityType: "answer",
    entityId: answer._id,
    metadata: { status: ANSWER_STATUS.REJECTED, questionId: answer.questionId }
  }).catch(() => {});

  return answer;
};

export const requestChanges = async (moderatorId, answerId, note) => {
  requireText(note, "Change request note is required.", "CHANGE_NOTE_REQUIRED");

  const answer = await getAnswerOrThrow(answerId);
  const before = answer.toObject();

  answer.status = ANSWER_STATUS.NEEDS_CHANGES;
  answer.moderatorId = moderatorId;
  answer.moderationNote = note;
  await answer.save();

  await logAudit(moderatorId, "ANSWER_CHANGES_REQUESTED", "answer", answer._id, before, answer.toObject());
  AnalyticsEvent.create({
    actorId: moderatorId,
    eventType: ANALYTICS_EVENTS.ANSWER_MODERATED,
    entityType: "answer",
    entityId: answer._id,
    metadata: { status: ANSWER_STATUS.NEEDS_CHANGES, questionId: answer.questionId }
  }).catch(() => {});

  return answer;
};

export const resolveQuestion = async (moderatorId, questionId) => {
  const question = await getQuestionOrThrow(questionId);
  const before = question.toObject();
  const resolvedAt = new Date();

  question.status = QUESTION_STATUS.RESOLVED;
  question.resolvedAt = resolvedAt;
  await question.save();

  await logAudit(moderatorId, "QUESTION_RESOLVED", "question", question._id, before, question.toObject());
  AnalyticsEvent.create({
    actorId: moderatorId,
    eventType: ANALYTICS_EVENTS.QUESTION_RESOLVED,
    entityType: "question",
    entityId: question._id,
    metadata: { resolvedAt }
  }).catch(() => {});

  return question;
};

export const markDuplicate = async (moderatorId, questionId, duplicateOf) => {
  if (questionId.toString() === duplicateOf.toString()) {
    throw new AppError("A question cannot be marked as a duplicate of itself.", HTTP_STATUS.BAD_REQUEST, "INVALID_DUPLICATE");
  }

  const [question, canonical] = await Promise.all([getQuestionOrThrow(questionId), getQuestionOrThrow(duplicateOf)]);
  const before = question.toObject();

  question.status = QUESTION_STATUS.DUPLICATE;
  question.duplicateOf = canonical._id;
  await question.save();

  await logAudit(moderatorId, "QUESTION_MARKED_DUPLICATE", "question", question._id, before, question.toObject());
  AnalyticsEvent.create({
    actorId: moderatorId,
    eventType: ANALYTICS_EVENTS.QUESTION_RESOLVED,
    entityType: "question",
    entityId: question._id,
    metadata: { duplicateOf: canonical._id }
  }).catch(() => {});

  return question;
};

export const recommendFaqConversion = async (moderatorId, answerId, notes = "") => {
  const answer = await getAnswerOrThrow(answerId);
  const before = answer.toObject();

  answer.eligibleForFaqConversion = true;
  await answer.save();

  const reviewItem = await ReviewItem.create({
    entityType: REVIEW_ENTITY_TYPE.ANSWER,
    entityId: answer._id,
    reviewType: REVIEW_TYPE.FAQ_CONVERSION_CANDIDATE,
    status: REVIEW_STATUS.OPEN,
    createdBy: moderatorId,
    notes
  });

  await logAudit(moderatorId, "FAQ_CONVERSION_RECOMMENDED", "answer", answer._id, before, answer.toObject());
  AnalyticsEvent.create({
    actorId: moderatorId,
    eventType: ANALYTICS_EVENTS.REVIEW_ITEM_CREATED,
    entityType: "review_item",
    entityId: reviewItem._id,
    metadata: { answerId: answer._id }
  }).catch(() => {});

  return { answer, reviewItem };
};

export const flagForAdminReview = async (moderatorId, { entityType, entityId, reviewType, notes = "", assignedTo = null }) => {
  const reviewItem = await ReviewItem.create({
    entityType,
    entityId,
    reviewType,
    status: REVIEW_STATUS.OPEN,
    createdBy: moderatorId,
    assignedTo,
    notes
  });

  await logAudit(moderatorId, "ADMIN_REVIEW_FLAGGED", entityType, entityId, null, reviewItem.toObject());
  AnalyticsEvent.create({
    actorId: moderatorId,
    eventType: ANALYTICS_EVENTS.REVIEW_ITEM_CREATED,
    entityType: "review_item",
    entityId: reviewItem._id,
    metadata: { entityType, entityId, reviewType }
  }).catch(() => {});

  return reviewItem;
};
