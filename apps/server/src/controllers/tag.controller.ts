import type { Request, Response } from 'express';
import type { TagCreateInput, TagUpdateInput } from '@samagama/shared';
import { tagService } from '../services/tag.service.js';
import { created, ok } from '../utils/api-response.js';

export const tagController = {
  async list(req: Request, res: Response) {
    const includeInactive = req.user?.role === 'admin' && req.query.all === 'true';
    return ok(res, await tagService.list(includeInactive));
  },
  async create(req: Request, res: Response) {
    return created(res, await tagService.create(req.body as TagCreateInput));
  },
  async update(req: Request, res: Response) {
    return ok(res, await tagService.update(req.params.id!, req.body as TagUpdateInput));
  },
  async archive(req: Request, res: Response) {
    return ok(res, await tagService.archive(req.params.id!));
  },
};
