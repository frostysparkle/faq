// Community answer. PRD §12.6 + Change Spec §8.2 (upvotes/downvotes).
import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { ANSWER_STATUSES } from '@samagama/shared';

const answerSchema = new Schema(
  {
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true, index: true },
    body: { type: String, required: true, trim: true, maxlength: 4000 },
    answeredBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    status: {
      type: String,
      enum: ANSWER_STATUSES,
      default: 'pending',
      required: true,
      index: true,
    },
    moderatorId: { type: Schema.Types.ObjectId, ref: 'User' },
    moderationNote: { type: String, trim: true, maxlength: 1000 },
    approvedAt: { type: Date },
    /** Reserved for Phase 6 vector search. */
    embedding: { type: [Number], default: undefined, select: false },
    eligibleForFaqConversion: { type: Boolean, default: false },
    convertedFaqId: { type: Schema.Types.ObjectId, ref: 'Faq' },

    upvotes: { type: [Schema.Types.ObjectId], default: [], select: false },
    downvotes: { type: [Schema.Types.ObjectId], default: [], select: false },
    upvoteCount: { type: Number, default: 0 },
    downvoteCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

answerSchema.index({ questionId: 1, status: 1, upvoteCount: -1, createdAt: -1 });

export type AnswerDocument = HydratedDocument<InferSchemaType<typeof answerSchema>>;
export const AnswerModel = model('Answer', answerSchema);
