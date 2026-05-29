import mongoose from "mongoose";
import { ZodError } from "zod";
import { env } from "../config/env.js";
import { ERROR_CODES } from "../constants/errorCodes.js";
import { HTTP_STATUS } from "../constants/httpStatus.js";
import { sendError } from "../utils/apiResponse.js";
import { AppError } from "../utils/AppError.js";

const formatZodDetails = (error) =>
  error.issues.map((issue) => ({
    path: issue.path.join("."),
    code: issue.code,
    message: issue.message
  }));

const formatMongooseDetails = (error) =>
  Object.values(error.errors).map((issue) => ({
    path: issue.path,
    message: issue.message
  }));

export const errorHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    return sendError(
      res,
      "Validation failed",
      HTTP_STATUS.BAD_REQUEST,
      formatZodDetails(err),
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  if (err instanceof mongoose.Error.ValidationError) {
    return sendError(
      res,
      "Database validation failed",
      HTTP_STATUS.BAD_REQUEST,
      formatMongooseDetails(err),
      ERROR_CODES.MONGOOSE_VALIDATION_ERROR
    );
  }

  if (err instanceof mongoose.Error.CastError) {
    return sendError(
      res,
      "Invalid resource identifier",
      HTTP_STATUS.BAD_REQUEST,
      { path: err.path, value: err.value },
      ERROR_CODES.INVALID_IDENTIFIER
    );
  }

  if (err?.code === 11000) {
    return sendError(
      res,
      "Resource already exists",
      HTTP_STATUS.CONFLICT,
      { fields: Object.keys(err.keyPattern ?? {}) },
      ERROR_CODES.DUPLICATE_RESOURCE
    );
  }

  if (err?.name === "JsonWebTokenError") {
    return sendError(res, "Invalid token", HTTP_STATUS.UNAUTHORIZED, null, ERROR_CODES.TOKEN_INVALID);
  }

  if (err?.name === "TokenExpiredError") {
    return sendError(res, "Token expired", HTTP_STATUS.UNAUTHORIZED, null, ERROR_CODES.TOKEN_EXPIRED);
  }

  if (err instanceof AppError && err.isOperational) {
    return sendError(res, err.message, err.statusCode, err.details, err.errorCode);
  }

  const message = env.NODE_ENV === "production" ? "Internal server error" : err.message;
  return sendError(res, message, HTTP_STATUS.INTERNAL_SERVER_ERROR, null, ERROR_CODES.INTERNAL_SERVER_ERROR);
};
