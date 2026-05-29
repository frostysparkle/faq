// Schedule suggestion: run quality recalculation every 6 hours, priority every 2 hours, and search clustering every 1 hour.
import AnalyticsCache from "../models/AnalyticsCache.js";
import Faq from "../models/Faq.js";
import Question from "../models/Question.js";
import SearchLog from "../models/SearchLog.js";
import { FAQ_STATUS, QUESTION_STATUS } from "../constants/statuses.js";

const DAY_MS = 24 * 60 * 60 * 1000;

const titleize = (value) =>
  value
    .split(" ")
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");

export const recalculateAllQualityScores = async () => {
  const faqs = await Faq.find({ status: FAQ_STATUS.PUBLISHED }).select("_id").lean();
  const operations = [];

  for (const faq of faqs) {
    const qualityScore = await Faq.calculateQualityScore(faq._id);
    operations.push({
      updateOne: {
        filter: { _id: faq._id },
        update: { $set: { qualityScore } }
      }
    });
  }

  if (operations.length > 0) {
    await Faq.bulkWrite(operations);
  }

  console.info(`[AnalyticsJobs] Recalculated ${operations.length} FAQ quality scores`);
  return { updated: operations.length };
};

export const recalculateAllPriorityScores = async () => {
  const openQuestions = await Question.find({ status: QUESTION_STATUS.OPEN }).select("_id categoryId createdAt").lean();
  const sevenDaysAgo = new Date(Date.now() - 7 * DAY_MS);
  const categoryIds = [...new Set(openQuestions.map((question) => question.categoryId?.toString()).filter(Boolean))];
  const categoryDemand = await Promise.all(
    categoryIds.map(async (categoryId) => [
      categoryId,
      await Question.countDocuments({
        categoryId,
        createdAt: { $gte: sevenDaysAgo }
      })
    ])
  );
  const volumeMap = new Map(categoryDemand);
  const operations = openQuestions.map((question) => {
    const hoursSinceCreation = (Date.now() - new Date(question.createdAt).getTime()) / (1000 * 60 * 60);
    const ageScore = Math.min(hoursSinceCreation / 72, 1);
    const categoryDemandScore = Math.min((volumeMap.get(question.categoryId?.toString()) ?? 0) / 50, 1);
    const priorityScore = 0.3 * ageScore + 0.25 * categoryDemandScore + 0.2 * 0 + 0.15 * 0 + 0.1 * 0;

    return {
      updateOne: {
        filter: { _id: question._id },
        update: { $set: { priorityScore: Number(priorityScore.toFixed(4)) } }
      }
    };
  });

  if (operations.length > 0) {
    await Question.bulkWrite(operations);
  }

  console.info(`[AnalyticsJobs] Recalculated ${operations.length} question priority scores`);
  return { updated: operations.length };
};

export const clusterUnansweredSearches = async () => {
  const clusters = await SearchLog.aggregate([
    {
      $match: {
        resultCount: 0,
        clickedFaqId: { $exists: false }
      }
    },
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
    { $limit: 100 },
    {
      $project: {
        _id: 0,
        query: "$_id",
        count: 1,
        lastSeenAt: 1,
        relatedCategory: 1
      }
    }
  ]);
  const payload = clusters.map((cluster) => ({
    ...cluster,
    suggestedFaqTitle: `${titleize(cluster.query)} - Troubleshooting Guide`
  }));

  await AnalyticsCache.findOneAndUpdate(
    { key: "unanswered-search-clusters" },
    {
      key: "unanswered-search-clusters",
      payload,
      computedAt: new Date(),
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000)
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.info(`[AnalyticsJobs] Clustered ${payload.length} unanswered search groups`);
  return { clusters: payload.length };
};
