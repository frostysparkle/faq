// User administration service — list, role change, suspend/activate.
// Business rules:
//   - Only admins can call these.
//   - Role changes are immediate.
//   - Suspension prevents new logins/submissions but preserves existing content.
//   - An admin cannot suspend or demote themselves.
import type { UserListQuery, PublicUserAdmin, UserRole } from '@samagama/shared';
import { UserModel } from '../models/User.model.js';
import { ApiError } from '../utils/api-error.js';
import { auditService } from './audit.service.js';

type FilterQuery = Record<string, unknown>;

function toPublicUserAdmin(user: {
  _id: { toString(): string };
  name: string;
  email: string;
  role: string;
  status: string;
  spurtiPoints?: number;
  createdAt: Date;
  updatedAt: Date;
}): PublicUserAdmin {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role as PublicUserAdmin['role'],
    status: user.status as PublicUserAdmin['status'],
    ...(user.role === 'student' ? { spurtiPoints: user.spurtiPoints ?? 0 } : {}),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export const userService = {
  async list(query: UserListQuery): Promise<{ items: PublicUserAdmin[]; total: number }> {
    const filter: FilterQuery = {};
    if (query.role) filter.role = query.role;
    if (query.status) filter.status = query.status;
    if (query.q) {
      const re = new RegExp(query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ name: re }, { email: re }];
    }

    const skip = (query.page - 1) * query.pageSize;
    const [items, total] = await Promise.all([
      UserModel.find(filter)
        .select('name email role status spurtiPoints createdAt updatedAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(query.pageSize)
        .lean(),
      UserModel.countDocuments(filter),
    ]);

    return {
      items: items.map((u) => toPublicUserAdmin(u as Parameters<typeof toPublicUserAdmin>[0])),
      total,
    };
  },

  async changeRole(
    userId: string,
    newRole: UserRole,
    actorId: string,
  ): Promise<PublicUserAdmin> {
    if (userId === actorId) {
      throw ApiError.badRequest('You cannot change your own role');
    }
    const user = await UserModel.findById(userId);
    if (!user) throw ApiError.notFound('User not found');

    const previousRole = user.role;
    if (previousRole === newRole) return toPublicUserAdmin(user as Parameters<typeof toPublicUserAdmin>[0]);

    user.role = newRole;
    await user.save();

    await auditService.log({
      actorId,
      action: 'role_change',
      entityType: 'user',
      entityId: userId,
      before: { role: previousRole },
      after: { role: newRole },
    });

    return toPublicUserAdmin(user as Parameters<typeof toPublicUserAdmin>[0]);
  },

  async suspendUser(userId: string, actorId: string): Promise<PublicUserAdmin> {
    if (userId === actorId) {
      throw ApiError.badRequest('You cannot suspend yourself');
    }
    const user = await UserModel.findById(userId);
    if (!user) throw ApiError.notFound('User not found');
    if (user.status === 'suspended') return toPublicUserAdmin(user as Parameters<typeof toPublicUserAdmin>[0]);

    const previousStatus = user.status;
    user.status = 'suspended';
    await user.save();

    await auditService.log({
      actorId,
      action: 'user_suspend',
      entityType: 'user',
      entityId: userId,
      before: { status: previousStatus },
      after: { status: 'suspended' },
    });

    return toPublicUserAdmin(user as Parameters<typeof toPublicUserAdmin>[0]);
  },

  async activateUser(userId: string, actorId: string): Promise<PublicUserAdmin> {
    const user = await UserModel.findById(userId);
    if (!user) throw ApiError.notFound('User not found');
    if (user.status === 'active') return toPublicUserAdmin(user as Parameters<typeof toPublicUserAdmin>[0]);

    const previousStatus = user.status;
    user.status = 'active';
    await user.save();

    await auditService.log({
      actorId,
      action: 'user_activate',
      entityType: 'user',
      entityId: userId,
      before: { status: previousStatus },
      after: { status: 'active' },
    });

    return toPublicUserAdmin(user as Parameters<typeof toPublicUserAdmin>[0]);
  },
};
