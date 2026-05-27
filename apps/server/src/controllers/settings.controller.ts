import type { Request, Response } from 'express';
import { settingsService } from '../services/settings.service.js';
import { ok } from '../utils/api-response.js';

export const settingsController = {
  async get(_req: Request, res: Response) {
    return ok(res, await settingsService.get());
  },

  async update(req: Request, res: Response) {
    return ok(res, await settingsService.update(req.body));
  },
};
