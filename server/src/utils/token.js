import crypto from "crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { TOKEN_TYPES } from "../constants/auth.js";

export const signAccessToken = (user) =>
  jwt.sign(
    {
      role: user.role
    },
    env.JWT_ACCESS_SECRET,
    {
      subject: user._id.toString(),
      expiresIn: env.JWT_ACCESS_EXPIRY
    }
  );

export const signRefreshToken = (user) =>
  jwt.sign(
    {
      type: TOKEN_TYPES.REFRESH
    },
    env.JWT_REFRESH_SECRET,
    {
      subject: user._id.toString(),
      expiresIn: env.JWT_REFRESH_EXPIRY
    }
  );

export const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

export const getJwtExpiryDate = (token) => {
  const decoded = jwt.decode(token);
  return new Date(decoded.exp * 1000);
};
