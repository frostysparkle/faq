import { z } from "zod";
import {
  ANSWER_STATUSES,
  CHAT_FEEDBACK_RATINGS,
  FAQ_STATUSES,
  FLAG_REASONS,
  FLAG_STATUSES,
  QUESTION_STATUSES,
  USER_ROLES
} from "./constants.js";

export const objectIdSchema = z.string().min(1);
export const emailSchema = z.string().email().trim().toLowerCase();
export const passwordSchema = z.string().min(8).max(128);
export const nonEmptyTextSchema = z.string().trim().min(1).max(5000);

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: emailSchema,
  password: passwordSchema,
  role: z.enum(USER_ROLES).default("student")
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1)
});

export const faqStatusSchema = z.enum(FAQ_STATUSES);
const queryArraySchema = z.preprocess(
  (value) => (typeof value === "string" ? [value] : value),
  z.array(objectIdSchema)
);
export const faqCreateSchema = z.object({
  title: z.string().trim().min(5).max(240),
  answer: z.string().trim().min(10).max(20000),
  summary: z.string().trim().max(600).optional(),
  categoryIds: z.array(objectIdSchema).min(1),
  tagIds: z.array(objectIdSchema).default([]),
  status: faqStatusSchema.default("draft"),
  duplicateOverrideJustification: z.string().trim().max(1000).optional()
});

export const faqUpdateSchema = faqCreateSchema.partial().extend({
  status: faqStatusSchema.optional()
});

export const faqSearchSchema = z.object({
  query: z.string().trim().optional(),
  categoryIds: queryArraySchema.optional(),
  tagIds: queryArraySchema.optional(),
  status: faqStatusSchema.optional(),
  sort: z
    .enum(["relevance", "recently_updated", "most_viewed", "most_helpful"])
    .default("relevance"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export const duplicateCheckSchema = z.object({
  title: z.string().trim().min(5).max(240),
  body: z.string().trim().min(10).max(20000),
  excludeFaqId: objectIdSchema.optional()
});

export const faqFeedbackSchema = z.object({
  rating: z.enum(["helpful", "not_helpful"])
});

export const taxonomySchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional(),
  keywords: z.array(z.string().trim().min(1).max(40)).default([]),
  isActive: z.boolean().default(true)
});

export const questionStatusSchema = z.enum(QUESTION_STATUSES);
export const questionCreateSchema = z.object({
  title: z.string().trim().min(8).max(240),
  description: z.string().trim().min(10).max(5000),
  categoryId: objectIdSchema,
  tagIds: z.array(objectIdSchema).default([]),
  existingAnswerCheckToken: z.string().min(10)
});

export const existingAnswerCheckSchema = z.object({
  title: z.string().trim().min(8).max(240),
  description: z.string().trim().min(10).max(5000),
  categoryId: objectIdSchema.optional(),
  tagIds: z.array(objectIdSchema).default([])
});

export const answerCreateSchema = z.object({
  body: z.string().trim().min(10).max(10000)
});

export const answerModerationSchema = z.object({
  status: z.enum(ANSWER_STATUSES),
  note: z.string().trim().max(1000).optional()
});

export const rejectAnswerSchema = z.object({
  reason: z.string().trim().min(5).max(1000)
});

export const flagCreateSchema = z.object({
  entityType: z.enum(["faq", "question", "answer", "chatbot_response"]),
  entityId: objectIdSchema,
  reason: z.enum(FLAG_REASONS),
  details: z.string().trim().max(1000).optional()
});

export const flagStatusUpdateSchema = z.object({
  status: z.enum(FLAG_STATUSES),
  resolutionNote: z.string().trim().max(1000).optional()
});

export const chatQuerySchema = z.object({
  message: nonEmptyTextSchema.max(2000),
  sessionId: objectIdSchema.optional()
});

export const chatFeedbackSchema = z.object({
  chatSessionId: objectIdSchema,
  messageIndex: z.number().int().min(0),
  rating: z.enum(CHAT_FEEDBACK_RATINGS),
  comment: z.string().trim().max(1000).optional()
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type FaqCreateInput = z.infer<typeof faqCreateSchema>;
export type FaqSearchInput = z.infer<typeof faqSearchSchema>;
export type QuestionCreateInput = z.infer<typeof questionCreateSchema>;
