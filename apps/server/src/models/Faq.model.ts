// FAQ collection. Mirrors PRD §12.2 plus Change Spec §8.3 helpful/unhelpful vote tracking.
//
// Indexes:
//  - text index on (title, summary, answer) for keyword search
//  - compound (status, updatedAt) for the default "recent" listing
//  - (categories) and (tags) array indexes for filtering
//  - (slug) unique index for stable URLs
//
// `embedding` is reserved for Phase 6 vector search; left null until then.
import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { FAQ_STATUSES } from '@samagama/shared';
import { slugify } from '../utils/slugify.js';

const faqSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 280 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    answer: { type: String, required: true, trim: true, maxlength: 8000 },
    summary: { type: String, trim: true, maxlength: 280 },

    categories: [{ type: Schema.Types.ObjectId, ref: 'Category', required: true }],
    tags: [{ type: Schema.Types.ObjectId, ref: 'Tag' }],

    status: {
      type: String,
      enum: FAQ_STATUSES,
      default: 'draft',
      required: true,
      index: true,
    },

    sourceType: {
      type: String,
      enum: ['manual', 'community_conversion', 'imported'],
      default: 'manual',
    },
    sourceQuestionId: { type: Schema.Types.ObjectId, ref: 'Question' },

    /** Reserved for Phase 6 (Atlas Vector Search). */
    embedding: { type: [Number], default: undefined, select: false },

    helpfulCount: { type: Number, default: 0 },
    unhelpfulCount: { type: Number, default: 0 },
    /** One vote per user — duplicates are deduped by the service before push. */
    helpfulVotes: { type: [Schema.Types.ObjectId], default: [], select: false },
    unhelpfulVotes: { type: [Schema.Types.ObjectId], default: [], select: false },

    viewCount: { type: Number, default: 0 },
    flagCount: { type: Number, default: 0 },

    duplicateOf: { type: Schema.Types.ObjectId, ref: 'Faq' },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    publishedAt: { type: Date },
    lastReviewedAt: { type: Date },
  },
  { timestamps: true },
);

faqSchema.pre('validate', function deriveSlug(next) {
  if (!this.slug && this.title) {
    // Append a short timestamp suffix to keep slug uniqueness without round-trips on conflict.
    const base = slugify(this.title);
    this.slug = `${base}-${Date.now().toString(36)}`;
  }
  next();
});

// Text index for keyword search. Title weighted highest.
faqSchema.index(
  { title: 'text', summary: 'text', answer: 'text' },
  { weights: { title: 10, summary: 5, answer: 1 }, name: 'faq_text_index' },
);
faqSchema.index({ status: 1, updatedAt: -1 });
faqSchema.index({ categories: 1 });
faqSchema.index({ tags: 1 });

export type FaqDocument = HydratedDocument<InferSchemaType<typeof faqSchema>>;
export const FaqModel = model('Faq', faqSchema);
