import { AppError } from "../utils/errors.js";

export function authorize(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new AppError("LOGIN_REQUIRED", 401, "Authentication is required."));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError("FORBIDDEN", 403, "You do not have permission to perform this action."));
    }

    next();
  };
}
