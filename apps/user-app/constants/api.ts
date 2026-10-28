/**
 * Centralized API & Backend Host configuration for user-app.
 * All URLs are loaded dynamically from environment variables (.env).
 * If environment variables are missing (e.g. in standalone APK / OTA bundle),
 * it safely defaults to the live production server (Render) instead of localhost.
 */
const LIVE_BACKEND_URL = 'https://mytix.onrender.com';

export function getBackendHost(): string {
  const envUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl.replace(/\/+$/, '');
  }
  // Allow localhost only if explicitly running in development (__DEV__)
  if (typeof __DEV__ !== 'undefined' && __DEV__ && envUrl) {
    return envUrl.replace(/\/+$/, '');
  }
  return LIVE_BACKEND_URL;
}

export function getApiBase(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl.replace(/\/+$/, '');
  }
  return `${getBackendHost()}/api/v1`;
}

export const BACKEND_HOST = getBackendHost();
export const API_BASE = getApiBase();
