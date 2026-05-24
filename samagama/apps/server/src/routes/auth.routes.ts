import { Router } from "express";
import { z } from "zod";
import { loginSchema, registerSchema } from "@samagama/shared";
import * as controller from "../controllers/auth.controller.js";
import { authenticate } from "../middlewares/authMiddleware.js";
import { authRateLimiter } from "../middlewares/rateLimiters.js";
import { validateBody } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const authRouter = Router();

authRouter.post(
  "/register",
  authRateLimiter,
  validateBody(registerSchema),
  asyncHandler(controller.register)
);
authRouter.post(
  "/login",
  authRateLimiter,
  validateBody(loginSchema),
  asyncHandler(controller.login)
);
authRouter.post(
  "/refresh",
  authRateLimiter,
  validateBody(z.object({ refreshToken: z.string().min(1) })),
  asyncHandler(controller.refresh)
);
authRouter.post("/logout", authenticate, (_req, res) => res.status(204).send());
authRouter.get("/me", authenticate, asyncHandler(controller.me));
