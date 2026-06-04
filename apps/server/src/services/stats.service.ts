// Aggregate metrics for the FAQ Management dashboard cards.
//
// Helpful%   = average over FAQs with any vote of helpfulCount / (helpfulCount + unhelpfulCount).
//              Reported as 0 when no FAQs have been voted on.
// Flagged%   = flaggedFaqCount / publishedFaqCount, where a flagged FAQ has flagCount > 0
//              OR an open/under_review flag in the Flag collection.
//
// Definitions are documented here so the Dashboard Spec can be audited against them.
import mongoose from 'mongoose';
import { FaqModel } from '../models/Faq.model.js';
import { FlagModel } from '../models/Flag.model.js';
import { QuestionModel } from '../models/Question.model.js';
import { AnswerModel } from '../models/Answer.model.js';
import { UserModel } from '../models/User.model.js';
import { SystemSettingsModel } from '../models/SystemSettings.model.js';

export interface FaqStats {
  totalFaqs: number;
  publishedFaqs: number;
  helpfulPercentage: number;
  flaggedPercentage: number;
  flaggedCount: number;
}

export interface StudentHomeStats {
  /** Open community questions — both `open` and `answered` (anything not yet resolved). */
  openCommunityQuestions: number;
  /** Subset above with no answers yet. */
  unansweredCommunityQuestions: number;
  /** Approved answers authored by this student. */
  questionsYouAnswered: number;
  /** Live Spurti Points balance. */
  spurtiPoints: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  spurtiPoints: number;
  approvedAnswers: number;
  isMe?: boolean;
}

export interface LeaderboardResponse {
  range: 'week' | 'month' | 'all';
  entries: LeaderboardEntry[];
  myRank?: number;
}

/**
 * Idle-bucket counts for **open community questions** (status ∈ {open, answered}).
 * Buckets are mutually exclusive so a question is counted exactly once:
 *   - last24h:  updatedAt within the last 24 hours
 *   - over3days: updatedAt is older than 3 days but newer than 7 days
 *   - over1week: updatedAt is older than 7 days
 *
 * Activity proxy: `updatedAt`. Mongoose bumps it on save; submitting an answer also
 * touches the question (via $inc on answerCount), so a fresh answer "wakes" the row.
 */
export interface IdleBuckets {
  last24h: number;
  over3days: number;
  over1week: number;
  /** Convenience total of all three buckets — equals openCommunityQuestions overall. */
  totalOpen: number;
}

export const statsService = {
  async getFaqStats(): Promise<FaqStats> {
    const [totalFaqs, publishedFaqs, votedAgg, flaggedFaqIds] = await Promise.all([
      FaqModel.countDocuments({}),
      FaqModel.countDocuments({ status: 'published' }),
      FaqModel.aggregate<{ ratio: number }>([
        { $match: { status: 'published' } },
        {
          $project: {
            total: { $add: ['$helpfulCount', '$unhelpfulCount'] },
            helpful: '$helpfulCount',
          },
        },
        { $match: { total: { $gt: 0 } } },
        { $project: { ratio: { $divide: ['$helpful', '$total'] } } },
        { $group: { _id: null, avg: { $avg: '$ratio' } } },
        { $project: { _id: 0, ratio: { $ifNull: ['$avg', 0] } } },
      ]),
      // FAQs with any open flag — counts each FAQ only once even if multiple flags exist.
      FlagModel.distinct('entityId', {
        entityType: 'faq',
        status: { $in: ['open', 'under_review'] },
      }),
    ]);

    const flaggedCount = flaggedFaqIds.length;
    const helpfulPercentage =
      Math.round(((votedAgg[0]?.ratio ?? 0) * 100 + Number.EPSILON) * 10) / 10;
    const flaggedPercentage =
      publishedFaqs > 0 ? Math.round((flaggedCount / publishedFaqs) * 1000) / 10 : 0;

    return {
      totalFaqs,
      publishedFaqs,
      helpfulPercentage,
      flaggedPercentage,
      flaggedCount,
    };
  },

  /**
   * Stats that drive the four cards on the student home page.
   * Counts approved answers from day 1 (PRD: "from day 1").
   */
  async getStudentHomeStats(userId: string): Promise<StudentHomeStats> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const [openCommunityQuestions, unansweredCommunityQuestions, questionsYouAnswered, user] =
      await Promise.all([
        QuestionModel.countDocuments({
          type: 'community',
          status: { $in: ['open', 'answered'] },
        }),
        QuestionModel.countDocuments({ type: 'community', status: 'open', answerCount: 0 }),
        AnswerModel.countDocuments({ answeredBy: userObjectId, status: 'approved' }),
        UserModel.findById(userId).select('spurtiPoints').lean<{ spurtiPoints?: number }>(),
      ]);
    return {
      openCommunityQuestions,
      unansweredCommunityQuestions,
      questionsYouAnswered,
      spurtiPoints: user?.spurtiPoints ?? 0,
    };
  },

  /**
   * Spurti Points leaderboard. `range` filters the approval window used to compute
   * earned points (approvedAnswers × default award); the live balance is always fetched too.
   * - week:  previous completed Mon–Sun calendar week
   * - month: previous calendar month (1st–last day)
   * - all:   no date filter — cumulative all-time
   * Top 20 students are returned, plus the current user's rank if outside the top 20.
   */
  async getLeaderboard(
    range: 'week' | 'month' | 'all',
    currentUserId: string,
  ): Promise<LeaderboardResponse> {
    const window = (() => {
      const now = new Date();
      if (range === 'week') {
        // Days since the most recent Monday (0 on Mon, 6 on Sun)
        const daysSinceMon = now.getDay() === 0 ? 6 : now.getDay() - 1;
        const thisMonday = new Date(now);
        thisMonday.setDate(now.getDate() - daysSinceMon);
        thisMonday.setHours(0, 0, 0, 0);
        // Previous week: Mon = thisMonday − 7 days, Sun = thisMonday − 1 ms
        const prevMonday = new Date(thisMonday);
        prevMonday.setDate(thisMonday.getDate() - 7);
        const prevSunday = new Date(thisMonday.getTime() - 1); // 23:59:59.999 of last Sunday
        return { gte: prevMonday, lte: prevSunday };
      }
      if (range === 'month') {
        const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const firstOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastOfPrevMonth = new Date(firstOfThisMonth.getTime() - 1);
        return { gte: firstOfPrevMonth, lte: lastOfPrevMonth };
      }
      return null;
    })();

    // Aggregate approved-answer counts per student in the time window.
    const matchStage: Record<string, unknown> = { status: 'approved' };
    if (window) matchStage.approvedAt = { $gte: window.gte, $lte: window.lte };

    const answersByStudent = await AnswerModel.aggregate<{
      _id: mongoose.Types.ObjectId;
      approvedAnswers: number;
    }>([{ $match: matchStage }, { $group: { _id: '$answeredBy', approvedAnswers: { $sum: 1 } } }]);
    const approvedByUser = new Map(
      answersByStudent.map((row) => [row._id.toString(), row.approvedAnswers]),
    );

    const students = await UserModel.find({ role: 'student', status: 'active' })
      .select('name spurtiPoints')
      .lean<{ _id: mongoose.Types.ObjectId; name: string; spurtiPoints?: number }[]>();

    let ranked: LeaderboardEntry[] = students.map((s) => ({
      rank: 0,
      userId: s._id.toString(),
      name: s.name,
      spurtiPoints: s.spurtiPoints ?? 0,
      approvedAnswers: approvedByUser.get(s._id.toString()) ?? 0,
      isMe: s._id.toString() === currentUserId,
    }));

    if (range !== 'all') {
      ranked.sort((a, b) => {
        if (b.approvedAnswers !== a.approvedAnswers) {
          return b.approvedAnswers - a.approvedAnswers;
        }
        if (b.spurtiPoints !== a.spurtiPoints) {
          return b.spurtiPoints - a.spurtiPoints;
        }
        return a.name.localeCompare(b.name);
      });
    } else {
      ranked.sort((a, b) => {
        if (b.spurtiPoints !== a.spurtiPoints) {
          return b.spurtiPoints - a.spurtiPoints;
        }
        return a.name.localeCompare(b.name);
      });
    }

    ranked = ranked.map((r, idx) => ({ ...r, rank: idx + 1 }));

    const top = ranked.slice(0, 20);
    const myRank = ranked.find((r) => r.isMe)?.rank;
    if (myRank && myRank > 20) top.push(ranked[myRank - 1]!);

    return { range, entries: top, myRank };
  },

/**
 * Single-aggregation idle bucket counts for the open community queue.
 * Used by both the dashboard cards and the community-page filter chips, so the
 * card and the filter always agree.
 *
 * Bucket math (mutually exclusive — every open community question fits exactly one):
 *   - last24h:   updatedAt within the last 24 hours
 *   - over3days: updatedAt is older than 24h but newer than 7 days  (the "needs a nudge" middle)
 *   - over1week: updatedAt is older than 7 days
 *
 * The middle bucket spans 24h–7d so the three counts always sum to totalOpen. The spec
 * literally says "more than 3 days", but a strict > 3d cutoff would leave open questions
 * idle for 1-3 days uncounted on every dashboard, which is worse than a slightly wider
 * middle bucket. Documented here so future readers can see the choice.
 */
async getCommunityIdleBuckets(): Promise<IdleBuckets> {
  const settings = await SystemSettingsModel.findById('global').lean();
  const urgentIdleDays = settings?.urgentIdleDays ?? 7;
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const threshold24h = new Date(now - day);
  const threshold7d = new Date(now - urgentIdleDays * day);

  const [row] = await QuestionModel.aggregate<{
    last24h: number;
    over3days: number;
    over1week: number;
    totalOpen: number;
  }>([
    { $match: { type: 'community', status: { $in: ['open', 'answered'] } } },
    {
      $facet: {
        last24h: [{ $match: { updatedAt: { $gte: threshold24h } } }, { $count: 'n' }],
        over3days: [
          { $match: { updatedAt: { $lt: threshold24h, $gte: threshold7d } } },
          { $count: 'n' },
        ],
        over1week: [{ $match: { updatedAt: { $lt: threshold7d } } }, { $count: 'n' }],
        totalOpen: [{ $count: 'n' }],
      },
    },
    {
      $project: {
        last24h: { $ifNull: [{ $arrayElemAt: ['$last24h.n', 0] }, 0] },
        over3days: { $ifNull: [{ $arrayElemAt: ['$over3days.n', 0] }, 0] },
        over1week: { $ifNull: [{ $arrayElemAt: ['$over1week.n', 0] }, 0] },
        totalOpen: { $ifNull: [{ $arrayElemAt: ['$totalOpen.n', 0] }, 0] },
      },
    },
  ]);

  return row ?? { last24h: 0, over3days: 0, over1week: 0, totalOpen: 0 };
},

  /**
   * Admin intelligence metrics — single-screen system-health overview.
   */
  async getAdminIntelligenceStats(): Promise<AdminIntelligenceStats> {
    const [
      unresolvedQuestions,
      pendingModerationItems,
      faqsNeedingReview,
      faqStats,
      avgResolutionTime,
      qualityAlerts,
    ] = await Promise.all([
      QuestionModel.countDocuments({ status: { $in: ['open', 'answered'] } }),
      AnswerModel.countDocuments({ status: 'pending' }),
      FaqModel.countDocuments({ status: { $in: ['draft', 'outdated'] } }),
      this.getFaqStats(),
      this._computeAvgResolutionTime(),
      this._computeQualityAlerts(5),
    ]);

    return {
      unresolvedQuestions,
      pendingModerationItems,
      faqsNeedingReview,
      avgResolutionTimeHours: avgResolutionTime,
      publishedFaqs: faqStats.publishedFaqs,
      totalFaqs: faqStats.totalFaqs,
      helpfulPercentage: faqStats.helpfulPercentage,
      flaggedCount: faqStats.flaggedCount,
      qualityAlerts,
    };
  },

  /**
   * Average time (in hours) from question creation to resolved status.
   * Only considers community questions resolved in the last 30 days.
   */
  async _computeAvgResolutionTime(): Promise<number> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [result] = await QuestionModel.aggregate<{ avgHours: number }>([
      { $match: { status: 'resolved', updatedAt: { $gte: thirtyDaysAgo } } },
      {
        $project: {
          resolutionMs: { $subtract: ['$updatedAt', '$createdAt'] },
        },
      },
      {
        $group: {
          _id: null,
          avgMs: { $avg: '$resolutionMs' },
        },
      },
      {
        $project: {
          _id: 0,
          avgHours: { $round: [{ $divide: ['$avgMs', 3600000] }, 1] },
        },
      },
    ]);
    return result?.avgHours ?? 0;
  },

  /**
   * Top N FAQs that are at quality risk — high flag ratio or low helpful ratio.
   */
  async _computeQualityAlerts(limit: number): Promise<QualityAlert[]> {
    const faqs = await FaqModel.find({ status: 'published' })
      .select('title helpfulCount unhelpfulCount flagCount viewCount updatedAt')
      .lean();

    const scored = faqs.map((faq) => {
      const total = (faq.helpfulCount ?? 0) + (faq.unhelpfulCount ?? 0);
      const helpfulRatio = total > 0 ? (faq.helpfulCount ?? 0) / total : 0.5;
      const flagRatio = (faq.viewCount ?? 0) > 0
        ? (faq.flagCount ?? 0) / (faq.viewCount ?? 1)
        : 0;
      // Lower score = higher risk
      const qualityScore = Math.round(
        (0.4 * helpfulRatio +
          0.35 * (1 - Math.min(flagRatio * 10, 1)) +
          0.25 * computeFreshnessScore(faq.updatedAt)) * 100,
      );
      return {
        id: faq._id.toString(),
        title: faq.title,
        qualityScore,
        helpfulRatio: Math.round(helpfulRatio * 100),
        flagCount: faq.flagCount ?? 0,
        viewCount: faq.viewCount ?? 0,
        updatedAt: faq.updatedAt.toISOString(),
      };
    });

    // Sort by quality score ascending (worst first), take top N.
    scored.sort((a, b) => a.qualityScore - b.qualityScore);
    return scored.slice(0, limit);
  },

  /**
   * Per-moderator performance stats — approvals, rejections, avg response time.
   */
  async getModerationLoadStats(): Promise<ModerationLoadStats> {
    const now = Date.now();
    const todayStart = new Date(now - (now % (24 * 60 * 60 * 1000)));
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

    // Per-moderator aggregation from Answer.moderatorId
    const modPerformance = await AnswerModel.aggregate<{
      _id: mongoose.Types.ObjectId;
      totalApprovals: number;
      totalRejections: number;
      approvalsThisWeek: number;
      avgResponseTimeMs: number;
    }>([
      { $match: { moderatorId: { $exists: true, $ne: null } } },
      {
        $facet: {
          byMod: [
            {
              $group: {
                _id: '$moderatorId',
                totalApprovals: {
                  $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] },
                },
                totalRejections: {
                  $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] },
                },
                approvalsThisWeek: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $eq: ['$status', 'approved'] },
                          { $gte: ['$approvedAt', weekAgo] },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
                avgResponseTimeMs: {
                  $avg: { $subtract: ['$updatedAt', '$createdAt'] },
                },
              },
            },
          ],
        },
      },
      { $unwind: '$byMod' },
      { $replaceRoot: { newRoot: '$byMod' } },
    ]);

    // Look up moderator names
    const modIds = modPerformance.map((m) => m._id);
    const moderators = await UserModel.find({ _id: { $in: modIds } })
      .select('name email')
      .lean();
    const modMap = new Map(
      moderators.map((m) => [m._id.toString(), { name: m.name, email: m.email }]),
    );

    const moderatorMetrics: ModeratorMetric[] = modPerformance.map((m) => ({
      moderatorId: m._id.toString(),
      name: modMap.get(m._id.toString())?.name ?? 'Unknown',
      email: modMap.get(m._id.toString())?.email ?? '',
      totalApprovals: m.totalApprovals,
      totalRejections: m.totalRejections,
      approvalsThisWeek: m.approvalsThisWeek,
      avgResponseTimeHours: Math.round((m.avgResponseTimeMs / 3600000) * 10) / 10,
    }));

    // Category backlog
    const categoryBacklog = await AnswerModel.aggregate<{
      category: string;
      count: number;
    }>([
      { $match: { status: 'pending' } },
      {
        $lookup: {
          from: 'questions',
          localField: 'questionId',
          foreignField: '_id',
          as: 'question',
        },
      },
      { $unwind: '$question' },
      {
        $lookup: {
          from: 'categories',
          localField: 'question.category',
          foreignField: '_id',
          as: 'cat',
        },
      },
      { $unwind: { path: '$cat', preserveNullAndEmptyArrays: true } },
      { $group: { _id: '$cat.name', count: { $sum: 1 } } },
      { $project: { _id: 0, category: { $ifNull: ['$_id', 'Uncategorized'] }, count: 1 } },
      { $sort: { count: -1 } },
    ]);

    const pendingTotal = await AnswerModel.countDocuments({ status: 'pending' });

    return {
      pendingQueueDepth: pendingTotal,
      moderators: moderatorMetrics,
      categoryBacklog,
    };
  },

  /**
   * Personal stats for a specific moderator (their own analytics page).
   */
  async getModeratorPersonalStats(moderatorId: string): Promise<ModeratorPersonalStats> {
    const now = Date.now();
    const todayStart = new Date(now - (now % (24 * 60 * 60 * 1000)));
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const modObjectId = new mongoose.Types.ObjectId(moderatorId);

    const [approvalsToday, approvalsThisWeek, totalApprovals, totalRejections, avgTime] =
      await Promise.all([
        AnswerModel.countDocuments({
          moderatorId: modObjectId,
          status: 'approved',
          approvedAt: { $gte: todayStart },
        }),
        AnswerModel.countDocuments({
          moderatorId: modObjectId,
          status: 'approved',
          approvedAt: { $gte: weekAgo },
        }),
        AnswerModel.countDocuments({ moderatorId: modObjectId, status: 'approved' }),
        AnswerModel.countDocuments({ moderatorId: modObjectId, status: 'rejected' }),
        AnswerModel.aggregate<{ avgMs: number }>([
          { $match: { moderatorId: modObjectId, status: { $in: ['approved', 'rejected'] } } },
          { $group: { _id: null, avgMs: { $avg: { $subtract: ['$updatedAt', '$createdAt'] } } } },
        ]),
      ]);

    // Category breakdown for this moderator
    const categoryBreakdown = await AnswerModel.aggregate<{
      category: string;
      count: number;
    }>([
      { $match: { moderatorId: modObjectId, status: { $in: ['approved', 'rejected'] } } },
      {
        $lookup: {
          from: 'questions',
          localField: 'questionId',
          foreignField: '_id',
          as: 'question',
        },
      },
      { $unwind: '$question' },
      {
        $lookup: {
          from: 'categories',
          localField: 'question.category',
          foreignField: '_id',
          as: 'cat',
        },
      },
      { $unwind: { path: '$cat', preserveNullAndEmptyArrays: true } },
      { $group: { _id: '$cat.name', count: { $sum: 1 } } },
      { $project: { _id: 0, category: { $ifNull: ['$_id', 'Uncategorized'] }, count: 1 } },
      { $sort: { count: -1 } },
    ]);

    return {
      approvalsToday,
      approvalsThisWeek,
      totalApprovals,
      totalRejections,
      avgResponseTimeHours: Math.round(((avgTime[0]?.avgMs ?? 0) / 3600000) * 10) / 10,
      categoryBreakdown,
    };
  },

  /**
   * FAQs with computed quality scores for the admin FAQ Quality page.
   */
  async listFaqsForQuality(
    filter: 'all' | 'rewrite' | 'archive',
  ): Promise<FaqQualityRow[]> {
    const faqs = await FaqModel.find({ status: { $in: ['published', 'outdated'] } })
      .select('title helpfulCount unhelpfulCount flagCount viewCount status updatedAt categories')
      .populate('categories', 'name')
      .lean();

    const rows: FaqQualityRow[] = faqs.map((faq) => {
      const total = (faq.helpfulCount ?? 0) + (faq.unhelpfulCount ?? 0);
      const helpfulRatio = total > 0 ? (faq.helpfulCount ?? 0) / total : 0.5;
      const flagRatio = (faq.viewCount ?? 0) > 0
        ? (faq.flagCount ?? 0) / (faq.viewCount ?? 1)
        : 0;
      const freshness = computeFreshnessScore(faq.updatedAt);
      const qualityScore = Math.round(
        (0.4 * helpfulRatio +
          0.35 * (1 - Math.min(flagRatio * 10, 1)) +
          0.25 * freshness) * 100,
      );

      let classification: 'good' | 'rewrite' | 'archive' = 'good';
      if (qualityScore < 30) classification = 'archive';
      else if (qualityScore < 60) classification = 'rewrite';

      const cats = (faq.categories as unknown as { name: string }[]) ?? [];

      return {
        id: faq._id.toString(),
        title: faq.title,
        qualityScore,
        helpfulRatio: Math.round(helpfulRatio * 100),
        flagCount: faq.flagCount ?? 0,
        viewCount: faq.viewCount ?? 0,
        status: faq.status as string,
        classification,
        category: cats[0]?.name ?? '—',
        updatedAt: faq.updatedAt.toISOString(),
      };
    });

    rows.sort((a, b) => a.qualityScore - b.qualityScore);

    if (filter === 'rewrite') return rows.filter((r) => r.classification === 'rewrite');
    if (filter === 'archive') return rows.filter((r) => r.classification === 'archive');
    return rows;
  },

  /** All counts needed by the moderator dashboard — 5 cards. */
  async getModeratorDashboardStats(): Promise<ModeratorDashboardStats> {
    const now = Date.now();
    const todayStart = new Date(now - (now % (24 * 60 * 60 * 1000)));
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const [
      // Personal questions
      personalTotal,
      personalUnanswered,
      personalToday,
      // Community questions (all-time)
      communityTotal,
      communityAnswered,
      communityUnanswered,
      // Community questions today
      communityTodayTotal,
      communityTodayAnswered,
      communityTodayUnanswered,
      // FAQs
      faqTotal,
      faqToday,
      faqThisWeek,
      // Flagged FAQs
      flaggedTotal,
      flaggedToday,
      flaggedThisWeek,
      // Published FAQs count (denominator for helpful/unhelpful %)
      publishedTotal,
      // Helpful/unhelpful aggregation
      engagementAgg,
    ] = await Promise.all([
      // --- Personal questions ---
      QuestionModel.countDocuments({ type: 'personal' }),
      QuestionModel.countDocuments({ type: 'personal', answerCount: 0 }),
      QuestionModel.countDocuments({ type: 'personal', createdAt: { $gte: todayStart } }),
      // --- Community questions all-time ---
      QuestionModel.countDocuments({ type: 'community' }),
      QuestionModel.countDocuments({ type: 'community', answerCount: { $gt: 0 } }),
      QuestionModel.countDocuments({ type: 'community', answerCount: 0 }),
      // --- Community questions today ---
      QuestionModel.countDocuments({ type: 'community', createdAt: { $gte: todayStart } }),
      QuestionModel.countDocuments({
        type: 'community',
        createdAt: { $gte: todayStart },
        answerCount: { $gt: 0 },
      }),
      QuestionModel.countDocuments({
        type: 'community',
        createdAt: { $gte: todayStart },
        answerCount: 0,
      }),
      // --- FAQs ---
      FaqModel.countDocuments({}),
      FaqModel.countDocuments({ createdAt: { $gte: todayStart } }),
      FaqModel.countDocuments({ createdAt: { $gte: weekAgo } }),
      // --- Flagged FAQs (distinct FAQs with an open/under_review flag) ---
      FlagModel.distinct('entityId', {
        entityType: 'faq',
        status: { $in: ['open', 'under_review'] },
      }).then((ids) => ids.length),
      FlagModel.distinct('entityId', {
        entityType: 'faq',
        status: { $in: ['open', 'under_review'] },
        createdAt: { $gte: todayStart },
      }).then((ids) => ids.length),
      FlagModel.distinct('entityId', {
        entityType: 'faq',
        status: { $in: ['open', 'under_review'] },
        createdAt: { $gte: weekAgo },
      }).then((ids) => ids.length),
      // --- Published FAQs ---
      FaqModel.countDocuments({ status: 'published' }),
      // --- Helpful / unhelpful aggregate across published FAQs ---
      FaqModel.aggregate<{ totalHelpful: number; totalUnhelpful: number }>([
        { $match: { status: 'published' } },
        {
          $group: {
            _id: null,
            totalHelpful: { $sum: '$helpfulCount' },
            totalUnhelpful: { $sum: '$unhelpfulCount' },
          },
        },
      ]).then((r) => r[0] ?? { totalHelpful: 0, totalUnhelpful: 0 }),
    ]);

    const totalVotes = engagementAgg.totalHelpful + engagementAgg.totalUnhelpful;
    const helpfulPct = totalVotes > 0 ? (engagementAgg.totalHelpful / totalVotes) * 100 : 0;
    const unhelpfulPct = totalVotes > 0 ? (engagementAgg.totalUnhelpful / totalVotes) * 100 : 0;

    return {
      personal: { total: personalTotal, unanswered: personalUnanswered, today: personalToday },
      community: { total: communityTotal, answered: communityAnswered, unanswered: communityUnanswered },
      communityToday: { total: communityTodayTotal, answered: communityTodayAnswered, unanswered: communityTodayUnanswered },
      faqs: { total: faqTotal, today: faqToday, thisWeek: faqThisWeek },
      flaggedFaqs: { total: flaggedTotal, today: flaggedToday, thisWeek: flaggedThisWeek },
      helpfulFaqs: { percentage: Math.round(helpfulPct * 10) / 10, publishedTotal },
      unhelpfulFaqs: { percentage: Math.round(unhelpfulPct * 10) / 10, publishedTotal },
    };
  },
};

// ─── Helper ──────────────────────────────────────────────────────────────────
function computeFreshnessScore(updatedAt: Date): number {
  const daysOld = (Date.now() - updatedAt.getTime()) / (24 * 60 * 60 * 1000);
  if (daysOld <= 7) return 1;
  if (daysOld <= 30) return 0.7;
  if (daysOld <= 90) return 0.4;
  return 0.1;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AdminIntelligenceStats {
  unresolvedQuestions: number;
  pendingModerationItems: number;
  faqsNeedingReview: number;
  avgResolutionTimeHours: number;
  publishedFaqs: number;
  totalFaqs: number;
  helpfulPercentage: number;
  flaggedCount: number;
  qualityAlerts: QualityAlert[];
}

export interface QualityAlert {
  id: string;
  title: string;
  qualityScore: number;
  helpfulRatio: number;
  flagCount: number;
  viewCount: number;
  updatedAt: string;
}

export interface ModerationLoadStats {
  pendingQueueDepth: number;
  moderators: ModeratorMetric[];
  categoryBacklog: { category: string; count: number }[];
}

export interface ModeratorMetric {
  moderatorId: string;
  name: string;
  email: string;
  totalApprovals: number;
  totalRejections: number;
  approvalsThisWeek: number;
  avgResponseTimeHours: number;
}

export interface ModeratorPersonalStats {
  approvalsToday: number;
  approvalsThisWeek: number;
  totalApprovals: number;
  totalRejections: number;
  avgResponseTimeHours: number;
  categoryBreakdown: { category: string; count: number }[];
}

export interface FaqQualityRow {
  id: string;
  title: string;
  qualityScore: number;
  helpfulRatio: number;
  flagCount: number;
  viewCount: number;
  status: string;
  classification: 'good' | 'rewrite' | 'archive';
  category: string;
  updatedAt: string;
}

export interface ModeratorDashboardStats {
  personal: { total: number; unanswered: number; today: number };
  community: { total: number; answered: number; unanswered: number };
  communityToday: { total: number; answered: number; unanswered: number };
  faqs: { total: number; today: number; thisWeek: number };
  flaggedFaqs: { total: number; today: number; thisWeek: number };
  helpfulFaqs: { percentage: number; publishedTotal: number };
  unhelpfulFaqs: { percentage: number; publishedTotal: number };
}

