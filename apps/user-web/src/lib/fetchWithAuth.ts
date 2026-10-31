/**
 * fetchWithAuth — Centralized fetch wrapper with silent token refresh for user-web.
 *
 * Replaces scattered raw `fetch()` calls across pages. Automatically:
 *   1. Attaches the Bearer token from localStorage
 *   2. Sends cookies via `credentials: 'include'`
 *   3. On 401 → calls POST /auth/refresh → retries the original request once
 *   4. On refresh failure → clears auth state & redirects to /auth
 *
 * A lock prevents multiple concurrent refresh calls (token stampede).
 */

import { API_BASE } from '@/config/api';
import { useAuthStore } from '@/store/useAuthStore';

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

/**
 * Attempt to refresh the access token using the httpOnly refresh_token cookie.
 * Returns the new access token, or null if refresh failed.
 */
async function doRefresh(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) return null;

    const data = await res.json();
    const newToken = data.tokens?.accessToken || data.token;

    if (newToken) {
      // Persist the new token
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', newToken);
      }
      useAuthStore.getState().setToken(newToken);

      // Update user data if returned
      if (data.user) {
        useAuthStore.getState().setUser(data.user);
      }

      return newToken;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Ensures only one refresh runs at a time.
 * If a refresh is already in progress, all callers await the same promise.
 */
async function refreshToken(): Promise<string | null> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = doRefresh().finally(() => {
    isRefreshing = false;
    refreshPromise = null;
  });

  return refreshPromise;
}

/**
 * Force logout — clear auth state and redirect to /auth.
 */
function forceLogout(redirect: boolean) {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
  }
  useAuthStore.getState().setUser(null);
  useAuthStore.getState().setToken(null);
  if (redirect && typeof window !== 'undefined' && !window.location.pathname.includes('/auth')) {
    window.location.href = '/auth';
  }
}

/**
 * Build the Authorization headers from the stored token.
 */
function getAuthHeaders(extraHeaders?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...extraHeaders };
  const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (storedToken) {
    headers['Authorization'] = `Bearer ${storedToken}`;
  }
  return headers;
}

/**
 * Fetch wrapper with automatic silent refresh on 401.
 *
 * Usage (drop-in replacement for fetch):
 *   const res = await fetchWithAuth(`${API_BASE}/me/orders`);
 *   const res = await fetchWithAuth(`${API_BASE}/me`, { method: 'PATCH', body: JSON.stringify({...}) });
 */
export async function fetchWithAuth(
  url: string,
  options: RequestInit = {},
  { redirectOnFail = true }: { redirectOnFail?: boolean } = {}
): Promise<Response> {
  // Skip refresh logic for auth endpoints themselves
  const isAuthEndpoint = url.includes('/auth/login') ||
    url.includes('/auth/register') ||
    url.includes('/auth/google') ||
    url.includes('/auth/refresh') ||
    url.includes('/auth/forgot-password') ||
    url.includes('/auth/reset-password');

  const mergedOptions: RequestInit = {
    ...options,
    credentials: 'include',
    headers: getAuthHeaders(options.headers as Record<string, string>),
  };

  const response = await fetch(url, mergedOptions);

  // If not a 401 or this is an auth endpoint, return as-is
  if (response.status !== 401 || isAuthEndpoint) {
    return response;
  }

  // 401 received — attempt silent refresh
  const newToken = await refreshToken();

  if (!newToken) {
    // Refresh failed — force logout
    forceLogout(redirectOnFail);
    return response;
  }

  // Retry the original request with the new token
  const retryHeaders = {
    ...(options.headers as Record<string, string>),
    Authorization: `Bearer ${newToken}`,
  };

  const retryResponse = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: retryHeaders,
  });

  // If retry also fails with 401, force logout
  if (retryResponse.status === 401) {
    forceLogout(redirectOnFail);
  }

  return retryResponse;
}

