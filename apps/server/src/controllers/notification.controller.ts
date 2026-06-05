import type { Request, Response } from 'express';
import { notificationService } from '../services/notification.service.js';
import { ok, noContent } from '../utils/api-response.js';
import { ApiError } from '../utils/api-error.js';

export const notificationController = {
  async list(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    return ok(res, await notificationService.listForUser(req.user.id));
  },

  async unreadCount(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const count = await notificationService.getUnreadCount(req.user.id);
    return ok(res, { count });
  },

  async markRead(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    await notificationService.markRead(req.params.id!, req.user.id);
    return noContent(res);
  },

  async markAllRead(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    await notificationService.markAllRead(req.user.id);
    return noContent(res);
  },
};
