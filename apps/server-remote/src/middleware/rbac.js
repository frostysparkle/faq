import { ERROR_CODES } from "../constants/errorCodes.js";
import { HTTP_STATUS } from "../constants/httpStatus.js";
import { AppError } from "../utils/AppError.js";

const forbidden = () => new AppError("You do not have access to this resource", HTTP_STATUS.FORBIDDEN, ERROR_CODES.FORBIDDEN);

export const requireRole = (...roles) => (req, _res, next) => {
  if (!req.user) {
    return next(new AppError("Authentication is required", HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.TOKEN_MISSING));
  }

  if (!roles.includes(req.user.role)) {
    return next(forbidden());
  }

  return next();
};

export const requireOwnerOrRole = (getOwnerIdFn, ...roles) => async (req, _res, next) => {
  if (!req.user) {
    return next(new AppError("Authentication is required", HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.TOKEN_MISSING));
  }

  if (roles.includes(req.user.role)) {
    return next();
  }

  try {
    const ownerId = await getOwnerIdFn(req);

    if (ownerId?.toString() === req.user.id) {
      return next();
    }

    return next(forbidden());
  } catch (error) {
    return next(error);
  }
};
