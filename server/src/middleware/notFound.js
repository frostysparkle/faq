import { NotFoundError } from "../utils/AppError.js";

export const notFoundHandler = (req, _res, next) => {
  next(new NotFoundError(`Route not found: ${req.method} ${req.originalUrl}`));
};
