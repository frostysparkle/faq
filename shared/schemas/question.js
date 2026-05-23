import { z } from "zod";
import {
  QUESTION_PRIORITY,
  QUESTION_PRIORITY_VALUES,
  QUESTION_STATUS,
  QUESTION_STATUS_VALUES
} from "../constants/index.js";
import { objectIdSchema, optionalDateStringSchema } from "./common.js";

export const questionSchema = z.object({
  prompt: z.string().trim().min(8).max(800),
  context: z.string().trim().max(2000).optional(),
  categoryId: objectIdSchema,
  tagIds: z.array(objectIdSchema).default([]),
  faqId: objectIdSchema.optional(),
  askedBy: objectIdSchema.optional(),
  priority: z.enum(QUESTION_PRIORITY_VALUES).default(QUESTION_PRIORITY.MEDIUM),
  status: z.enum(QUESTION_STATUS_VALUES).default(QUESTION_STATUS.OPEN),
  dueAt: optionalDateStringSchema
});

export const createQuestionSchema = questionSchema;

export const updateQuestionSchema = questionSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one question field is required"
);
