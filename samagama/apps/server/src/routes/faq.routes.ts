import { Router } from "express";
import {
  duplicateCheckSchema,
  faqCreateSchema,
  faqFeedbackSchema,
  faqSearchSchema,
  faqUpdateSchema
} from "@samagama/shared";
import * as controller from "../controllers/faq.controller.js";
import { authenticate, requireRoles } from "../middlewares/authMiddleware.js";
import { validateBody, validateQuery } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const faqRouter = Router();

faqRouter.use(authenticate);
faqRouter.get("/", validateQuery(faqSearchSchema), asyncHandler(controller.list));
faqRouter.get("/recently-updated", asyncHandler(controller.recentlyUpdated));
faqRouter.get("/recently-viewed", asyncHandler(controller.recentlyViewed));
faqRouter.post(
  "/check-duplicate",
  requireRoles(["moderator", "admin"]),
  validateBody(duplicateCheckSchema),
  asyncHandler(controller.checkDuplicate)
);
faqRouter.post(
  "/",
  requireRoles(["admin"]),
  validateBody(faqCreateSchema),
  asyncHandler(controller.create)
);
faqRouter.get("/:id", asyncHandler(controller.detail));
faqRouter.patch(
  "/:id",
  requireRoles(["admin"]),
  validateBody(faqUpdateSchema),
  asyncHandler(controller.update)
);
faqRouter.patch("/:id/archive", requireRoles(["admin"]), asyncHandler(controller.archive));
faqRouter.post("/:id/view", asyncHandler(controller.recordView));
faqRouter.post("/:id/feedback", validateBody(faqFeedbackSchema), asyncHandler(controller.feedback));
