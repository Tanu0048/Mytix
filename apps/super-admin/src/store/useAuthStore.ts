import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "@/lib/api";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<string | boolean>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post("/auth/login", { email, password });
          const { user, tokens } = response.data;
          
          if (user.role !== "ADMIN" && user.role !== "ORGANISER") {
            set({ error: "Access denied. Unauthorized role.", isLoading: false });
            return false;
          }

          set({ 
            user, 
            token: tokens.accessToken, 
            isLoading: false 
          });
          return user.role;
        } catch (err: any) {
          set({ 
            error: err.response?.data?.message || "Invalid email or password", 
            isLoading: false 
          });
          return false;
        }
      },

      logout: async () => {
        try {
          await api.post("/auth/logout");
        } catch (err) {
          console.error("Logout error", err);
        } finally {
          set({ user: null, token: null });
        }
      },
    }),
    {
      name: "admin-auth-storage",
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
);
