import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "@/lib/api";

interface User {
  id: string;
  email?: string;
  name: string;
  role: string;
  phone?: string;
  staffId?: string;
  assignedGate?: string;
  assignedEvent?: { id: string; title: string } | null;
  businessName?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  setUser: (user: User | null) => void;
  login: (email: string, password: string) => Promise<string | boolean>;
  staffLogin: (staffId: string, password: string) => Promise<string | boolean>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      setUser: (user) => set({ user }),

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
            token: tokens?.accessToken || response.data?.token, 
            isLoading: false 
          });
          return user.role;
        } catch (err: any) {
          const errorMsg = err.response?.data?.error?.message || err.response?.data?.message || "Invalid email or password";
          set({ 
            error: errorMsg, 
            isLoading: false 
          });
          return false;
        }
      },

      staffLogin: async (staffId, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post("/auth/staff-login", { staffId, password });
          const { user, token, tokens } = response.data;

          set({
            user,
            token: tokens?.accessToken || token,
            isLoading: false
          });
          return "STAFF";
        } catch (err: any) {
          const errorMsg = err.response?.data?.error?.message || err.response?.data?.message || "Invalid Staff ID or password";
          set({
            error: errorMsg,
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
