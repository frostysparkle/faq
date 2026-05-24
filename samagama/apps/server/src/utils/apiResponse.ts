import type { Response } from "express";
import type { ApiFailure, ApiSuccess } from "@samagama/shared";

export function ok<T>(
  res: Response,
  data: T,
  meta?: Record<string, unknown>
): Response<ApiSuccess<T>> {
  return res.json({ success: true, data, meta });
}

export function created<T>(res: Response, data: T): Response<ApiSuccess<T>> {
  return res.status(201).json({ success: true, data });
}

export function fail(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: unknown
): Response<ApiFailure> {
  return res.status(status).json({ success: false, error: { code, message, details } });
}
