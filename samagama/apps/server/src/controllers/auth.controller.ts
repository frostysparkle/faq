import type { Request, Response } from "express";
import { created, ok } from "../utils/apiResponse.js";
import * as authService from "../services/auth.service.js";
import { AppError } from "../utils/AppError.js";

export async function register(req: Request, res: Response) {
  created(res, await authService.registerUser(req.body));
}

export async function login(req: Request, res: Response) {
  ok(res, await authService.loginUser(req.body));
}

export async function refresh(req: Request, res: Response) {
  const refreshToken =
    typeof req.body.refreshToken === "string" ? req.body.refreshToken : undefined;
  if (!refreshToken)
    throw new AppError(400, "REFRESH_TOKEN_REQUIRED", "Refresh token is required.");
  ok(res, await authService.refreshTokens(refreshToken));
}

export async function me(req: Request, res: Response) {
  ok(res, req.user);
}
