import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { ERROR_CODES } from "../constants/errorCodes.js";
import { HTTP_STATUS } from "../constants/httpStatus.js";
import { USER_STATUS } from "../constants/statuses.js";
import User from "../models/User.js";
import { AppError } from "../utils/AppError.js";

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";
const BCRYPT_ROUNDS = 12;

// MVP-only refresh-token revocation. Production should move this to Redis with token TTLs.
const blacklistedRefreshTokens = new Set();

export const sanitizeUser = (user) => {
  const source = typeof user.toObject === "function" ? user.toObject() : { ...user };

  delete source.passwordHash;
  delete source.__v;

  return source;
};

export const generateTokenPair = (user) => {
  const userId = user._id?.toString() ?? user.id;
  const role = user.role;

  return {
    accessToken: jwt.sign(
      {
        sub: userId,
        role
      },
      env.JWT_ACCESS_SECRET,
      {
        expiresIn: ACCESS_TOKEN_EXPIRY
      }
    ),
    refreshToken: jwt.sign(
      {
        sub: userId,
        role
      },
      env.JWT_REFRESH_SECRET,
      {
        expiresIn: REFRESH_TOKEN_EXPIRY
      }
    )
  };
};

export const register = async ({ name, email, password, role }) => {
  const normalizedEmail = email.toLowerCase().trim();
  const existingUser = await User.findOne({ email: normalizedEmail }).select("_id");

  if (existingUser) {
    throw new AppError("A user with this email already exists", HTTP_STATUS.CONFLICT, ERROR_CODES.DUPLICATE_RESOURCE);
  }

  try {
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await User.create({
      name,
      email: normalizedEmail,
      passwordHash,
      role
    });

    return sanitizeUser(user);
  } catch (error) {
    if (error.code === 11000) {
      throw new AppError("A user with this email already exists", HTTP_STATUS.CONFLICT, ERROR_CODES.DUPLICATE_RESOURCE);
    }

    throw error;
  }
};

export const login = async ({ email, password }) => {
  const user = await User.findOne({
    email: email.toLowerCase().trim(),
    status: USER_STATUS.ACTIVE
  }).select("+passwordHash");

  if (!user) {
    throw new AppError("Invalid email or password", HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED);
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatches) {
    throw new AppError("Invalid email or password", HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED);
  }

  return {
    ...generateTokenPair(user),
    user: sanitizeUser(user)
  };
};

export const refreshTokens = async (refreshToken) => {
  if (!refreshToken) {
    throw new AppError("Refresh token is required", HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.TOKEN_MISSING);
  }

  if (blacklistedRefreshTokens.has(refreshToken)) {
    throw new AppError("Refresh token has been revoked", HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.TOKEN_INVALID);
  }

  try {
    const payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
    const user = await User.findOne({
      _id: payload.sub,
      status: USER_STATUS.ACTIVE
    });

    if (!user) {
      throw new AppError("Refresh token user is no longer available", HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.TOKEN_INVALID);
    }

    return {
      ...generateTokenPair(user),
      user: sanitizeUser(user)
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    if (error.name === "TokenExpiredError") {
      throw new AppError("Refresh token expired", HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.TOKEN_EXPIRED);
    }

    throw new AppError("Refresh token is invalid", HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.TOKEN_INVALID);
  }
};

export const logout = async (refreshToken) => {
  // Refresh tokens are accepted from the request body for the MVP. Move them to secure,
  // httpOnly, sameSite cookies when the browser threat model is finalized.
  if (!refreshToken) {
    throw new AppError("Refresh token is required", HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.TOKEN_MISSING);
  }

  if (refreshToken) {
    blacklistedRefreshTokens.add(refreshToken);
  }

  return { loggedOut: true };
};

export const clearRefreshTokenBlacklistForTests = () => {
  blacklistedRefreshTokens.clear();
};
