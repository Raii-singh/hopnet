import { create } from 'zustand';

const BASE_URL_V2 = process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL + '/v2' : 'http://localhost:3001/api/v2';

interface AuthState {
  isAdmin: boolean;
  username: string | null;
  isChecking: boolean;
  setIsAdmin: (isAdmin: boolean, username?: string | null) => void;
  checkAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAdmin: false,
  username: null,
  isChecking: true,
  setIsAdmin: (isAdmin, username = null) => set({ isAdmin, username }),
  checkAuth: async () => {
    try {
      const res = await fetch(`${BASE_URL_V2}/auth/status`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        set({ isAdmin: !!data.isAdmin, username: data.username || null, isChecking: false });
      } else {
        set({ isAdmin: false, username: null, isChecking: false });
      }
    } catch {
      set({ isAdmin: false, username: null, isChecking: false });
    }
  },
  logout: async () => {
    try {
      await fetch(`${BASE_URL_V2}/auth/logout`, { method: 'POST', credentials: 'include' });
      set({ isAdmin: false, username: null });
    } catch {
      // Ignore errors
    }
  }
}));
