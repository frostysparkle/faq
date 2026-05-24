import { Router } from "express";
import { z } from "zod";
import {
  answerCreateSchema,
  existingAnswerCheckSchema,
  questionCreateSchema,
  rejectAnswerSchema
} from "@samagama/shared";
import * as controller from "../controllers/qna.controller.js";
import { authenticate, requireRoles } from "../middlewares/authMiddleware.js";
import { validateBody } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const questionRouter = Router();
export const answerRouter = Router();

questionRouter.use(authenticate);
questionRouter.get("/", asyncHandler(controller.listQuestions));
questionRouter.post(
  "/check-existing",
  requireRoles(["student"]),
  validateBody(existingAnswerCheckSchema),
  asyncHandler(controller.checkExisting)
);
questionRouter.post(
  "/",
  requireRoles(["student"]),
  validateBody(questionCreateSchema),
  asyncHandler(controller.createQuestion)
);
questionRouter.get("/:id", asyncHandler(controller.getQuestion));
questionRouter.post(
  "/:id/answers",
  validateBody(answerCreateSchema),
  asyncHandler(controller.submitAnswer)
);
questionRouter.patch(
  "/:id/resolve",
  requireRoles(["moderator", "admin"]),
  asyncHandler(controller.resolveQuestion)
);
questionRouter.patch(
  "/:id/duplicate",
  requireRoles(["moderator", "admin"]),
  validateBody(z.object({ duplicateOf: z.string().min(1) })),
  asyncHandler(controller.markDuplicate)
);

answerRouter.use(authenticate);
answerRouter.patch(
  "/:id/approve",
  requireRoles(["moderator", "admin"]),
  validateBody(z.object({ note: z.string().max(1000).optional() })),
  asyncHandler(controller.approveAnswer)
);
answerRouter.patch(
  "/:id/reject",
  requireRoles(["moderator", "admin"]),
  validateBody(rejectAnswerSchema),
  asyncHandler(controller.rejectAnswer)
);
