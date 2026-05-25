// Category domain service.
import type { CategoryCreateInput, CategoryUpdateInput } from '@samagama/shared';
import { CategoryModel } from '../models/Category.model.js';
import { ApiError } from '../utils/api-error.js';
import { slugify } from '../utils/slugify.js';

export const categoryService = {
  async list(includeInactive = false) {
    const filter = includeInactive ? {} : { isActive: true };
    return CategoryModel.find(filter).sort({ name: 1 }).lean();
  },

  async create(input: CategoryCreateInput) {
    const slug = slugify(input.name);
    const existing = await CategoryModel.findOne({ slug }).lean();
    if (existing) throw ApiError.conflict('A category with this name already exists');
    return CategoryModel.create({ ...input, slug });
  },

  async update(id: string, input: CategoryUpdateInput) {
    const update: Record<string, unknown> = { ...input };
    if (input.name) update.slug = slugify(input.name);
    const updated = await CategoryModel.findByIdAndUpdate(id, update, { new: true }).lean();
    if (!updated) throw ApiError.notFound('Category not found');
    return updated;
  },

  async archive(id: string) {
    const updated = await CategoryModel.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true },
    ).lean();
    if (!updated) throw ApiError.notFound('Category not found');
    return updated;
  },
};
