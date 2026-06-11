import React, { createContext, useContext, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { Colors, DarkColors, type ColorsType } from '../theme';
import { useThemeStore } from '../store/themeStore';

interface ThemeContextValue {
  colors: ColorsType;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: Colors,
  isDark: false,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const { mode, hydrate } = useThemeStore();

  useEffect(() => { hydrate(); }, []);

  const isDark =
    mode === 'dark' ||
    (mode === 'system' && systemScheme === 'dark');

  const colors = isDark ? (DarkColors as unknown as ColorsType) : Colors;

  return (
    <ThemeContext.Provider value={{ colors, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Internal — consumed only by useTheme() in hooks/useTheme.ts.
 * Do NOT import this directly in screens or components.
 * Use: const theme = useTheme()
 */
export function _useThemeContext() {
  return useContext(ThemeContext);
}
