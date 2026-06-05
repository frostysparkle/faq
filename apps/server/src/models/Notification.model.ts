import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

const NOTIFICATION_TYPES = [
  'answer_approved',
  'answer_rejected',
  'question_answered',
  'flag_reviewed',
  'general',
] as const;

const notificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, required: true, trim: true, maxlength: 1000 },
    read: { type: Boolean, default: false, index: true },
    /** Flexible link — usually the community question ID so the UI can navigate there. */
    relatedId: { type: String },
  },
  { timestamps: true },
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, read: 1 });

export type NotificationDocument = HydratedDocument<InferSchemaType<typeof notificationSchema>>;
export const NotificationModel = model('Notification', notificationSchema);
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
