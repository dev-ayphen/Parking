import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AdminUser } from '../types/auth';
import { API_BASE } from '@/lib/config';

interface AuthState {
  user: AdminUser | null;
  isLoading: boolean;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,
      token: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await fetch(`${API_BASE}/auth/admin-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });
          const data = await response.json();
          if (!response.ok) {
            // The backend returns `error` as a STRING for auth failures, but as an
            // OBJECT ({ message, code, ... }) for validation errors. Passing an
            // object to new Error() yields "[object Object]" — so extract a string.
            const e = data?.error;
            const msg =
              typeof e === 'string' ? e
              : (e?.message || data?.message || 'Invalid credentials');
            throw new Error(msg);
          }
          const user: AdminUser = {
            id: String(data.user.id),
            email: data.user.email,
            name: data.user.name || 'Admin',
            role: 'admin',
            adminRole: data.user.adminRole ?? 'SUPER_ADMIN',
          };
          set({ user, token: data.token });
          // Set httpOnly cookie so middleware can protect SSR routes
          await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: data.token }),
          });
        } finally {
          set({ isLoading: false });
        }
      },

      logout: () => {
        set({ user: null, token: null });
        fetch('/api/auth/session', { method: 'DELETE' }).catch(() => {});
      },
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
      }),
    }
  )
);
