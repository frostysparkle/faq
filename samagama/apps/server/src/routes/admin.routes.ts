import { Router } from "express";
import { duplicateCheckSchema } from "@samagama/shared";
import * as controller from "../controllers/admin.controller.js";
import { authenticate, requireRoles } from "../middlewares/authMiddleware.js";
import { validateBody } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const adminRouter = Router();

adminRouter.use(authenticate, requireRoles(["admin"]));
adminRouter.get("/stats", asyncHandler(controller.stats));
adminRouter.get("/duplicate-candidates", asyncHandler(controller.duplicateCandidates));
adminRouter.post(
  "/duplicate-candidates/check",
  validateBody(duplicateCheckSchema),
  asyncHandler(controller.duplicateCheck)
);
adminRouter.get("/unanswered-searches", asyncHandler(controller.unansweredSearches));
adminRouter.get("/chatbot-feedback", asyncHandler(controller.chatbotFeedbackStats));
