import { Types } from 'mongoose';
import type { PublicNotification, NotificationType } from '@samagama/shared';
import { NotificationModel } from '../models/Notification.model.js';

export const notificationService = {
  async create(opts: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    relatedId?: string;
  }): Promise<void> {
    await NotificationModel.create({
      userId: new Types.ObjectId(opts.userId),
      type: opts.type,
      title: opts.title,
      body: opts.body,
      relatedId: opts.relatedId,
    });
  },

  async listForUser(userId: string, limit = 30): Promise<PublicNotification[]> {
    const docs = await NotificationModel.find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean<Array<{ _id: Types.ObjectId; type: NotificationType; title: string; body: string; read: boolean; relatedId?: string; createdAt: Date }>>();

    return docs.map((d) => ({
      id: d._id.toString(),
      type: d.type,
      title: d.title,
      body: d.body,
      read: d.read,
      relatedId: d.relatedId ?? undefined,
      createdAt: d.createdAt.toISOString(),
    }));
  },

  async getUnreadCount(userId: string): Promise<number> {
    return NotificationModel.countDocuments({
      userId: new Types.ObjectId(userId),
      read: false,
    });
  },

  async markRead(notificationId: string, userId: string): Promise<void> {
    await NotificationModel.updateOne(
      { _id: new Types.ObjectId(notificationId), userId: new Types.ObjectId(userId) },
      { $set: { read: true } },
    );
  },

  async markAllRead(userId: string): Promise<void> {
    await NotificationModel.updateMany(
      { userId: new Types.ObjectId(userId), read: false },
      { $set: { read: true } },
    );
  },
};
