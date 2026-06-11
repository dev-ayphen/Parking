import { create } from 'zustand';
import {
  getAuthToken,
  getUserId,
  saveAuthToken,
  saveUserId,
  clearAuthData,
} from '../utils/secureStorage';
import { API_BASE } from '../config/api.config';

export interface AuthUser {
  id: number;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: string;
  photoUrl?: string | null;
  isProfileComplete?: boolean;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isHydrated: boolean;
  isAuthenticated: () => boolean;
  hydrate: () => Promise<void>;
  setSession: (token: string, user: AuthUser, expiresIn?: number) => Promise<void>;
  setUser: (user: AuthUser | null) => void;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
}

/**
 * Single source of truth for auth state across the mobile app.
 * Token is mirrored to SecureStore (cannot live only in memory because
 * the OS may kill the JS thread). Hydrate on app startup.
 */
export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isHydrated: false,

  isAuthenticated: () => !!get().token && !!get().user?.id,

  hydrate: async () => {
    try {
      const token = await getAuthToken();
      const userIdStr = await getUserId();
      if (token && userIdStr) {
        set({ token, user: { id: Number(userIdStr) } as AuthUser });
        get().refreshProfile().catch(() => undefined);
      }
    } finally {
      set({ isHydrated: true });
    }
  },

  setSession: async (token, user, expiresIn) => {
    await saveAuthToken(token, expiresIn);
    await saveUserId(user.id);
    set({ token, user });
  },

  setUser: (user) => set({ user }),

  refreshProfile: async () => {
    const { token } = get();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const json = await res.json();
      if (json?.user) set({ user: json.user });
    } catch {
      // Non-blocking: stale state is fine
    }
  },

  logout: async () => {
    await clearAuthData();
    set({ user: null, token: null });
  },
}));
