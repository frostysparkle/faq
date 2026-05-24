import { Router } from "express";
import { flagCreateSchema, flagStatusUpdateSchema } from "@samagama/shared";
import * as controller from "../controllers/flag.controller.js";
import { authenticate, requireRoles } from "../middlewares/authMiddleware.js";
import { validateBody } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const flagRouter = Router();

flagRouter.use(authenticate);
flagRouter.post("/", validateBody(flagCreateSchema), asyncHandler(controller.createFlag));
flagRouter.get("/", requireRoles(["moderator", "admin"]), asyncHandler(controller.listFlags));
flagRouter.patch(
  "/:id/status",
  requireRoles(["moderator", "admin"]),
  validateBody(flagStatusUpdateSchema),
  asyncHandler(controller.updateFlagStatus)
);
