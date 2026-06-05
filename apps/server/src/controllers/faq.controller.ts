import type { Request, Response } from 'express';
import type {
  FaqCreateInput,
  FaqFeedbackInput,
  FaqListQuery,
  FaqUpdateInput,
} from '@samagama/shared';
import { faqService } from '../services/faq.service.js';
import { created, noContent, ok } from '../utils/api-response.js';
import { ApiError } from '../utils/api-error.js';

export const faqController = {
  async list(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const result = await faqService.list({
      query: req.query as unknown as FaqListQuery,
      role: req.user.role,
      userId: req.user.id,
    });
    return ok(res, result.items, {
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
      totalPages: Math.max(1, Math.ceil(result.total / result.pageSize)),
    });
  },

  async getById(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const faq = await faqService.getById(req.params.id!, req.user.role, req.user.id);
    return ok(res, faq);
  },

  async create(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const doc = await faqService.create(req.body as FaqCreateInput, req.user.id);
    return created(res, { id: doc.id });
  },

  async update(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const { faq, statsReset } = await faqService.update(
      req.params.id!,
      req.body as FaqUpdateInput,
      req.user.id,
    );
    if (statsReset) {
      // Resolve outstanding flags on this FAQ since the content has been amended.
      // Fire-and-forget — does not block the response, but we await import for type safety.
      const { FlagModel } = await import('../models/Flag.model.js');
      void FlagModel.updateMany(
        { entityType: 'faq', entityId: faq._id, status: { $in: ['open', 'under_review'] } },
        {
          $set: {
            status: 'resolved',
            reviewedBy: req.user.id,
            resolutionNote: 'Resolved automatically after FAQ answer was edited.',
          },
        },
      );
    }
    return ok(res, { id: faq.id, statsReset });
  },

  async delete(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    await faqService.delete(req.params.id!);
    return noContent(res);
  },

  async recordView(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    await faqService.recordView(req.params.id!, req.user.id);
    return noContent(res);
  },

  async submitFeedback(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const { rating } = req.body as FaqFeedbackInput;
    const result = await faqService.submitFeedback(req.params.id!, req.user.id, rating);
    return ok(res, result);
  },

  async recentlyViewed(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    return ok(res, await faqService.getRecentlyViewed(req.user.id, req.user.role));
  },

  /** POST /api/faqs/check-similar — mirrors remote POST /api/faqs/check-similar. */
  async checkSimilarity(req: Request, res: Response) {
    const { title, limit, threshold } = req.body as {
      title: string;
      limit?: number;
      threshold?: number;
    };
    if (!title || typeof title !== 'string' || title.trim().length < 3) {
      throw ApiError.badRequest('title must be at least 3 characters');
    }
    const results = await faqService.checkSimilarity(title.trim(), { limit, threshold });
    return ok(res, results);
  },
};
