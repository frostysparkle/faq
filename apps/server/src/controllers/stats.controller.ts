import type { Request, Response } from 'express';
import { statsService } from '../services/stats.service.js';
import { analyticsService } from '../services/analytics.service.js';
import { ok } from '../utils/api-response.js';
import { ApiError } from '../utils/api-error.js';

export const statsController = {
  async getFaqStats(_req: Request, res: Response) {
    return ok(res, await statsService.getFaqStats());
  },

  /** Counts that drive the moderator dashboard cards. */
  async getModeratorStats(_req: Request, res: Response) {
    return ok(res, await statsService.getModeratorDashboardStats());
  },

  /** Stats for the student home page (4 cards). */
  async getStudentStats(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    return ok(res, await statsService.getStudentHomeStats(req.user.id));
  },

  /** Spurti Points leaderboard for the analytics page. */
  async getLeaderboard(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const range = (req.query.range as 'week' | 'month' | 'all' | undefined) ?? 'all';
    if (!['week', 'month', 'all'].includes(range)) {
      throw ApiError.badRequest('range must be week, month, or all');
    }
    return ok(res, await statsService.getLeaderboard(range, req.user.id));
  },

  /**
   * Idle-bucket counts for open community questions. Used by all roles — students see them
   * on the home page, moderators on Unresolved Questions, admins on Admin Overview, and the
   * Community page filter chips read the same numbers so dashboard and filter never drift.
   */
  async getCommunityIdle(_req: Request, res: Response) {
    return ok(res, await statsService.getCommunityIdleBuckets());
  },

  /** Admin intelligence — system-wide health overview for the admin dashboard. */
  async getAdminIntelligence(_req: Request, res: Response) {
    return ok(res, await statsService.getAdminIntelligenceStats());
  },

  /** Per-moderator performance metrics for the admin moderation-load page. */
  async getModerationLoad(_req: Request, res: Response) {
    return ok(res, await statsService.getModerationLoadStats());
  },

  /** Personal performance stats for the logged-in moderator. */
  async getModeratorPersonal(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    return ok(res, await statsService.getModeratorPersonalStats(req.user.id));
  },

  /** FAQ quality scores for the admin FAQ Quality page. */
  async getFaqQuality(req: Request, res: Response) {
    const filter = (req.query.filter as 'all' | 'rewrite' | 'archive') ?? 'all';
    return ok(res, await statsService.listFaqsForQuality(filter));
  },

  /** Daily helpful / unhelpful / flagged vote counts for the last 7 days.
   *  Drives the real sparklines in the FAQ Management summary cards. */
  async getVotesTrend(_req: Request, res: Response) {
    return ok(res, await analyticsService.getVotesTrend());
  },
};
