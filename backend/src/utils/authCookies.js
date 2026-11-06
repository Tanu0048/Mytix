import { env } from "../config/env.js";

const isProduction = env.NODE_ENV === "production";

/**
 * Shared options for auth cookies (access_token / refresh_token).
 * In production the admin/web frontends live on a different site than the API,
 * so cookies must be SameSite=None + Secure to be sent cross-site.
 */
export const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  path: "/",
  ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {})
};
