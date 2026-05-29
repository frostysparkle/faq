import * as authService from "../services/authService.js";
import { HTTP_STATUS } from "../constants/httpStatus.js";
import { sendSuccess } from "../utils/apiResponse.js";

export const register = async (req, res) => {
  const user = await authService.register(req.body);
  return sendSuccess(res, { user }, HTTP_STATUS.CREATED);
};

export const login = async (req, res) => {
  const result = await authService.login(req.body);
  return sendSuccess(res, result, HTTP_STATUS.OK);
};

export const refresh = async (req, res) => {
  const result = await authService.refreshTokens(req.body.refreshToken);
  return sendSuccess(res, result, HTTP_STATUS.OK);
};

export const logout = async (req, res) => {
  const result = await authService.logout(req.body.refreshToken);
  return sendSuccess(res, result, HTTP_STATUS.OK);
};

export const getMe = async (req, res) => sendSuccess(res, req.user, HTTP_STATUS.OK);
