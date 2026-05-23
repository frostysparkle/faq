import { z } from "zod";
import { ANSWER_CONFIDENCE, ANSWER_CONFIDENCE_VALUES, ANSWER_STATUS, ANSWER_STATUS_VALUES } from "../constants/index.js";
import { objectIdSchema } from "./common.js";

export const answerSchema = z.object({
  questionId: objectIdSchema,
  body: z.string().trim().min(10).max(5000),
  evidence: z.array(z.string().trim().url()).default([]),
  confidence: z.enum(ANSWER_CONFIDENCE_VALUES).default(ANSWER_CONFIDENCE.MEDIUM),
  answeredBy: objectIdSchema.optional(),
  status: z.enum(ANSWER_STATUS_VALUES).default(ANSWER_STATUS.DRAFT)
});

export const createAnswerSchema = answerSchema;

export const updateAnswerSchema = answerSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one answer field is required"
);
