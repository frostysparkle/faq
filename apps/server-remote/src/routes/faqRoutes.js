import { Router } from "express";
import { z } from "zod";
import { FAQ_REVIEW_STATE_VALUES, FAQ_STATUS_VALUES, FEEDBACK_VALUE_VALUES } from "../constants/statuses.js";
import * as faqController from "../controllers/faqController.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireRole } from "../middleware/rbac.js";
import { validate } from "../middleware/validate.js";

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Expected a valid MongoDB ObjectId");

const idParamsSchema = z.object({
  id: objectIdSchema
});

const searchQuerySchema = z.object({
  query: z.string().trim().optional(),
  categoryId: objectIdSchema.optional(),
  tagId: objectIdSchema.optional(),
  tagIds: z
    .preprocess(
      (value) => {
        if (Array.isArray(value)) return value;
        if (typeof value === "string") return value.split(",").filter(Boolean);
        return [];
      },
      z.array(objectIdSchema)
    )
    .default([]),
  status: z.enum(FAQ_STATUS_VALUES).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20)
});

const faqCreateSchema = z.object({
  title: z.string().trim().min(3),
  answer: z.string().trim().min(20),
  summary: z.string().trim().min(5).max(300),
  categories: z.array(objectIdSchema).min(1),
  tags: z.array(objectIdSchema).min(1)
});

const faqUpdateSchema = z
  .object({
    title: z.string().trim().min(3).optional(),
    answer: z.string().trim().min(20).optional(),
    summary: z.string().trim().min(5).max(300).optional(),
    categories: z.array(objectIdSchema).min(1).optional(),
    tags: z.array(objectIdSchema).min(1).optional(),
    reviewState: z.enum(FAQ_REVIEW_STATE_VALUES).optional(),
    duplicateOf: objectIdSchema.optional(),
    lastReviewedAt: z.coerce.date().optional()
  })
  .refine((value) => Object.keys(value).length > 0, "At least one FAQ field is required");

const statusSchema = z.object({
  status: z.enum(FAQ_STATUS_VALUES)
});

const feedbackSchema = z.object({
  value: z.enum(FEEDBACK_VALUE_VALUES)
});

const similaritySchema = z.object({
  title: z.string().trim().min(3),
  answer: z.string().trim().optional(),
  categories: z.array(objectIdSchema).default([]),
  tags: z.array(objectIdSchema).default([])
});

const router = Router();

router.use(requireAuth);

router.get("/", validate(searchQuerySchema, "query"), asyncHandler(faqController.searchFaqs));
router.get("/:id", validate(idParamsSchema, "params"), asyncHandler(faqController.getFaqById));
router.post("/", requireRole("admin"), validate(faqCreateSchema), asyncHandler(faqController.createFaq));
router.patch("/:id", requireRole("admin"), validate(idParamsSchema, "params"), validate(faqUpdateSchema), asyncHandler(faqController.updateFaq));
router.patch(
  "/:id/status",
  requireRole("admin"),
  validate(idParamsSchema, "params"),
  validate(statusSchema),
  asyncHandler(faqController.changeFaqStatus)
);
router.post("/:id/view", validate(idParamsSchema, "params"), asyncHandler(faqController.trackFaqView));
router.post("/:id/feedback", validate(idParamsSchema, "params"), validate(feedbackSchema), asyncHandler(faqController.recordFeedback));
router.post("/check-similar", requireRole("admin", "moderator"), validate(similaritySchema), asyncHandler(faqController.checkSimilarity));

export default router;
