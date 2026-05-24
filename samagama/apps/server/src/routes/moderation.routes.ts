import { Router } from "express";
import * as controller from "../controllers/moderation.controller.js";
import { authenticate, requireRoles } from "../middlewares/authMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const moderationRouter = Router();

moderationRouter.use(authenticate, requireRoles(["moderator", "admin"]));
moderationRouter.get("/pending-answers", asyncHandler(controller.pendingAnswers));
moderationRouter.get("/flags", asyncHandler(controller.flags));
