import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { USER_ROLES, type AuthUser, type UserRole } from "@samagama/shared";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

interface JwtPayload {
  sub: string;
  name: string;
  email: string;
  role: UserRole;
}

function isJwtPayload(value: unknown): value is JwtPayload {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.sub === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.email === "string" &&
    USER_ROLES.includes(candidate.role as UserRole)
  );
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (!token) throw new AppError(401, "UNAUTHENTICATED", "Authentication token is required.");

  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
  if (!isJwtPayload(decoded)) throw new AppError(401, "INVALID_TOKEN", "Invalid access token.");

  req.user = {
    id: decoded.sub,
    name: decoded.name,
    email: decoded.email,
    role: decoded.role
  };
  next();
}

export function requireRoles(allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) throw new AppError(401, "UNAUTHENTICATED", "Authentication is required.");
    if (!allowedRoles.includes(req.user.role)) {
      throw new AppError(403, "FORBIDDEN", "You do not have permission for this action.");
    }
    next();
  };
}
