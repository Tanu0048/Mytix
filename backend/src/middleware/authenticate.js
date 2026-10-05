import jwt from "jsonwebtoken";
import { AppError } from "../utils/errors.js";

export function authenticate(req, _res, next) {
  let token = req.cookies?.access_token;

  if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(new AppError("LOGIN_REQUIRED", 401, "Authentication is required to perform this action."));
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = {
      id: payload.sub,
      role: payload.role,
      email: payload.email
    };
    next();
  } catch (err) {
    return next(new AppError("LOGIN_REQUIRED", 401, "Session has expired or is invalid. Please log in again."));
  }
}
