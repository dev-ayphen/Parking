import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getAuthToken,
  getUserId,
  saveAuthToken,
  saveRefreshToken,
  saveUserId,
  clearAuthData,
} from '../utils/secureStorage';
import { API_BASE } from '../config/api.config';
import { resetAuthLostGuard } from '../services/api.service';

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
  setSession: (token: string, user: AuthUser, expiresIn?: number, refreshToken?: string) => Promise<void>;
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

  setSession: async (token, user, expiresIn, refreshToken) => {
    await saveAuthToken(token, expiresIn);
    // Persist the refresh token so api.service refreshAccessToken() can use it
    // to silently renew the access token instead of forcing a re-login.
    if (refreshToken) await saveRefreshToken(refreshToken);
    await saveUserId(user.id);
    // Re-arm the session-lost guard so a future expiry can trigger one more alert.
    resetAuthLostGuard();
    set({ token, user });
  },

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
    // Clear the push token server-side FIRST (while the auth token is still
    // valid) so the next person on this device doesn't inherit our pushes.
    // Best-effort: never block logout on it.
    try {
      const token = await getAuthToken();
      if (token) {
        await fetch(`${API_BASE}/users/me/push-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ token: null }),
        });
      }
    } catch {
      // ignore — logout must always proceed
    }

    await clearAuthData();
    set({ user: null, token: null });

    // Clear notification read-state so the next user on this device starts fresh.
    await AsyncStorage.removeItem('parkswift_read_notification_ids').catch(() => {});

    // Wipe any session bars so the signed-out welcome screen (and the next user
    // on this device) never sees the previous session's booking bar. Imported
    // lazily to avoid a circular store dependency.
    try {
      const { useSessionBarStore } = require('./sessionBarStore');
      useSessionBarStore.getState().clearAll();
    } catch {
      // never block logout
    }
  },
}));
