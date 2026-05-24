import type { Request, Response } from "express";
import { ok } from "../utils/apiResponse.js";
import * as moderationService from "../services/moderation.service.js";
import * as flagService from "../services/flag.service.js";

export async function pendingAnswers(_req: Request, res: Response) {
  ok(res, await moderationService.listPendingAnswers());
}

export async function flags(req: Request, res: Response) {
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  ok(res, await flagService.listFlags(status));
}
