import "dotenv/config";
import { z } from "zod";
import { logger } from "../lib/logger.js";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.string().default("5000"),
  FRONTEND_URL: z.string().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DIRECT_URL: z.string().optional(),
  JWT_ACCESS_SECRET: z.string().min(16, "JWT_ACCESS_SECRET must be at least 16 chars"),
  JWT_REFRESH_SECRET: z.string().min(16, "JWT_REFRESH_SECRET must be at least 16 chars"),
  JWT_ACCESS_EXPIRATION: z.string().default("15m"),
  JWT_REFRESH_EXPIRATION_DAYS: z.string().default("30"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  LOG_LEVEL: z.enum(["error", "warn", "info", "http", "debug"]).default("info")
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  logger.error("Environment validation failed", { errors: parsedEnv.error.format() });
  process.exit(1);
}

export const env = parsedEnv.data;
