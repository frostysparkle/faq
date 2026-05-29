import mongoose from "mongoose";
import Answer from "../models/Answer.js";
import AuditLog from "../models/AuditLog.js";
import Category from "../models/Category.js";
import Faq from "../models/Faq.js";
import Question from "../models/Question.js";
import SearchLog from "../models/SearchLog.js";
import { ANSWER_STATUS, FAQ_REVIEW_STATE, FAQ_STATUS, QUESTION_STATUS } from "../constants/statuses.js";
import {
  generateCategoryNarrative,
  generateFaqNarrative,
  generateQueueNarrative
} from "../utils/narrativeGenerator.js";

const FIVE_MINUTES_MS = 5 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const overviewCache = new Map();

const clampPercent = (value) => Math.round(Number.isFinite(value) ? value : 0);
const toObjectId = (value) => new mongoose.Types.ObjectId(value);
const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const daysAgo = (days) => new Date(Date.now() - days * DAY_MS);

const percentChange = (current, previous) => {
  if (previous === 0 && current === 0) return 0;
  if (previous === 0) return 100;
  return clampPercent(((current - previous) / previous) * 100);
};

const formatTrend = (current, previous) => {
  const change = percentChange(current, previous);
  const prefix = change > 0 ? "+" : "";
  return `${prefix}${change}% vs last week`;
};

const normalizeLimit = (limit, fallback = 20, max = 100) => Math.min(Math.max(Number(limit) || fallback, 1), max);
const normalizePage = (page) => Math.max(Number(page) || 1, 1);

const getCategoryNameMap = async () => {
  const categories = await Category.find({}).select("name").lean();
  return new Map(categories.map((category) => [category._id.toString(), category.name]));
};

const getTopNoResultQuery = async (match = {}, limit = 1) =>
  SearchLog.aggregate([
    { $match: { resultCount: 0, clickedFaqId: { $exists: false }, ...match } },
    {
      $group: {
        _id: "$normalizedQuery",
        count: { $sum: 1 },
        lastSeenAt: { $max: "$createdAt" },
        relatedCategory: { $first: "$filters.categoryId" }
      }
    },
    { $match: { count: { $gte: 3 } } },
    { $sort: { count: -1, lastSeenAt: -1 } },
    { $limit: limit }
  ]);

const buildOverviewActions = async ({ unresolvedCount, faqsNeedingReviewCount }) => {
  const [topNoResult, staleFaqs, pendingAnswers] = await Promise.all([
    getTopNoResultQuery({ createdAt: { $gte: daysAgo(30) } }, 1),
    Faq.aggregate([
      {
        $addFields: {
          totalFeedback: { $add: ["$helpfulCount", "$notHelpfulCount"] },
          helpfulnessRatio: {
            $cond: [
              { $gt: [{ $add: ["$helpfulCount", "$notHelpfulCount"] }, 0] },
              { $divide: ["$helpfulCount", { $add: ["$helpfulCount", "$notHelpfulCount"] }] },
              0
            ]
          }
        }
      },
      {
        $match: {
          status: FAQ_STATUS.PUBLISHED,
          helpfulnessRatio: { $lt: 0.3 },
          updatedAt: { $lte: daysAgo(90) }
        }
      },
      { $count: "count" }
    ]),
    Answer.countDocuments({ status: { $in: [ANSWER_STATUS.PENDING, ANSWER_STATUS.NEEDS_CHANGES] } })
  ]);

  const actions = [];
  const topQuery = topNoResult[0];

  if (topQuery) {
    actions.push({
      type: "FAQ_GAP",
      message: `${topQuery._id} searched ${topQuery.count} times with no results. Create a FAQ.`,
      severity: topQuery.count >= 25 ? "high" : "medium",
      link: `/admin/faqs/new?query=${encodeURIComponent(topQuery._id).replace(/%20/g, "+")}`
    });
  }

  if (staleFaqs[0]?.count > 0) {
    actions.push({
      type: "STALE_FAQ",
      message: `${staleFaqs[0].count} FAQs have <30% helpfulness and were last updated 90+ days ago.`,
      severity: "medium",
      link: "/admin/analytics/faq-quality"
    });
  }

  if (unresolvedCount > 0) {
    actions.push({
      type: "UNRESOLVED_QUESTIONS",
      message: `${unresolvedCount} questions are still unresolved. Review high-priority categories first.`,
      severity: unresolvedCount > 20 ? "high" : "medium",
      link: "/moderator/queue?filter=unresolved"
    });
  }

  if (pendingAnswers > 0) {
    actions.push({
      type: "MODERATION_LOAD",
      message: `${pendingAnswers} answers are waiting for moderation. Clear pending answers before new submissions pile up.`,
      severity: pendingAnswers > 15 ? "high" : "low",
      link: "/moderator/console"
    });
  }

  if (faqsNeedingReviewCount > 0) {
    actions.push({
      type: "FAQ_REVIEW",
      message: `${faqsNeedingReviewCount} FAQs are flagged for review. Resolve the oldest review items this week.`,
      severity: "medium",
      link: "/admin/faqs?status=needs_review"
    });
  }

  return actions.slice(0, 5);
};

export const getOverview = async () => {
  const cacheKey = Math.floor(Date.now() / FIVE_MINUTES_MS);

  if (overviewCache.has(cacheKey)) {
    return overviewCache.get(cacheKey);
  }

  const now = new Date();
  const thisWeekStart = new Date(now.getTime() - 7 * DAY_MS);
  const lastWeekStart = new Date(now.getTime() - 14 * DAY_MS);
  const unresolvedFilter = { status: { $in: [QUESTION_STATUS.OPEN, QUESTION_STATUS.ANSWERED] } };

  const [
    unresolvedCurrent,
    unresolvedPreviousCreated,
    noResultsCurrent,
    noResultsPrevious,
    faqsNeedingReview,
    resolutionCurrent,
    resolutionPrevious,
    topCategoryRows,
    previousCategoryRows
  ] = await Promise.all([
    Question.countDocuments(unresolvedFilter),
    Question.countDocuments({ ...unresolvedFilter, createdAt: { $gte: lastWeekStart, $lt: thisWeekStart } }),
    SearchLog.countDocuments({ resultCount: 0, createdAt: { $gte: thisWeekStart } }),
    SearchLog.countDocuments({ resultCount: 0, createdAt: { $gte: lastWeekStart, $lt: thisWeekStart } }),
    Faq.countDocuments({
      $or: [
        { status: FAQ_STATUS.NEEDS_REVIEW },
        { reviewState: { $ne: FAQ_REVIEW_STATE.NONE } },
        { qualityScore: { $lt: 0.35 }, viewCount: { $gt: 50 } }
      ]
    }),
    Question.aggregate([
      { $match: { resolvedAt: { $gte: thisWeekStart }, createdAt: { $exists: true } } },
      { $project: { hours: { $divide: [{ $subtract: ["$resolvedAt", "$createdAt"] }, 1000 * 60 * 60] } } },
      { $group: { _id: null, hours: { $avg: "$hours" } } }
    ]),
    Question.aggregate([
      { $match: { resolvedAt: { $gte: lastWeekStart, $lt: thisWeekStart }, createdAt: { $exists: true } } },
      { $project: { hours: { $divide: [{ $subtract: ["$resolvedAt", "$createdAt"] }, 1000 * 60 * 60] } } },
      { $group: { _id: null, hours: { $avg: "$hours" } } }
    ]),
    Question.aggregate([
      { $match: { createdAt: { $gte: thisWeekStart } } },
      { $group: { _id: "$categoryId", volume: { $sum: 1 } } },
      { $sort: { volume: -1 } },
      { $limit: 1 }
    ]),
    Question.aggregate([
      { $match: { createdAt: { $gte: lastWeekStart, $lt: thisWeekStart } } },
      { $group: { _id: "$categoryId", volume: { $sum: 1 } } }
    ])
  ]);

  const categoryNameMap = await getCategoryNameMap();
  const topCategory = topCategoryRows[0];
  const previousTopVolume = previousCategoryRows.find((row) => row._id?.toString() === topCategory?._id?.toString())?.volume ?? 0;
  const avgCurrentHours = Number((resolutionCurrent[0]?.hours ?? 0).toFixed(1));
  const avgPreviousHours = Number((resolutionPrevious[0]?.hours ?? 0).toFixed(1));
  const actionRequired = await buildOverviewActions({
    unresolvedCount: unresolvedCurrent,
    faqsNeedingReviewCount: faqsNeedingReview
  });

  const overview = {
    unresolvedQuestions: {
      count: unresolvedCurrent,
      trend: formatTrend(unresolvedCurrent, unresolvedPreviousCreated)
    },
    noResultSearches: {
      count: noResultsCurrent,
      trend: formatTrend(noResultsCurrent, noResultsPrevious)
    },
    faqsNeedingReview: {
      count: faqsNeedingReview
    },
    avgResolutionTime: {
      hours: avgCurrentHours,
      trend: formatTrend(avgCurrentHours, avgPreviousHours)
    },
    topConfusionCategory: {
      id: topCategory?._id ?? null,
      name: topCategory ? categoryNameMap.get(topCategory._id.toString()) ?? "Uncategorized" : "No category signal yet",
      volume: topCategory?.volume ?? 0,
      percentChange: percentChange(topCategory?.volume ?? 0, previousTopVolume)
    },
    actionRequired,
    narrative:
      actionRequired.length > 0
        ? `${actionRequired.length} operational decisions need attention this week. Start with high-severity FAQ gaps and moderation load.`
        : "No urgent institutional knowledge risks are visible right now."
  };

  overviewCache.clear();
  overviewCache.set(cacheKey, overview);
  return overview;
};

export const getIssueHeatmap = async ({ days = 30 } = {}) => {
  const normalizedDays = normalizeLimit(days, 30, 180);
  const since = startOfDay(daysAgo(normalizedDays));
  const midpoint = startOfDay(daysAgo(Math.ceil(normalizedDays / 2)));

  const [questionRows, searchRows, topQueries, categoryNameMap] = await Promise.all([
    Question.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: {
            categoryId: "$categoryId",
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
          },
          questionVolume: { $sum: 1 },
          unresolved: {
            $sum: {
              $cond: [{ $in: ["$status", [QUESTION_STATUS.OPEN, QUESTION_STATUS.ANSWERED]] }, 1, 0]
            }
          }
        }
      }
    ]),
    SearchLog.aggregate([
      {
        $match: {
          createdAt: { $gte: since },
          "filters.categoryId": { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: {
            categoryId: "$filters.categoryId",
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
          },
          searchVolume: { $sum: 1 }
        }
      }
    ]),
    SearchLog.aggregate([
      { $match: { resultCount: 0, createdAt: { $gte: since } } },
      { $group: { _id: { categoryId: "$filters.categoryId", query: "$normalizedQuery" }, count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),
    getCategoryNameMap()
  ]);

  const categoryMap = new Map();

  const addVolume = (categoryId, date, { searchVolume = 0, questionVolume = 0, unresolved = 0 }) => {
    if (!categoryId) return;
    const id = categoryId.toString();
    if (!categoryMap.has(id)) {
      categoryMap.set(id, { id, name: categoryNameMap.get(id) ?? "Uncategorized", byDate: new Map(), current: 0, previous: 0 });
    }
    const entry = categoryMap.get(id);
    const existing = entry.byDate.get(date) ?? { date, volume: 0, searches: 0, questions: 0, unresolved: 0 };
    const next = {
      date,
      searches: existing.searches + searchVolume,
      questions: existing.questions + questionVolume,
      unresolved: existing.unresolved + unresolved,
      volume: existing.volume + searchVolume + questionVolume
    };
    entry.byDate.set(date, next);
    if (new Date(date) >= midpoint) entry.current += next.volume - existing.volume;
    else entry.previous += next.volume - existing.volume;
  };

  for (const row of questionRows) {
    addVolume(row._id.categoryId, row._id.date, { questionVolume: row.questionVolume, unresolved: row.unresolved });
  }
  for (const row of searchRows) {
    addVolume(row._id.categoryId, row._id.date, { searchVolume: row.searchVolume });
  }

  const topQueryMap = new Map();
  for (const row of topQueries) {
    const categoryId = row._id.categoryId?.toString();
    if (categoryId && !topQueryMap.has(categoryId)) topQueryMap.set(categoryId, row._id.query);
  }

  const categories = [...categoryMap.values()]
    .map((category) => {
      const data = Array.from({ length: normalizedDays }).map((_, index) => {
        const date = startOfDay(new Date(since.getTime() + index * DAY_MS)).toISOString().slice(0, 10);
        return category.byDate.get(date) ?? { date, volume: 0, searches: 0, questions: 0, unresolved: 0 };
      });
      const volumeChange = percentChange(category.current, category.previous);

      return {
        id: category.id,
        name: category.name,
        data,
        narrative: generateCategoryNarrative(category.name, volumeChange, topQueryMap.get(category.id))
      };
    })
    .sort((a, b) => b.data.reduce((sum, item) => sum + item.volume, 0) - a.data.reduce((sum, item) => sum + item.volume, 0));

  return {
    categories,
    narrative:
      categories.length > 0
        ? `${categories.length} categories show measurable search or question activity over the last ${normalizedDays} days.`
        : `No issue volume was recorded over the last ${normalizedDays} days.`
  };
};

export const getUnansweredSearches = async ({ limit = 20 } = {}) => {
  const normalizedLimit = normalizeLimit(limit, 20, 100);
  const [rows, categoryNameMap] = await Promise.all([
    getTopNoResultQuery({}, normalizedLimit),
    getCategoryNameMap()
  ]);
  const totalMoments = rows.reduce((sum, row) => sum + row.count, 0);

  const clusters = rows.map((row) => {
    const categoryId = row.relatedCategory?.toString();
    const title = row._id
      .split(" ")
      .filter(Boolean)
      .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
      .join(" ");

    return {
      query: row._id,
      count: row.count,
      lastSeenAt: row.lastSeenAt,
      suggestedFaqTitle: `${title} - Troubleshooting Guide`,
      relatedCategory: categoryId ? { id: categoryId, name: categoryNameMap.get(categoryId) ?? "Uncategorized" } : null,
      recommendedAction: {
        type: "CREATE_FAQ",
        severity: row.count >= 25 ? "high" : "medium",
        link: `/admin/faqs/new?query=${encodeURIComponent(row._id).replace(/%20/g, "+")}`
      }
    };
  });

  return {
    clusters,
    narrative: `These ${clusters.length} search clusters represent ${totalMoments} student moments with no answer.`,
    recommendedActions: clusters.slice(0, 5).map((cluster) => ({
      type: "FAQ_GAP",
      message: `Create '${cluster.suggestedFaqTitle}' for ${cluster.count} unanswered searches.`,
      severity: cluster.recommendedAction.severity,
      link: cluster.recommendedAction.link
    }))
  };
};

export const getFaqQuality = async ({ limit = 20, sort = "worst" } = {}) => {
  const normalizedLimit = normalizeLimit(limit, 20, 100);
  const sortDirection = sort === "best" ? -1 : 1;
  const faqs = await Faq.aggregate([
    {
      $addFields: {
        helpfulnessRatio: {
          $cond: [
            { $gt: [{ $add: ["$helpfulCount", "$notHelpfulCount"] }, 0] },
            { $divide: ["$helpfulCount", { $add: ["$helpfulCount", "$notHelpfulCount"] }] },
            0
          ]
        }
      }
    },
    {
      $lookup: {
        from: "searchlogs",
        localField: "_id",
        foreignField: "clickedFaqId",
        as: "searchJourneys"
      }
    },
    {
      $addFields: {
        repeatQuestionCount: {
          $size: {
            $filter: {
              input: "$searchJourneys",
              as: "journey",
              cond: { $ne: ["$$journey.ledToQuestionId", null] }
            }
          }
        }
      }
    },
    { $sort: { qualityScore: sortDirection, updatedAt: -1 } },
    { $limit: normalizedLimit },
    {
      $project: {
        faqId: "$_id",
        title: 1,
        qualityScore: 1,
        helpfulnessRatio: 1,
        viewCount: 1,
        repeatQuestionCount: 1,
        updatedAt: 1
      }
    }
  ]);

  const items = faqs.map((faq) => {
    const action =
      faq.helpfulnessRatio < 0.4 && faq.viewCount > 100
        ? "rewrite"
        : faq.qualityScore < 0.2 && faq.viewCount < 10
          ? "archive"
          : "ok";

    return {
      ...faq,
      action,
      narrative: generateFaqNarrative(faq, action)
    };
  });

  return {
    faqs: items,
    narrative: `${items.filter((item) => item.action !== "ok").length} of ${items.length} reviewed FAQs need editorial action.`,
    recommendedActions: items
      .filter((item) => item.action !== "ok")
      .slice(0, 5)
      .map((item) => ({
        type: item.action === "rewrite" ? "REWRITE_FAQ" : "ARCHIVE_FAQ",
        message: generateFaqNarrative(item, item.action),
        severity: item.action === "rewrite" ? "high" : "medium",
        link: `/admin/faqs/${item.faqId}/edit`
      }))
  };
};

export const getModerationLoad = async ({ days = 14 } = {}) => {
  const normalizedDays = normalizeLimit(days, 14, 90);
  const since = daysAgo(normalizedDays);
  const weekStart = daysAgo(7);
  const previousWeekStart = daysAgo(14);

  const [pendingRows, resolvedThisWeek, currentCreated, previousCreated, moderators, pendingByCategory, queueDepthTrend, funnelRows] = await Promise.all([
    Answer.aggregate([
      { $match: { status: { $in: [ANSWER_STATUS.PENDING, ANSWER_STATUS.NEEDS_CHANGES] } } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          avgAgeHours: { $avg: { $divide: [{ $subtract: [new Date(), "$createdAt"] }, 1000 * 60 * 60] } }
        }
      }
    ]),
    Question.countDocuments({ status: QUESTION_STATUS.RESOLVED, resolvedAt: { $gte: weekStart } }),
    Answer.countDocuments({ createdAt: { $gte: weekStart }, status: { $in: [ANSWER_STATUS.PENDING, ANSWER_STATUS.NEEDS_CHANGES] } }),
    Answer.countDocuments({
      createdAt: { $gte: previousWeekStart, $lt: weekStart },
      status: { $in: [ANSWER_STATUS.PENDING, ANSWER_STATUS.NEEDS_CHANGES] }
    }),
    Answer.aggregate([
      { $match: { moderatorId: { $exists: true, $ne: null }, updatedAt: { $gte: since } } },
      {
        $group: {
          _id: "$moderatorId",
          approved: { $sum: { $cond: [{ $eq: ["$status", ANSWER_STATUS.APPROVED] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ["$status", ANSWER_STATUS.REJECTED] }, 1, 0] } },
          avgTime: { $avg: { $divide: [{ $subtract: ["$updatedAt", "$createdAt"] }, 1000 * 60 * 60] } }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "moderator"
        }
      },
      { $unwind: { path: "$moderator", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          moderatorId: "$_id",
          name: { $ifNull: ["$moderator.name", "Unknown moderator"] },
          approved: 1,
          rejected: 1,
          avgTime: { $round: ["$avgTime", 1] }
        }
      },
      { $sort: { approved: -1, rejected: -1 } }
    ]),
    Answer.aggregate([
      { $match: { status: { $in: [ANSWER_STATUS.PENDING, ANSWER_STATUS.NEEDS_CHANGES] } } },
      {
        $lookup: {
          from: "questions",
          localField: "questionId",
          foreignField: "_id",
          as: "question"
        }
      },
      { $unwind: { path: "$question", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "categories",
          localField: "question.categoryId",
          foreignField: "_id",
          as: "category"
        }
      },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$question.categoryId",
          category: { $first: { $ifNull: ["$category.name", "Uncategorized"] } },
          count: { $sum: 1 },
          avgAgeHours: { $avg: { $divide: [{ $subtract: [new Date(), "$createdAt"] }, 1000 * 60 * 60] } }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 8 },
      { $project: { category: 1, count: 1, avgAgeHours: { $round: ["$avgAgeHours", 1] } } }
    ]),
    Answer.aggregate([
      { $match: { createdAt: { $gte: since }, status: { $in: [ANSWER_STATUS.PENDING, ANSWER_STATUS.NEEDS_CHANGES] } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          depth: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $project: { label: "$_id", depth: 1, _id: 0 } }
    ]),
    Promise.all([
      SearchLog.countDocuments({ createdAt: { $gte: since } }),
      SearchLog.countDocuments({ createdAt: { $gte: since }, clickedFaqId: { $exists: true } }),
      Question.countDocuments({ createdAt: { $gte: since } }),
      Question.countDocuments({ createdAt: { $gte: since }, status: { $in: [QUESTION_STATUS.ANSWERED, QUESTION_STATUS.RESOLVED] } }),
      Question.countDocuments({ createdAt: { $gte: since }, status: QUESTION_STATUS.RESOLVED })
    ])
  ]);

  const resolutionRows = await Question.aggregate([
    { $match: { resolvedAt: { $gte: since }, createdAt: { $exists: true } } },
    { $project: { hours: { $divide: [{ $subtract: ["$resolvedAt", "$createdAt"] }, 1000 * 60 * 60] } } },
    { $group: { _id: null, hours: { $avg: "$hours" } } }
  ]);
  const change = percentChange(currentCreated, previousCreated);
  const trend = change > 15 ? "increasing" : change < -15 ? "decreasing" : "stable";
  const pending = {
    count: pendingRows[0]?.count ?? 0,
    avgAgeHours: Number((pendingRows[0]?.avgAgeHours ?? 0).toFixed(1))
  };

  return {
    pendingAnswers: pending,
    resolvedThisWeek,
    avgResolutionTime: Number((resolutionRows[0]?.hours ?? 0).toFixed(1)),
    moderatorBreakdown: moderators,
    queueDepthTrend,
    categoryBreakdown: pendingByCategory,
    resolutionFunnel: [
      { name: "Searched", value: funnelRows[0] },
      { name: "Viewed FAQ", value: funnelRows[1] },
      { name: "Asked Question", value: funnelRows[2] },
      { name: "Answered", value: funnelRows[3] },
      { name: "Resolved", value: funnelRows[4] }
    ],
    trend,
    narrative: generateQueueNarrative(pending, trend),
    recommendedActions:
      trend === "increasing"
        ? [
            {
              type: "ADD_MODERATOR_CAPACITY",
              message: "Queue depth is increasing. Assign additional moderator capacity to the oldest category queue.",
              severity: "high",
              link: "/moderator/queue?sortBy=age"
            }
          ]
        : []
  };
};

export const getAuditLogs = async ({ page = 1, limit = 20, actorId, entityType, action, dateRange = {} } = {}) => {
  const normalizedPage = normalizePage(page);
  const normalizedLimit = normalizeLimit(limit, 20, 100);
  const filter = {};

  if (actorId) filter.actorId = toObjectId(actorId);
  if (entityType) filter.entityType = entityType;
  if (action) filter.action = action;
  if (dateRange.start || dateRange.end) {
    filter.createdAt = {};
    if (dateRange.start) filter.createdAt.$gte = new Date(dateRange.start);
    if (dateRange.end) filter.createdAt.$lte = new Date(dateRange.end);
  }

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((normalizedPage - 1) * normalizedLimit)
      .limit(normalizedLimit)
      .populate("actorId", "name role")
      .lean(),
    AuditLog.countDocuments(filter)
  ]);

  return {
    logs,
    total,
    page: normalizedPage,
    totalPages: Math.ceil(total / normalizedLimit),
    narrative:
      total > 0
        ? `${total} audit events match this control view. Review unusual actor or entity patterns before compliance export.`
        : "No audit events match the current filters.",
    recommendedActions: [
      {
        type: "AUDIT_REVIEW",
        message: "Export filtered audit logs for compliance review if this view represents a policy incident.",
        severity: "low",
        link: "/admin/audit-logs"
      }
    ]
  };
};
