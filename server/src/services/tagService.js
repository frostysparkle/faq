import { HTTP_STATUS } from "../constants/httpStatus.js";
import Tag from "../models/Tag.js";
import { AppError } from "../utils/AppError.js";
import { logAudit } from "../utils/auditLog.js";

const validateTagPayload = (payload, partial = false) => {
  if (!partial && !payload.name?.trim()) {
    throw new AppError("Tag name is required", HTTP_STATUS.BAD_REQUEST, "TAG_VALIDATION_FAILED");
  }

  if (payload.name !== undefined && payload.name.trim().length < 2) {
    throw new AppError("Tag name must be at least 2 characters", HTTP_STATUS.BAD_REQUEST, "TAG_VALIDATION_FAILED");
  }
};

export const createTag = async (adminId, payload) => {
  validateTagPayload(payload);
  const tag = await Tag.create(payload);
  await logAudit(adminId, "TAG_CREATED", "tag", tag._id, null, tag.toObject());
  return tag;
};

export const updateTag = async (adminId, tagId, payload) => {
  validateTagPayload(payload, true);
  const tag = await Tag.findById(tagId);

  if (!tag) {
    throw new AppError("Tag not found", HTTP_STATUS.NOT_FOUND, "TAG_NOT_FOUND");
  }

  const before = tag.toObject();
  tag.set(payload);
  await tag.save();
  await logAudit(adminId, "TAG_UPDATED", "tag", tag._id, before, tag.toObject());
  return tag;
};

export const archiveTag = async (adminId, tagId) => {
  const tag = await Tag.findById(tagId);

  if (!tag) {
    throw new AppError("Tag not found", HTTP_STATUS.NOT_FOUND, "TAG_NOT_FOUND");
  }

  const before = tag.toObject();
  tag.isActive = false;
  await tag.save();
  await logAudit(adminId, "TAG_ARCHIVED", "tag", tag._id, before, tag.toObject());
  return tag;
};

export const listTags = async (includeInactive = false) => {
  const filter = includeInactive ? {} : { isActive: true };
  return Tag.find(filter).sort({ displayOrder: 1, name: 1 });
};
