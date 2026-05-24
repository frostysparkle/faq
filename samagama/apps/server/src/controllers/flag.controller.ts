import type { Request, Response } from "express";
import { created, ok } from "../utils/apiResponse.js";
import * as flagService from "../services/flag.service.js";
import { AppError } from "../utils/AppError.js";
import { requiredParam } from "../utils/request.js";

function userId(req: Request): string {
  if (!req.user) throw new AppError(401, "UNAUTHENTICATED", "Authentication is required.");
  return req.user.id;
}

export async function createFlag(req: Request, res: Response) {
  created(res, await flagService.upsertFlag(req.body, userId(req)));
}

export async function listFlags(req: Request, res: Response) {
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  ok(res, await flagService.listFlags(status));
}

export async function updateFlagStatus(req: Request, res: Response) {
  ok(res, await flagService.updateFlagStatus(requiredParam(req, "id"), req.body, userId(req)));
}
