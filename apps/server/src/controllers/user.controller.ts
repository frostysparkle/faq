// User administration controller — thin HTTP layer.
import type { Request, Response } from 'express';
import type { ChangeRoleInput, UserListQuery } from '@samagama/shared';
import { userService } from '../services/user.service.js';
import { ok } from '../utils/api-response.js';
import { ApiError } from '../utils/api-error.js';

export const userController = {
  async list(req: Request, res: Response) {
    const query: UserListQuery = {
      page: Number(req.query.page ?? 1),
      pageSize: Number(req.query.pageSize ?? 20),
      role: req.query.role as UserListQuery['role'],
      status: req.query.status as UserListQuery['status'],
      q: req.query.q as string | undefined,
    };
    const result = await userService.list(query);
    return ok(res, result.items, {
      page: query.page,
      pageSize: query.pageSize,
      total: result.total,
      totalPages: Math.ceil(result.total / query.pageSize),
    });
  },

  async changeRole(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const { role } = req.body as ChangeRoleInput;
    const user = await userService.changeRole(req.params.id!, role, req.user.id);
    return ok(res, user);
  },

  async suspend(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const user = await userService.suspendUser(req.params.id!, req.user.id);
    return ok(res, user);
  },

  async activate(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    const user = await userService.activateUser(req.params.id!, req.user.id);
    return ok(res, user);
  },

  async deleteUser(req: Request, res: Response) {
    if (!req.user) throw ApiError.unauthorized();
    await userService.deleteUser(req.params.id!, req.user.id);
    res.status(204).end();
  },
};
