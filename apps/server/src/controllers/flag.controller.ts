import type { Request, Response } from 'express';
import type { FlagCreateInput, FlagListQuery, FlagUpdateStatusInput } from '@samagama/shared';
import { flagService } from '../services/flag.service.js';
import { created, ok } from '../utils/api-response.js';
import { ApiError } from '../utils/api-error.js';

export const flagController = {
  async create(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const flag = await flagService.createOrUpdate(req.body as FlagCreateInput, req.user.id);
    return created(res, flag);
  },

  async list(req: Request, res: Response) {
    return ok(res, await flagService.list(req.query as unknown as FlagListQuery));
  },

  async updateStatus(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const flag = await flagService.updateStatus(
      req.params.id!,
      req.user.id,
      req.body as FlagUpdateStatusInput,
    );
    return ok(res, flag);
  },
};
