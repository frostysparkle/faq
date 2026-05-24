import { Router } from "express";
import { chatFeedbackSchema, chatQuerySchema } from "@samagama/shared";
import * as controller from "../controllers/chat.controller.js";
import { authenticate } from "../middlewares/authMiddleware.js";
import { chatbotRateLimiter } from "../middlewares/rateLimiters.js";
import { validateBody } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const chatRouter = Router();

chatRouter.use(authenticate);
chatRouter.post(
  "/query",
  chatbotRateLimiter,
  validateBody(chatQuerySchema),
  asyncHandler(controller.query)
);
chatRouter.get("/sessions", asyncHandler(controller.sessions));
chatRouter.get("/sessions/:id", asyncHandler(controller.session));
chatRouter.post("/feedback", validateBody(chatFeedbackSchema), asyncHandler(controller.feedback));
