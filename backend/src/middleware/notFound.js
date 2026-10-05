import { AppError } from "../utils/errors.js";

export function notFound(req, _res, next) {
  next(new AppError("NOT_FOUND", 404, `Route not found: ${req.method} ${req.originalUrl}`));
}
