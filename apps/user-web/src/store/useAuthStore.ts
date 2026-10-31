import { create } from 'zustand';
import { API_BASE } from '@/config/api';
import { fetchWithAuth } from '@/lib/fetchWithAuth';

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  fetchUser: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  loading: true,
  setUser: (user) => set({ user, loading: false }),
  setToken: (token) => set({ token }),
  fetchUser: async () => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/me`);
      if (res.ok) {
        const data = await res.json();
        const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        set({ user: data.data || data, token: storedToken, loading: false });
      } else {
        set({ user: null, loading: false });
      }
    } catch {
      set({ user: null, loading: false });
    }
  },
  logout: async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, { 
        method: 'POST', 
        credentials: 'include' 
      });
    } catch (error) {
      console.error('Logout failed', error);
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
      }
      set({ user: null, token: null, loading: false });
    }
  }
}));
