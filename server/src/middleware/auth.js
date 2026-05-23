import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { ERROR_CODES } from "../constants/errorCodes.js";
import { HTTP_STATUS } from "../constants/httpStatus.js";
import { USER_STATUS } from "../constants/statuses.js";
import User from "../models/User.js";
import { AppError } from "../utils/AppError.js";

export const extractToken = (req) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.slice("Bearer ".length).trim();
};

export const requireAuth = async (req, _res, next) => {
  const token = extractToken(req);

  if (!token) {
    return next(new AppError("Access token is required", HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.TOKEN_MISSING));
  }

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
    const user = await User.findOne({
      _id: payload.sub,
      status: USER_STATUS.ACTIVE
    }).select("email role");

    if (!user) {
      return next(new AppError("Access token user is invalid", HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.TOKEN_INVALID));
    }

    req.user = {
      id: user._id.toString(),
      role: user.role,
      email: user.email
    };

    return next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return next(new AppError("Access token expired", HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.TOKEN_EXPIRED));
    }

    if (error.name === "JsonWebTokenError") {
      return next(new AppError("Access token is invalid", HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.TOKEN_INVALID));
    }

    return next(error);
  }
};

export const authenticate = requireAuth;
