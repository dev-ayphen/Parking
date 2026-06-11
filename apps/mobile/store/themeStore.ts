import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeStore {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => Promise<void>;
  hydrate: () => Promise<void>;
}

const STORAGE_KEY = 'parkswift_theme_mode';

export const useThemeStore = create<ThemeStore>((set) => ({
  mode: 'light',

  setMode: async (mode) => {
    set({ mode });
    await AsyncStorage.setItem(STORAGE_KEY, mode);
  },

  hydrate: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        set({ mode: stored });
      }
    } catch {}
  },
}));
