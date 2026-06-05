// Category collection. PRD §12.3.
// Slug is auto-derived from name and unique-indexed so URLs stay stable across renames.
import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { slugify } from '../utils/slugify.js';

const categorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    description: { type: String, trim: true, maxlength: 500 },
    keywords: { type: [String], default: [] },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

categorySchema.pre('validate', function deriveSlug(next) {
  if (!this.slug && this.name) this.slug = slugify(this.name);
  next();
});

export type CategoryDocument = HydratedDocument<InferSchemaType<typeof categorySchema>>;
export const CategoryModel = model('Category', categorySchema);
