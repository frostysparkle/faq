// Tag domain service. Mirrors category.service intentionally — small enough to keep parallel.
import type { TagCreateInput, TagUpdateInput } from '@samagama/shared';
import { TagModel } from '../models/Tag.model.js';
import { ApiError } from '../utils/api-error.js';
import { slugify } from '../utils/slugify.js';

export const tagService = {
  async list(includeInactive = false) {
    const filter = includeInactive ? {} : { isActive: true };
    return TagModel.find(filter).sort({ name: 1 }).lean();
  },

  async create(input: TagCreateInput) {
    const slug = slugify(input.name);
    const existing = await TagModel.findOne({ slug }).lean();
    if (existing) throw ApiError.conflict('A tag with this name already exists');
    return TagModel.create({ ...input, slug });
  },

  async update(id: string, input: TagUpdateInput) {
    const update: Record<string, unknown> = { ...input };
    if (input.name) update.slug = slugify(input.name);
    const updated = await TagModel.findByIdAndUpdate(id, update, { new: true }).lean();
    if (!updated) throw ApiError.notFound('Tag not found');
    return updated;
  },

  async archive(id: string) {
    const updated = await TagModel.findByIdAndUpdate(id, { isActive: false }, { new: true }).lean();
    if (!updated) throw ApiError.notFound('Tag not found');
    return updated;
  },
};
