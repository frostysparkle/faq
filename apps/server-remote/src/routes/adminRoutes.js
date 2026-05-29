import { Router } from "express";
import { z } from "zod";
import * as adminController from "../controllers/adminController.js";
import { USER_ROLES } from "../constants/roles.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireRole } from "../middleware/rbac.js";
import { validate } from "../middleware/validate.js";

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Expected a valid MongoDB ObjectId");

const emptyQuerySchema = z.object({});

const daysQuerySchema = z.object({
  days: z.coerce.number().int().positive().max(180).default(30)
});

const unansweredSearchesSchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(20)
});

const faqQualitySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(20),
  sort: z.enum(["worst", "best"]).default("worst")
});

const moderationLoadSchema = z.object({
  days: z.coerce.number().int().positive().max(90).default(14)
});

const auditLogsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  actorId: objectIdSchema.optional(),
  entityType: z.string().trim().min(1).optional(),
  action: z.string().trim().min(1).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional()
}).transform(({ startDate, endDate, ...rest }) => ({
  ...rest,
  dateRange: {
    start: startDate,
    end: endDate
  }
}));

const router = Router();

router.use(requireAuth, requireRole(USER_ROLES.ADMIN));

router.get("/overview", validate(emptyQuerySchema, "query"), asyncHandler(adminController.getOverview));
router.get("/issue-heatmap", validate(daysQuerySchema, "query"), asyncHandler(adminController.getIssueHeatmap));
router.get(
  "/unanswered-searches",
  validate(unansweredSearchesSchema, "query"),
  asyncHandler(adminController.getUnansweredSearches)
);
router.get("/faq-quality", validate(faqQualitySchema, "query"), asyncHandler(adminController.getFaqQuality));
router.get("/moderation-load", validate(moderationLoadSchema, "query"), asyncHandler(adminController.getModerationLoad));
router.get("/audit-logs", validate(auditLogsSchema, "query"), asyncHandler(adminController.getAuditLogs));

export default router;
