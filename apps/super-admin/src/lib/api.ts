import axios from "axios";
import { useAuthStore } from "@/store/useAuthStore";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// ---------------------------------------------------------------------------
// Request interceptor — attach Bearer token from Zustand store
// ---------------------------------------------------------------------------
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ---------------------------------------------------------------------------
// Silent Refresh — Response interceptor
//
// When ANY request gets a 401 (except login / refresh itself):
//   1. Call POST /auth/refresh  (refresh_token is sent via httpOnly cookie)
//   2. Store the new access token in Zustand
//   3. Retry the original request with the new token
//   4. Only logout if the refresh itself fails
//
// A queue prevents multiple concurrent refresh calls (token stampede).
// ---------------------------------------------------------------------------

let isRefreshing = false;
let failedQueue: {
  resolve: (token: string | null) => void;
  reject: (error: unknown) => void;
}[] = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Skip silent refresh for these cases:
    const isLoginRequest = originalRequest?.url?.includes("/auth/login");
    const isStaffLoginRequest = originalRequest?.url?.includes("/auth/staff-login");
    const isRefreshRequest = originalRequest?.url?.includes("/auth/refresh");

    if (
      error.response?.status !== 401 ||
      originalRequest._retry ||
      isLoginRequest ||
      isStaffLoginRequest ||
      isRefreshRequest
    ) {
      // If the refresh call itself failed with 401, force logout
      if (error.response?.status === 401 && isRefreshRequest) {
        useAuthStore.getState().logout();
        if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
          window.location.href = "/login";
        }
      }
      return Promise.reject(error);
    }

    // Mark this request so we don't retry it infinitely
    originalRequest._retry = true;

    // If a refresh is already in progress, queue this request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      });
    }

    isRefreshing = true;

    try {
      // Call the refresh endpoint — refresh_token cookie is sent automatically
      const { data } = await api.post("/auth/refresh");
      const newAccessToken = data.tokens?.accessToken || data.token;

      if (newAccessToken) {
        // Update the Zustand store with the new token
        useAuthStore.getState().setToken(newAccessToken);

        // Update the user data if returned
        if (data.user) {
          useAuthStore.getState().setUser(data.user);
        }

        // Retry all queued requests with the new token
        processQueue(null, newAccessToken);

        // Retry the original request
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      }

      throw new Error("No access token in refresh response");
    } catch (refreshError) {
      // Refresh failed — session is truly expired, force logout
      processQueue(refreshError, null);
      useAuthStore.getState().logout();
      if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
