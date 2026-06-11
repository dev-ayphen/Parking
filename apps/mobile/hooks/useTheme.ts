import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { _useThemeContext } from '../context/ThemeContext';
import { Spacing, BorderRadius, FontSize, FontWeight } from '../theme';
import type { ColorsType } from '../theme';

export interface AppTheme {
  colors: ColorsType;
  spacing: typeof Spacing;
  radius: typeof BorderRadius;
  fontSize: typeof FontSize;
  fontWeight: typeof FontWeight;
  isDark: boolean;
}

/**
 * THE single source of truth for all design tokens in ParkSwift.
 *
 * Usage in any screen or component:
 *
 *   const theme = useTheme();
 *
 *   theme.colors.primary       → brand pink (or dark equivalent)
 *   theme.colors.textPrimary   → heading colour
 *   theme.spacing.md           → 8
 *   theme.radius.lg            → 16
 *   theme.fontSize.xl          → 16
 *   theme.isDark               → boolean
 *
 * For styles, use the makeStyles pattern so they update when theme changes:
 *
 *   const theme = useTheme();
 *   const styles = useMemo(() => makeStyles(theme), [theme]);
 *   ...
 *   const makeStyles = (t: AppTheme) => StyleSheet.create({
 *     container: { backgroundColor: t.colors.white },
 *     title:     { color: t.colors.textPrimary, fontSize: t.fontSize.xl },
 *   });
 *
 * Never import Colors, DarkColors, useThemeColors, or useIsDark directly
 * in screens or components — always go through useTheme().
 */
export const useTheme = (): AppTheme => {
  const { colors, isDark } = _useThemeContext();
  return useMemo(() => ({
    colors,
    spacing: Spacing,
    radius: BorderRadius,
    fontSize: FontSize,
    fontWeight: FontWeight,
    isDark,
  }), [colors, isDark]);
};

export default useTheme;

/**
 * Helper: create a StyleSheet factory bound to the current theme.
 * Use this when you want to call makeStyles inline rather than via useMemo.
 *
 *   const styles = createStyles(theme, (t) => ({
 *     box: { backgroundColor: t.colors.white, borderRadius: t.radius.md },
 *   }));
 */
export function createStyles<T extends StyleSheet.NamedStyles<T>>(
  theme: AppTheme,
  factory: (t: AppTheme) => T,
): T {
  return StyleSheet.create(factory(theme));
}
