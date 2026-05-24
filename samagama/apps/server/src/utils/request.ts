import type { Request } from "express";
import { AppError } from "./AppError.js";

export function requiredParam(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== "string" || value.length === 0) {
    throw new AppError(400, "MISSING_ROUTE_PARAM", `Route parameter '${name}' is required.`);
  }
  return value;
}
