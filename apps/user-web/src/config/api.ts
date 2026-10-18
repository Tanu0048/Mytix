/**
 * Centralized API & Backend Host configuration for user-web.
 * All URLs are loaded dynamically from environment variables (.env.local).
 * Nothing is hardcoded in any component or page.
 */
export function getBackendHost(): string {
  const envUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }
  return 'http://localhost:5000';
}

export function getApiBase(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }
  return `${getBackendHost()}/api/v1`;
}

export const BACKEND_HOST = getBackendHost();
export const API_BASE = getApiBase();
