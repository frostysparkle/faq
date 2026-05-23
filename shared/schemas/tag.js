import { z } from "zod";
import { RECORD_STATUS, RECORD_STATUS_VALUES } from "../constants/index.js";
import { slugSchema } from "./common.js";

export const tagSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: slugSchema.optional(),
  description: z.string().trim().max(300).optional(),
  status: z.enum(RECORD_STATUS_VALUES).default(RECORD_STATUS.ACTIVE)
});

export const createTagSchema = tagSchema;

export const updateTagSchema = tagSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one tag field is required"
);
