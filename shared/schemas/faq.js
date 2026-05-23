import { z } from "zod";
import { FAQ_STATUS, FAQ_STATUS_VALUES, FAQ_VISIBILITY, FAQ_VISIBILITY_VALUES } from "../constants/index.js";
import { objectIdSchema } from "./common.js";

export const faqSchema = z.object({
  title: z.string().trim().min(4).max(180),
  summary: z.string().trim().min(10).max(1000),
  categoryId: objectIdSchema,
  tagIds: z.array(objectIdSchema).default([]),
  questionIds: z.array(objectIdSchema).default([]),
  ownerId: objectIdSchema.optional(),
  visibility: z.enum(FAQ_VISIBILITY_VALUES).default(FAQ_VISIBILITY.INTERNAL),
  status: z.enum(FAQ_STATUS_VALUES).default(FAQ_STATUS.DRAFT),
  metadata: z.record(z.string(), z.unknown()).default({})
});

export const createFaqSchema = faqSchema;

export const updateFaqSchema = faqSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one FAQ field is required"
);
