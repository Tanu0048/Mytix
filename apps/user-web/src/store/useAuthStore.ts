import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  fetchUser: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user, loading: false }),
  fetchUser: async () => {
    try {
      const res = await fetch('http://localhost:5000/api/v1/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        set({ user: data, loading: false });
      } else {
        set({ user: null, loading: false });
      }
    } catch (error) {
      set({ user: null, loading: false });
    }
  },
  logout: async () => {
    try {
      await fetch('http://localhost:5000/api/v1/auth/logout', { method: 'POST', credentials: 'include' });
      set({ user: null });
    } catch (error) {
      console.error('Logout failed', error);
    }
  }
}));
