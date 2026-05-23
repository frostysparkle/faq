import { z } from "zod";
import { USER_ROLE_VALUES, USER_ROLES, USER_STATUS, USER_STATUS_VALUES } from "../constants/index.js";

const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .max(128)
  .regex(/[A-Z]/, "Password must contain an uppercase letter")
  .regex(/[a-z]/, "Password must contain a lowercase letter")
  .regex(/\d/, "Password must contain a number");

export const userBaseSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().toLowerCase(),
  role: z.enum(USER_ROLE_VALUES).default(USER_ROLES.VIEWER),
  status: z.enum(USER_STATUS_VALUES).default(USER_STATUS.INVITED),
  department: z.string().trim().max(120).optional()
});

export const registerUserSchema = userBaseSchema.extend({
  password: passwordSchema
});

export const loginUserSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(1)
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(20)
});

export const updateUserSchema = userBaseSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one user field is required"
);
