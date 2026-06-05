// Tag collection. PRD §12.4.
import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { slugify } from '../utils/slugify.js';

const tagSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 40 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    description: { type: String, trim: true, maxlength: 280 },
    keywords: { type: [String], default: [] },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

tagSchema.pre('validate', function deriveSlug(next) {
  if (!this.slug && this.name) this.slug = slugify(this.name);
  next();
});

export type TagDocument = HydratedDocument<InferSchemaType<typeof tagSchema>>;
export const TagModel = model('Tag', tagSchema);
