import { z } from "zod";

export const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Expected a valid MongoDB ObjectId");

export const idParamSchema = z.object({
  id: objectIdSchema
});

export const emptyQuerySchema = z.object({}).strict();

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().max(120).optional()
});

export const slugSchema = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase words separated by hyphens");

export const optionalDateStringSchema = z
  .string()
  .datetime()
  .optional();
