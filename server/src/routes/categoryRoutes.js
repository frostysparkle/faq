import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireRole } from "../middleware/rbac.js";
import { validate } from "../middleware/validate.js";
import * as categoryService from "../services/categoryService.js";
import { sendSuccess } from "../utils/apiResponse.js";

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Expected a valid MongoDB ObjectId");

const idParamsSchema = z.object({
  id: objectIdSchema
});

const booleanQuerySchema = z.preprocess((value) => value === true || value === "true", z.boolean());

const listQuerySchema = z.object({
  includeInactive: booleanQuerySchema.default(false)
});

const createCategorySchema = z.object({
  name: z.string().trim().min(2),
  description: z.string().trim().optional(),
  displayOrder: z.coerce.number().default(0),
  isActive: z.boolean().default(true)
});

const updateCategorySchema = createCategorySchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one category field is required"
);

const router = Router();

router.use(requireAuth);

router.get(
  "/",
  validate(listQuerySchema, "query"),
  asyncHandler(async (req, res) => sendSuccess(res, await categoryService.listCategories(req.query.includeInactive)))
);
router.post(
  "/",
  requireRole("admin"),
  validate(createCategorySchema),
  asyncHandler(async (req, res) => sendSuccess(res, await categoryService.createCategory(req.user.id, req.body), 201))
);
router.patch(
  "/:id",
  requireRole("admin"),
  validate(idParamsSchema, "params"),
  validate(updateCategorySchema),
  asyncHandler(async (req, res) => sendSuccess(res, await categoryService.updateCategory(req.user.id, req.params.id, req.body)))
);
router.patch(
  "/:id/archive",
  requireRole("admin"),
  validate(idParamsSchema, "params"),
  asyncHandler(async (req, res) => sendSuccess(res, await categoryService.archiveCategory(req.user.id, req.params.id)))
);

export default router;
