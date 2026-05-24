import { Router } from "express";
import { z } from "zod";
import { taxonomySchema } from "@samagama/shared";
import * as controller from "../controllers/taxonomy.controller.js";
import { authenticate, requireRoles } from "../middlewares/authMiddleware.js";
import { validateBody } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const categoryRouter = Router();
export const tagRouter = Router();

categoryRouter.use(authenticate);
categoryRouter.get("/", asyncHandler(controller.listCategories));
categoryRouter.post(
  "/",
  requireRoles(["admin"]),
  validateBody(taxonomySchema),
  asyncHandler(controller.createCategory)
);
categoryRouter.patch(
  "/:id",
  requireRoles(["admin"]),
  validateBody(taxonomySchema.partial()),
  asyncHandler(controller.updateCategory)
);
categoryRouter.delete("/:id", requireRoles(["admin"]), asyncHandler(controller.archiveCategory));

tagRouter.use(authenticate);
tagRouter.get("/", asyncHandler(controller.listTags));
tagRouter.post(
  "/",
  requireRoles(["admin"]),
  validateBody(taxonomySchema),
  asyncHandler(controller.createTag)
);
tagRouter.patch(
  "/:id",
  requireRoles(["admin"]),
  validateBody(taxonomySchema.partial()),
  asyncHandler(controller.updateTag)
);
tagRouter.delete("/:id", requireRoles(["admin"]), asyncHandler(controller.archiveTag));
tagRouter.post(
  "/suggest",
  requireRoles(["moderator", "admin"]),
  validateBody(z.object({ text: z.string().min(1) })),
  asyncHandler(controller.suggestTags)
);
