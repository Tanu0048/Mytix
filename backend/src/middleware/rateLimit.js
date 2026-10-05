import rateLimit from "express-rate-limit";
import { AppError } from "../utils/errors.js";

const createRateLimiter = (maxRequests, windowMinutes, message) => {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max: maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, _res, next) => {
      next(new AppError("RATE_LIMITED", 429, message || "Too many requests, please try again later."));
    }
  });
};

export const authLimiter = createRateLimiter(15, 15, "Too many authentication attempts. Please try again in 15 minutes.");
export const publicLimiter = createRateLimiter(300, 1, "Too many requests from this IP address.");
export const holdsLimiter = createRateLimiter(30, 1, "Hold request limit reached. Please wait a moment.");
export const checkoutLimiter = createRateLimiter(20, 1, "Checkout request limit reached. Please wait a moment.");
