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

export interface FaqStats {
  totalFaqs: number;
  publishedFaqs: number;
  helpfulPercentage: number;
  flaggedPercentage: number;
  flaggedCount: number;
  archivedCount: number;
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
    const [totalFaqs, publishedFaqs, archivedCount, votedAgg, flaggedFaqIds] = await Promise.all([
      FaqModel.countDocuments({}),
      FaqModel.countDocuments({ status: 'published' }),
      FaqModel.countDocuments({ status: 'archived' }),
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
      archivedCount,
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
   * Spurti Points leaderboard. `range` filters the answer activity used to compute
   * the secondary metric (approvedAnswers); the points balance is always the live total.
   * Top 20 students are returned, plus the current user's rank if they're outside the top 20.
   */
  async getLeaderboard(
    range: 'week' | 'month' | 'all',
    currentUserId: string,
  ): Promise<LeaderboardResponse> {
    const since = (() => {
      const now = Date.now();
      if (range === 'week') return new Date(now - 7 * 24 * 60 * 60 * 1000);
      if (range === 'month') return new Date(now - 30 * 24 * 60 * 60 * 1000);
      return null;
    })();

    // Aggregate approved-answer counts per student in the time window.
    const matchStage: Record<string, unknown> = { status: 'approved' };
    if (since) matchStage.approvedAt = { $gte: since };

    const answersByStudent = await AnswerModel.aggregate<{
      _id: mongoose.Types.ObjectId;
      approvedAnswers: number;
    }>([{ $match: matchStage }, { $group: { _id: '$answeredBy', approvedAnswers: { $sum: 1 } } }]);
    const approvedByUser = new Map(
      answersByStudent.map((row) => [row._id.toString(), row.approvedAnswers]),
    );

    const students = await UserModel.find({ role: 'student', status: 'active' })
      .select('name spurtiPoints')
      .sort({ spurtiPoints: -1, name: 1 })
      .lean<{ _id: mongoose.Types.ObjectId; name: string; spurtiPoints?: number }[]>();

    const ranked: LeaderboardEntry[] = students.map((s, idx) => ({
      rank: idx + 1,
      userId: s._id.toString(),
      name: s.name,
      spurtiPoints: s.spurtiPoints ?? 0,
      approvedAnswers: approvedByUser.get(s._id.toString()) ?? 0,
      isMe: s._id.toString() === currentUserId,
    }));

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
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const threshold24h = new Date(now - day);
  const threshold7d = new Date(now - 7 * day);

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
};
