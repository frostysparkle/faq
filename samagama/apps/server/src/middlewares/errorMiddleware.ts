import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/AppError.js";
import { fail } from "../utils/apiResponse.js";
import { logger } from "../utils/logger.js";

export const errorMiddleware: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof AppError) {
    fail(res, error.statusCode, error.code, error.message, error.details);
    return;
  }

  if (error instanceof ZodError) {
    fail(res, 400, "VALIDATION_ERROR", "Request validation failed.", error.flatten());
    return;
  }

  logger.error("Unhandled request error", error);
  fail(res, 500, "INTERNAL_ERROR", "An unexpected error occurred.");
};
