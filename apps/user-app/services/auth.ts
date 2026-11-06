import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '../constants/api';

/**
 * Safe Base64 decoder for React Native environments.
 */
function decodeBase64(str: string): string {
  try {
    if (typeof atob === 'function') {
      return atob(str);
    }
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let output = '';
    const cleanStr = String(str).replace(/=+$/, '');
    for (
      let bc = 0, bs = 0, buffer = 0, idx = 0;
      (buffer = cleanStr.charAt(idx++).charCodeAt(0));
      ~buffer && ((bs = bc % 4 ? bs * 64 + buffer : buffer), bc++ % 4)
        ? (output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6))))
        : 0
    ) {
      buffer = chars.indexOf(String.fromCharCode(buffer));
    }
    return output;
  } catch {
    return '';
  }
}

/**
 * Check whether a JWT token is expired or expiring within 60 seconds.
 */
export function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const jsonStr = decodeBase64(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    if (!jsonStr) return false;
    const payload = JSON.parse(jsonStr);
    if (!payload.exp) return false;
    return Date.now() >= payload.exp * 1000 - 60000;
  } catch {
    return false;
  }
}

const SESSION_KEYS = ['user', 'token', 'refreshToken'];

/** Clears the stored session so every screen shows the logged-out state. */
async function clearSession(): Promise<void> {
  await AsyncStorage.multiRemove(SESSION_KEYS).catch(() => {});
}

async function doRefresh(): Promise<string | null> {
  try {
    const refreshToken = await AsyncStorage.getItem('refreshToken');
    if (!refreshToken) return null;

    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-platform': 'mobile',
      },
      body: JSON.stringify({ refreshToken, isMobile: true, clientPlatform: 'mobile' }),
    });

    if (!res.ok) {
      // 401/403 means the server rejected the session (expired, revoked or reused token):
      // it can never recover, so log out instead of looking signed in while every call fails.
      // Other statuses (5xx, Render cold start) are temporary, so keep the session.
      if (res.status === 401 || res.status === 403) {
        await clearSession();
      }
      return null;
    }

    const data = await res.json();
    const newAccessToken = data.tokens?.accessToken || data.token;
    const newRefreshToken = data.tokens?.refreshToken || data.refreshToken;

    if (newAccessToken) {
      await AsyncStorage.setItem('token', newAccessToken);
    }
    if (newRefreshToken) {
      await AsyncStorage.setItem('refreshToken', newRefreshToken);
    }
    if (data.user) {
      // The refresh response only carries id/email/name/role, so merge instead of
      // overwriting fields like phone that the full profile has.
      const stored = await AsyncStorage.getItem('user');
      const existing = stored ? JSON.parse(stored) : {};
      await AsyncStorage.setItem('user', JSON.stringify({ ...existing, ...data.user }));
    }

    return newAccessToken || null;
  } catch (err) {
    // Network error: keep the session, the next request can try again.
    console.warn('Silent token refresh failed:', err);
    return null;
  }
}

let refreshInFlight: Promise<string | null> | null = null;

/**
 * Refresh the authentication token using stored refreshToken.
 *
 * Only one refresh runs at a time. The backend rotates refresh tokens and treats a
 * re-used (already rotated) token as theft, revoking the whole session. So parallel
 * requests that all hit an expired token must share one refresh, not each send the
 * same refresh token.
 */
export function refreshAuthSession(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = doRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

/**
 * Retrieve a valid access token. Automatically refreshes if expired.
 */
export async function getValidAuthToken(): Promise<string | null> {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) return null;

    if (isTokenExpired(token)) {
      const refreshedToken = await refreshAuthSession();
      if (refreshedToken) {
        return refreshedToken;
      }
      // If the refresh was rejected the session was cleared; don't hand out the dead token.
      return await AsyncStorage.getItem('token');
    }

    return token;
  } catch {
    return null;
  }
}

/**
 * Authenticated fetch helper with automatic 401 retry & token refresh.
 * Keeps user session persistent and alive indefinitely until explicit logout.
 */
export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await getValidAuthToken();

  const buildHeaders = (bearer: string | null) => {
    // Accepts any HeadersInit shape (object, array or Headers instance).
    const headers = new Headers(options.headers);
    headers.set('x-client-platform', 'mobile');
    if (bearer) headers.set('Authorization', `Bearer ${bearer}`);
    return headers;
  };

  let response = await fetch(url, { ...options, headers: buildHeaders(token) });

  // If 401 Unauthorized / Token Expired, refresh (or reuse a refresh another request already did) and retry once
  if (response.status === 401 && token) {
    const storedToken = await AsyncStorage.getItem('token');
    const newToken = storedToken && storedToken !== token ? storedToken : await refreshAuthSession();
    if (newToken) {
      response = await fetch(url, { ...options, headers: buildHeaders(newToken) });
    }
  }

  return response;
}

/**
 * Explicit user logout. Only called when user taps "Sign Out".
 */
export async function logoutUser(): Promise<void> {
  try {
    const refreshToken = await AsyncStorage.getItem('refreshToken');
    if (refreshToken) {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-platform': 'mobile',
        },
        body: JSON.stringify({ refreshToken }),
      }).catch(() => {});
    }
  } finally {
    await clearSession();
  }
}

/**
 * Fetches the latest user profile from GET /me, updates AsyncStorage('user'),
 * and returns the latest merged user profile.
 */
export async function fetchFreshUserProfile(): Promise<any | null> {
  try {
    const res = await fetchWithAuth(`${API_BASE}/me`);
    if (res.ok) {
      const data = await res.json();
      const freshUser = data.data || data.user || data;
      if (freshUser && (freshUser.id || freshUser.email)) {
        const storedUser = await AsyncStorage.getItem('user');
        const existing = storedUser ? JSON.parse(storedUser) : {};
        const mergedUser = { ...existing, ...freshUser };
        await AsyncStorage.setItem('user', JSON.stringify(mergedUser));
        return mergedUser;
      }
    }
    return null;
  } catch (err) {
    console.warn('Silent user profile sync failed:', err);
    return null;
  }
}
