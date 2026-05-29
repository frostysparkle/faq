import { HTTP_STATUS } from "../constants/httpStatus.js";
import Category from "../models/Category.js";
import { AppError } from "../utils/AppError.js";
import { logAudit } from "../utils/auditLog.js";

const validateCategoryPayload = (payload, partial = false) => {
  if (!partial && !payload.name?.trim()) {
    throw new AppError("Category name is required", HTTP_STATUS.BAD_REQUEST, "CATEGORY_VALIDATION_FAILED");
  }

  if (payload.name !== undefined && payload.name.trim().length < 2) {
    throw new AppError("Category name must be at least 2 characters", HTTP_STATUS.BAD_REQUEST, "CATEGORY_VALIDATION_FAILED");
  }
};

export const createCategory = async (adminId, payload) => {
  validateCategoryPayload(payload);
  const category = await Category.create(payload);
  await logAudit(adminId, "CATEGORY_CREATED", "category", category._id, null, category.toObject());
  return category;
};

export const updateCategory = async (adminId, categoryId, payload) => {
  validateCategoryPayload(payload, true);
  const category = await Category.findById(categoryId);

  if (!category) {
    throw new AppError("Category not found", HTTP_STATUS.NOT_FOUND, "CATEGORY_NOT_FOUND");
  }

  const before = category.toObject();
  category.set(payload);
  await category.save();
  await logAudit(adminId, "CATEGORY_UPDATED", "category", category._id, before, category.toObject());
  return category;
};

export const archiveCategory = async (adminId, categoryId) => {
  const category = await Category.findById(categoryId);

  if (!category) {
    throw new AppError("Category not found", HTTP_STATUS.NOT_FOUND, "CATEGORY_NOT_FOUND");
  }

  const before = category.toObject();
  category.isActive = false;
  await category.save();
  await logAudit(adminId, "CATEGORY_ARCHIVED", "category", category._id, before, category.toObject());
  return category;
};

export const listCategories = async (includeInactive = false) => {
  const filter = includeInactive ? {} : { isActive: true };
  return Category.find(filter).sort({ displayOrder: 1, name: 1 });
};
