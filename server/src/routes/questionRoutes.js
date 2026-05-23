import { Router } from "express";
import { z } from "zod";
import { USER_ROLES } from "../constants/roles.js";
import { FEEDBACK_VALUE_VALUES, QUESTION_STATUS_VALUES } from "../constants/statuses.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireRole } from "../middleware/rbac.js";
import { validate } from "../middleware/validate.js";
import * as moderationService from "../services/moderationService.js";
import * as questionService from "../services/questionService.js";
import { sendSuccess } from "../utils/apiResponse.js";

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Expected a valid MongoDB ObjectId");

const idParamsSchema = z.object({
  id: objectIdSchema
});

const checkExistingSchema = z.object({
  query: z.string().trim().min(3),
  categoryId: objectIdSchema.optional(),
  tags: z.array(objectIdSchema).default([])
});

const existingAnswerCheckSchema = z.object({
  checkedAt: z.coerce.date(),
  matchedFaqs: z.array(objectIdSchema).default([]),
  matchedQuestions: z.array(objectIdSchema).default([])
});

const createQuestionSchema = z.object({
  title: z.string().trim().min(10).max(300),
  description: z.string().trim().min(20),
  categoryId: objectIdSchema,
  tags: z.array(objectIdSchema).default([]),
  existingAnswerCheck: existingAnswerCheckSchema.optional()
});

const listQuestionsSchema = z.object({
  status: z.enum(QUESTION_STATUS_VALUES).optional(),
  categoryId: objectIdSchema.optional(),
  tagId: objectIdSchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.enum(["newest", "priority", "unanswered", "popular"]).default("newest")
});

const submitAnswerSchema = z.object({
  body: z.string().trim().min(20)
});

const moderationNoteSchema = z.object({
  moderationNote: z.string().trim().optional()
});

const rejectAnswerSchema = z.object({
  reason: z.string().trim().min(1)
});

const requestChangesSchema = z.object({
  note: z.string().trim().min(1)
});

const duplicateSchema = z.object({
  duplicateOf: objectIdSchema
});

const recommendFaqSchema = z.object({
  notes: z.string().trim().optional()
});

const feedbackSchema = z.object({
  value: z.enum(FEEDBACK_VALUE_VALUES)
});

const moderationQueueSchema = z.object({
  filter: z.enum(["all", "pending_answers", "unresolved", "duplicate_candidates", "faq_candidates"]).default("all"),
  sortBy: z.enum(["priority", "age", "category"]).default("priority"),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50)
});

const bulkActionSchema = z.object({
  action: z.enum(["approve", "reject", "resolve"]),
  ids: z.array(objectIdSchema).min(1),
  reason: z.string().trim().optional()
});

const router = Router();

router.use(requireAuth);

router.post(
  "/questions/check-existing",
  validate(checkExistingSchema),
  asyncHandler(async (req, res) => {
    sendSuccess(res, await questionService.checkExistingAnswers(req.user.id, req.body));
  })
);

router.get(
  "/questions",
  validate(listQuestionsSchema, "query"),
  asyncHandler(async (req, res) => {
    sendSuccess(res, await questionService.listQuestions(req.user.id, req.user.role, req.query));
  })
);

router.post(
  "/questions",
  validate(createQuestionSchema),
  asyncHandler(async (req, res) => {
    sendSuccess(res, await questionService.createQuestion(req.user.id, req.body), 201);
  })
);

router.get(
  "/questions/:id",
  validate(idParamsSchema, "params"),
  asyncHandler(async (req, res) => {
    sendSuccess(res, await questionService.getQuestionById(req.user.id, req.params.id));
  })
);

router.post(
  "/questions/:id/answers",
  validate(idParamsSchema, "params"),
  validate(submitAnswerSchema),
  asyncHandler(async (req, res) => {
    sendSuccess(res, await questionService.submitAnswer(req.user.id, req.params.id, req.body.body), 201);
  })
);

router.get(
  "/questions/:id/answers",
  validate(idParamsSchema, "params"),
  asyncHandler(async (req, res) => {
    sendSuccess(res, await questionService.getAnswersForQuestion(req.user.id, req.user.role, req.params.id));
  })
);

router.post(
  "/answers/:id/feedback",
  validate(idParamsSchema, "params"),
  validate(feedbackSchema),
  asyncHandler(async (req, res) => {
    sendSuccess(res, await questionService.recordAnswerFeedback(req.user.id, req.params.id, req.body.value));
  })
);

router.get(
  "/moderation/queue",
  requireRole(USER_ROLES.MODERATOR, USER_ROLES.ADMIN),
  validate(moderationQueueSchema, "query"),
  asyncHandler(async (req, res) => {
    sendSuccess(res, await moderationService.getModerationQueue(req.query));
  })
);

router.get(
  "/moderation/faq-candidates",
  requireRole(USER_ROLES.MODERATOR, USER_ROLES.ADMIN),
  asyncHandler(async (_req, res) => {
    sendSuccess(res, await moderationService.getFaqConversionCandidates());
  })
);

router.get(
  "/moderation/analytics",
  requireRole(USER_ROLES.MODERATOR, USER_ROLES.ADMIN),
  asyncHandler(async (req, res) => {
    sendSuccess(res, await moderationService.getModerationAnalytics(req.user.id));
  })
);

router.post(
  "/moderation/bulk",
  requireRole(USER_ROLES.MODERATOR, USER_ROLES.ADMIN),
  validate(bulkActionSchema),
  asyncHandler(async (req, res) => {
    sendSuccess(res, await moderationService.bulkModerationAction(req.user.id, req.body));
  })
);

router.patch(
  "/answers/:id/approve",
  requireRole(USER_ROLES.MODERATOR, USER_ROLES.ADMIN),
  validate(idParamsSchema, "params"),
  validate(moderationNoteSchema),
  asyncHandler(async (req, res) => {
    sendSuccess(res, await moderationService.approveAnswer(req.user.id, req.params.id, req.body.moderationNote));
  })
);

router.patch(
  "/answers/:id/reject",
  requireRole(USER_ROLES.MODERATOR, USER_ROLES.ADMIN),
  validate(idParamsSchema, "params"),
  validate(rejectAnswerSchema),
  asyncHandler(async (req, res) => {
    sendSuccess(res, await moderationService.rejectAnswer(req.user.id, req.params.id, req.body.reason));
  })
);

router.patch(
  "/answers/:id/request-changes",
  requireRole(USER_ROLES.MODERATOR, USER_ROLES.ADMIN),
  validate(idParamsSchema, "params"),
  validate(requestChangesSchema),
  asyncHandler(async (req, res) => {
    sendSuccess(res, await moderationService.requestChanges(req.user.id, req.params.id, req.body.note));
  })
);

router.patch(
  "/questions/:id/resolve",
  requireRole(USER_ROLES.MODERATOR, USER_ROLES.ADMIN),
  validate(idParamsSchema, "params"),
  asyncHandler(async (req, res) => {
    sendSuccess(res, await moderationService.resolveQuestion(req.user.id, req.params.id));
  })
);

router.patch(
  "/questions/:id/duplicate",
  requireRole(USER_ROLES.MODERATOR, USER_ROLES.ADMIN),
  validate(idParamsSchema, "params"),
  validate(duplicateSchema),
  asyncHandler(async (req, res) => {
    sendSuccess(res, await moderationService.markDuplicate(req.user.id, req.params.id, req.body.duplicateOf));
  })
);

router.patch(
  "/answers/:id/recommend-faq",
  requireRole(USER_ROLES.MODERATOR, USER_ROLES.ADMIN),
  validate(idParamsSchema, "params"),
  validate(recommendFaqSchema),
  asyncHandler(async (req, res) => {
    sendSuccess(res, await moderationService.recommendFaqConversion(req.user.id, req.params.id, req.body.notes));
  })
);

export default router;
