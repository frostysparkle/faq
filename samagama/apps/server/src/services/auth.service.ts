import bcrypt from "bcrypt";
import jwt, { type SignOptions } from "jsonwebtoken";
import { type AuthUser, type LoginInput, type RegisterInput } from "@samagama/shared";
import { env } from "../config/env.js";
import { UserModel, type UserDocument } from "../models/User.js";
import { AppError } from "../utils/AppError.js";

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

function toAuthUser(user: UserDocument): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };
}

function signTokens(user: AuthUser): AuthTokens {
  const payload = {
    sub: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };

  const accessOptions: SignOptions = {
    expiresIn: env.JWT_ACCESS_TTL as NonNullable<SignOptions["expiresIn"]>
  };
  const refreshOptions: SignOptions = {
    expiresIn: env.JWT_REFRESH_TTL as NonNullable<SignOptions["expiresIn"]>
  };

  return {
    accessToken: jwt.sign(payload, env.JWT_ACCESS_SECRET, accessOptions),
    refreshToken: jwt.sign(payload, env.JWT_REFRESH_SECRET, refreshOptions)
  };
}

export async function registerUser(
  input: RegisterInput
): Promise<{ user: AuthUser; tokens: AuthTokens }> {
  const existing = await UserModel.findOne({ email: input.email });
  if (existing) throw new AppError(409, "EMAIL_EXISTS", "A user with this email already exists.");

  const passwordHash = await bcrypt.hash(input.password, env.PASSWORD_SALT_ROUNDS);
  const user = await UserModel.create({
    name: input.name,
    email: input.email,
    passwordHash,
    role: input.role,
    status: "active"
  });
  const authUser = toAuthUser(user);
  return { user: authUser, tokens: signTokens(authUser) };
}

export async function loginUser(
  input: LoginInput
): Promise<{ user: AuthUser; tokens: AuthTokens }> {
  const user = await UserModel.findOne({ email: input.email });
  if (!user || user.status !== "active") {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
  }

  const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
  if (!passwordMatches)
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password.");

  const authUser = toAuthUser(user);
  return { user: authUser, tokens: signTokens(authUser) };
}

export async function refreshTokens(
  refreshToken: string
): Promise<{ user: AuthUser; tokens: AuthTokens }> {
  const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
  if (typeof decoded !== "object" || decoded === null || typeof decoded.sub !== "string") {
    throw new AppError(401, "INVALID_REFRESH_TOKEN", "Invalid refresh token.");
  }
  const user = await UserModel.findById(decoded.sub);
  if (!user || user.status !== "active") {
    throw new AppError(401, "INVALID_REFRESH_TOKEN", "Invalid refresh token.");
  }
  const authUser = toAuthUser(user);
  return { user: authUser, tokens: signTokens(authUser) };
}
