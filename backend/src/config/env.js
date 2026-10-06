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
  LOG_LEVEL: z.enum(["error", "warn", "info", "http", "debug"]).default("info"),
  ORDER_MIN_TICKETS: z.coerce.number().int().positive().default(1),
  ORDER_MAX_TICKETS: z.coerce.number().int().positive().default(10),
  HOLD_DURATION_MINUTES: z.coerce.number().int().positive().default(10),
  PASSWORD_RESET_EXPIRATION_MINUTES: z.coerce.number().int().positive().default(30),
  CACHE_AVAILABILITY_SECONDS: z.coerce.number().int().nonnegative().default(5),
  CACHE_CATALOG_SECONDS: z.coerce.number().int().nonnegative().default(15),
  CACHE_STATIC_PAGES_SECONDS: z.coerce.number().int().nonnegative().default(30),
  MAX_FILE_SIZE_MB: z.coerce.number().int().positive().default(5),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  TICKET_ED25519_PRIVATE_KEY: z.string().optional(),
  TICKET_ED25519_PUBLIC_KEY: z.string().optional()
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  logger.error("Environment validation failed", { errors: parsedEnv.error.format() });
  process.exit(1);
}

export const env = parsedEnv.data;
