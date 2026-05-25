import type { Request, Response } from 'express';
import { statsService } from '../services/stats.service.js';
import { QuestionModel } from '../models/Question.model.js';
import { ok } from '../utils/api-response.js';

export const statsController = {
  async getFaqStats(_req: Request, res: Response) {
    return ok(res, await statsService.getFaqStats());
  },

  /** Counts that drive the moderator dashboard cards. */
  async getModeratorStats(_req: Request, res: Response) {
    const [faqStats, unresolvedQuestions] = await Promise.all([
      statsService.getFaqStats(),
      QuestionModel.countDocuments({ status: { $in: ['open', 'answered'] } }),
    ]);
    return ok(res, {
      unresolvedQuestions,
      flaggedFaqs: faqStats.flaggedCount,
      flaggedFaqPercentage: faqStats.flaggedPercentage,
    });
  },
};
