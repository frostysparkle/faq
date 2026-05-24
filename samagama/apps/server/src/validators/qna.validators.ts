import type { z } from "zod";
import type { existingAnswerCheckSchema } from "@samagama/shared";

export type ExistingAnswerCheckInput = z.infer<typeof existingAnswerCheckSchema>;
