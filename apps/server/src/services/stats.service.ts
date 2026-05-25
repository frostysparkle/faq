// Aggregate metrics for the FAQ Management dashboard cards.
//
// Helpful%   = average over FAQs with any vote of helpfulCount / (helpfulCount + unhelpfulCount).
//              Reported as 0 when no FAQs have been voted on.
// Flagged%   = flaggedFaqCount / publishedFaqCount, where a flagged FAQ has flagCount > 0
//              OR an open/under_review flag in the Flag collection.
//
// Definitions are documented here so the Dashboard Spec can be audited against them.
import { FaqModel } from '../models/Faq.model.js';
import { FlagModel } from '../models/Flag.model.js';

export interface FaqStats {
  totalFaqs: number;
  publishedFaqs: number;
  helpfulPercentage: number;
  flaggedPercentage: number;
  flaggedCount: number;
  archivedCount: number;
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
};
