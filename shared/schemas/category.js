import { z } from "zod";
import { RECORD_STATUS, RECORD_STATUS_VALUES } from "../constants/index.js";
import { slugSchema } from "./common.js";

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: slugSchema.optional(),
  description: z.string().trim().max(500).optional(),
  color: z.string().trim().regex(/^#[0-9A-F]{6}$/i, "Use a six-digit hex color").optional(),
  status: z.enum(RECORD_STATUS_VALUES).default(RECORD_STATUS.ACTIVE)
});

export const createCategorySchema = categorySchema;

export const updateCategorySchema = categorySchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one category field is required"
);
