import { toSlug } from "@samagama/shared";
import { CategoryModel, TagModel } from "../models/Taxonomy.js";
import { AppError } from "../utils/AppError.js";

export interface TaxonomyInput {
  name: string;
  description?: string;
  keywords: string[];
  isActive: boolean;
}

export async function listCategories() {
  return CategoryModel.find({ isActive: true }).sort({ name: 1 }).lean();
}

export async function listTags() {
  return TagModel.find({ isActive: true }).sort({ name: 1 }).lean();
}

export async function createCategory(input: TaxonomyInput) {
  return CategoryModel.create({ ...input, slug: toSlug(input.name) });
}

export async function createTag(input: TaxonomyInput) {
  return TagModel.create({ ...input, slug: toSlug(input.name) });
}

export async function updateCategory(id: string, input: Partial<TaxonomyInput>) {
  const update = input.name ? { ...input, slug: toSlug(input.name) } : input;
  const category = await CategoryModel.findByIdAndUpdate(id, update, { new: true });
  if (!category) throw new AppError(404, "CATEGORY_NOT_FOUND", "Category was not found.");
  return category;
}

export async function updateTag(id: string, input: Partial<TaxonomyInput>) {
  const update = input.name ? { ...input, slug: toSlug(input.name) } : input;
  const tag = await TagModel.findByIdAndUpdate(id, update, { new: true });
  if (!tag) throw new AppError(404, "TAG_NOT_FOUND", "Tag was not found.");
  return tag;
}

export async function archiveCategory(id: string) {
  return updateCategory(id, { isActive: false });
}

export async function archiveTag(id: string) {
  return updateTag(id, { isActive: false });
}

export async function suggestTags(text: string) {
  const tags = await TagModel.find({ isActive: true }).lean();
  const normalized = text.toLowerCase();
  return tags
    .map((tag) => {
      const keywords = [tag.name, ...tag.keywords].map((keyword) => keyword.toLowerCase());
      const score = keywords.filter((keyword) => normalized.includes(keyword)).length;
      return { tag, score };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 8);
}
