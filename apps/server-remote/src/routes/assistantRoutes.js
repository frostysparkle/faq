import { Router } from "express";
import { z } from "zod";
import * as assistantController from "../controllers/assistantController.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validate } from "../middleware/validate.js";

const searchSchema = z.object({
  query: z.string().trim().min(3).max(300)
});

const router = Router();

router.use(requireAuth);
router.post("/search", validate(searchSchema), asyncHandler(assistantController.search));

export default router;
