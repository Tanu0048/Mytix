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

/**
 * Refresh the authentication token using stored refreshToken.
 * Never logs out user automatically on network error.
 */
export async function refreshAuthSession(): Promise<string | null> {
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
      await AsyncStorage.setItem('user', JSON.stringify(data.user));
    }

    return newAccessToken || null;
  } catch (err) {
    console.warn('Silent token refresh failed:', err);
    return null;
  }
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
  let token = await getValidAuthToken();

  const headers: Record<string, string> = {
    'x-client-platform': 'mobile',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response = await fetch(url, { ...options, headers });

  // If 401 Unauthorized / Token Expired, attempt immediate refresh and retry once
  if (response.status === 401) {
    const refreshedToken = await refreshAuthSession();
    if (refreshedToken) {
      headers['Authorization'] = `Bearer ${refreshedToken}`;
      response = await fetch(url, { ...options, headers });
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
    await AsyncStorage.multiRemove(['user', 'token', 'refreshToken']);
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
