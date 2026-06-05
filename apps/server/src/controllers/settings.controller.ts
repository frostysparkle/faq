// Global system-settings HTTP layer (admin-configurable thresholds). Singleton document.
import type { Request, Response } from 'express';
import { settingsService } from '../services/settings.service.js';
import { ok } from '../utils/api-response.js';

export const settingsController = {
  // Read the current global settings (creating defaults on first access).
  async get(_req: Request, res: Response) {
    return ok(res, await settingsService.get());
  },

  // Admin: patch one or more settings values.
  async update(req: Request, res: Response) {
    return ok(res, await settingsService.update(req.body));
  },
};
