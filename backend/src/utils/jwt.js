import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AppError } from "./errors.js";

/**
 * Sign an access token with standard claims and application expiration.
 *
 * @param {object} payload - Claims to sign (e.g. sub, email, role)
 * @param {object} [options] - Optional jsonwebtoken signing options
 * @returns {string} Signed JWT string
 */
export function signAccessToken(payload, options = {}) {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRATION,
    ...options
  });
}

/**
 * Verify an access token and return the decoded payload.
 * Throws AppError with 401 status on token expiration or invalid signature.
 *
 * @param {string} token - The JWT string to verify
 * @returns {object} Decoded JWT payload
 */
export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET);
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      throw new AppError("TOKEN_EXPIRED", 401, "Your session has expired. Please log in again.");
    }
    throw new AppError("INVALID_TOKEN", 401, "Invalid authentication token. Please log in again.");
  }
}

/**
 * Decode a token without verifying signature (useful for inspection).
 *
 * @param {string} token - The JWT string to decode
 * @returns {object|null} Decoded payload or null
 */
export function decodeToken(token) {
  return jwt.decode(token);
}
