import { AppError } from "../utils/errors.js";
import { logger } from "../lib/logger.js";

export function errorHandler(err, req, res, _next) {
  const isAppError = err instanceof AppError;
  const statusCode = isAppError ? err.statusCode : (err.status || 500);
  const errorCode = isAppError ? err.code : (err.code || "INTERNAL_SERVER_ERROR");
  const message = isAppError ? err.message : (statusCode === 500 ? "Internal server error occurred." : err.message);

  logger.error("HTTP request error", {
    code: errorCode,
    statusCode,
    message: err.message,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
    requestId: req.headers["x-request-id"]
  });

  res.status(statusCode).json({
    error: {
      code: errorCode,
      message
    }
  });
}
