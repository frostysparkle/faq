// Admin analytics controller. Mirrors remote adminController.js.
// All endpoints require admin role — enforced at the route level.
import type { Request, Response } from 'express';
import { analyticsService } from '../services/analytics.service.js';
import { ok } from '../utils/api-response.js';

export const adminController = {
  async getOverview(_req: Request, res: Response) {
    return ok(res, await analyticsService.getOverview());
  },

  async getIssueHeatmap(req: Request, res: Response) {
    const days = Number(req.query.days) || 30;
    return ok(res, await analyticsService.getIssueHeatmap(days));
  },

  async getUnansweredSearches(req: Request, res: Response) {
    const limit = Number(req.query.limit) || 20;
    return ok(res, await analyticsService.getUnansweredSearches(limit));
  },

  async getFaqQuality(req: Request, res: Response) {
    const limit = Number(req.query.limit) || 20;
    const sort = req.query.sort === 'best' ? 'best' : 'worst';
    return ok(res, await analyticsService.getFaqQuality({ limit, sort }));
  },

  async getModerationLoad(req: Request, res: Response) {
    const days = Number(req.query.days) || 14;
    return ok(res, await analyticsService.getModerationLoad({ days }));
  },

  async getAuditLogs(req: Request, res: Response) {
    return ok(
      res,
      await analyticsService.getAuditLogs({
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
        actorId: req.query.actorId as string | undefined,
        entityType: req.query.entityType as string | undefined,
        action: req.query.action as string | undefined,
        dateRange: {
          start: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
          end: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        },
      }),
    );
  },
};
