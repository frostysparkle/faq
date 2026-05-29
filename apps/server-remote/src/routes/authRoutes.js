import { Router } from "express";
import { z } from "zod";
import { USER_ROLE_VALUES, USER_ROLES } from "../constants/roles.js";
import * as authController from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validate } from "../middleware/validate.js";

const registerSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(12).max(128),
  role: z.enum(USER_ROLE_VALUES).default(USER_ROLES.STUDENT)
});

const loginSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(1)
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1)
});

const logoutSchema = z.object({
  refreshToken: z.string().min(1)
});

const router = Router();

router.post("/register", validate(registerSchema), asyncHandler(authController.register));
router.post("/login", validate(loginSchema), asyncHandler(authController.login));
router.post("/refresh", validate(refreshSchema), asyncHandler(authController.refresh));
router.post("/logout", requireAuth, validate(logoutSchema), asyncHandler(authController.logout));
router.get("/me", requireAuth, asyncHandler(authController.getMe));

export default router;
