import crypto from "crypto";
import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import { AppError } from "../utils/errors.js";

/**
 * Idempotency middleware backed by the saved_requests database table.
 * Guarantees safe retries on network drops or user double-clicks.
 */
export async function idempotency(req, res, next) {
  const idempotencyKey = req.headers["idempotency-key"] || req.headers["x-idempotency-key"];

  if (!idempotencyKey) {
    return next();
  }

  // Calculate SHA-256 hash of URL and body to detect payload tampering on reused keys
  const requestPayloadString = `${req.method}:${req.originalUrl}:${JSON.stringify(req.body || {})}`;
  const requestHash = crypto.createHash("sha256").update(requestPayloadString).digest("hex");

  try {
    const existing = await prisma.savedRequest.findUnique({
      where: { key: idempotencyKey }
    });

    if (existing) {
      if (existing.requestHash !== requestHash) {
        return next(
          new AppError(
            "IDEMPOTENCY_CONFLICT",
            422,
            "The provided Idempotency-Key has already been used with different request parameters."
          )
        );
      }

      logger.info("Returning cached idempotent response", {
        key: idempotencyKey,
        statusCode: existing.statusCode
      });

      res.setHeader("X-Cache-Lookup", "HIT-IDEMPOTENT");
      return res.status(existing.statusCode).json(existing.response);
    }
  } catch (err) {
    logger.warn("Idempotency lookup failed, proceeding with fresh request", { error: err.message });
  }

  // Intercept response to store result upon successful or client-side failure response
  const originalJson = res.json.bind(res);

  res.json = (body) => {
    // Restore original method
    res.json = originalJson;

    // Only cache terminal HTTP status codes (don't cache 500 internal server errors)
    if (res.statusCode < 500) {
      prisma.savedRequest
        .create({
          data: {
            key: idempotencyKey,
            requestHash,
            statusCode: res.statusCode,
            response: body
          }
        })
        .catch((err) => {
          // If Prisma threw P2002 (concurrent request already inserted it), that's fine
          if (err.code !== "P2002") {
            logger.error("Failed to save idempotent request result", {
              key: idempotencyKey,
              error: err.message
            });
          }
        });
    }

    return originalJson(body);
  };

  next();
}
