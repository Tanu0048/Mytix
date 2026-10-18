/**
 * Centralized API & Backend Host configuration for user-app.
 * All URLs are loaded dynamically from environment variables (.env).
 * Nothing is hardcoded in any component or screen.
 */
export function getBackendHost(): string {
  const envUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }
  return 'http://localhost:5000';
}

export function getApiBase(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }
  return `${getBackendHost()}/api/v1`;
}

export const BACKEND_HOST = getBackendHost();
export const API_BASE = getApiBase();
