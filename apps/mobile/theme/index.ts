/**
 * ParkSwift Theme System — Central Export
 *
 * All design tokens are audit-verified from actual usage across 50+ screens.
 * Screens are NOT changed — this file documents what's already in use.
 *
 * Usage in new screens:
 *   import { Colors, FontSize, FontWeight, BorderRadius, Spacing, StatusColors, Shadows } from '../../theme';
 */

// Core color palette & light/dark themes
export { ColorPalette, LightTheme, DarkTheme } from './colors';
export type { ThemeType, ColorPaletteType } from './colors';
export { LightTheme as defaultTheme } from './colors';

// Design tokens (audit-verified from all screens)
export {
  Spacing,
  FontSize,
  FontWeight,
  Typography,
  BorderRadius,
  StatusColors,
  ExtendedColors,
  Shadows,
  Opacity,
  ZIndex,
  Animation,
} from './colors';

/**
 * Flat Colors object — most commonly used hex values, named for clarity.
 * These are the exact values currently hardcoded across all screens.
 */
export const Colors = {
  // Brand
  primary: '#DC0159',
  primaryLight: '#FF006B',
  primaryDark: '#A8003F',
  primaryGradient: '#FF3D7F', // logo PinIcon radial-gradient top stop
  primaryBg: '#FFF1F2',
  primaryBgLight: '#FFF5FA',

  // Backgrounds
  white: '#FFFFFF',          // SafeAreaView, cards, headers (used ~145 times)
  screenBg: '#F8FAFC',       // ScrollView/content area bg (used ~60 times)
  surfaceBg: '#F1F5F9',      // Chips, badges, dividers, input bg (used ~35 times)
  inputBg: '#FAFAFA',        // OTP boxes, off-white inputs

  // Text
  textPrimary: '#0F172A',    // Headings, key values (used ~95 times)
  textSecondary: '#64748B',  // Body, meta text (used ~85 times)
  textMuted: '#94A3B8',      // Placeholders, captions (used ~35 times)
  textDark: '#334155',       // Back-button icons, support text
  textBody: '#475569',       // Body paragraphs (Terms, FAQ answers)
  textAuth: '#111827',       // Auth screen inputs/titles

  // Borders
  borderLight: '#F1F5F9',    // Light dividers, list separators (used ~55 times)
  border: '#E2E8F0',         // Standard card/input borders (used ~80 times)
  borderMuted: '#CBD5E1',    // Radio buttons, dashed borders

  // Status backgrounds (tints used in badges/banners)
  successBg: '#F0FDF4',
  successBgAlt: '#ECFDF5',
  errorBg: '#FEF2F2',
  warningBg: '#FFFBEB',
  warningBgAlt: '#FEF3C7',
  infoBg: '#EFF6FF',
  pendingBg: '#FFF7ED',

  // Status text/icon colors
  success: '#16A34A',
  successAlt: '#10B981',
  error: '#DC2626',
  errorAlt: '#EF4444',
  warning: '#D97706',
  warningAlt: '#F59E0B',
  info: '#3B82F6',
  amber: '#FBBF24',          // Stars, selected ratings
  amberWarning: '#F59E0B',        // warning accent for min charge alert

  // Overlays
  overlay: 'rgba(0,0,0,0.5)',
  overlayLight: 'rgba(0,0,0,0.3)',

  // Borders (extra)
  borderLighter: '#F8FAFC',   // dashed/subtle separators (slightly lighter than borderLight)
  borderMedium: '#CBD5E1',    // medium-weight borders (same as borderMuted alias)

  // Text (extra)
  textPlaceholder: '#94A3B8', // italic placeholder text (alias for textMuted)

  // Stars / ratings
  starYellow: '#FBBF24',      // star fill color (same as amber)

  // Error extra
  errorLight: '#FEF2F2',      // error background alias (same as errorBg)

  // Disabled
  disabled: '#94A3B8',
  disabledBg: '#F1F5F9',
} as const;

/**
 * DarkColors — exact same keys as Colors, dark-mode values.
 * Brand pink never changes. Backgrounds invert. Text inverts.
 * Status tints are darkened. Borders become subtle dark lines.
 */
export const DarkColors = {
  // Brand — unchanged
  primary: '#DC0159',
  primaryLight: '#FF006B',
  primaryDark: '#A8003F',
  primaryGradient: '#FF3D7F',
  primaryBg: '#3D0015',       // dark pink tint
  primaryBgLight: '#2D0010',

  // Backgrounds — inverted
  white: '#1E293B',           // cards / headers become dark card
  screenBg: '#0F172A',        // screen bg = near-black
  surfaceBg: '#1E293B',       // chips / badges
  inputBg: '#1E293B',

  // Text — inverted
  textPrimary: '#F1F5F9',     // headings / key values → near-white
  textSecondary: '#94A3B8',   // body / meta → medium gray
  textMuted: '#64748B',       // placeholders → slate
  textDark: '#CBD5E1',        // back-button icons
  textBody: '#94A3B8',        // body paragraphs
  textAuth: '#F9FAFB',

  // Borders — darkened
  borderLight: '#1E293B',     // light dividers
  border: '#334155',          // standard borders
  borderMuted: '#475569',     // radio/dashed borders

  // Status backgrounds — darkened tints
  successBg: '#052E16',
  successBgAlt: '#064E3B',
  errorBg: '#450A0A',
  warningBg: '#1C1506',
  warningBgAlt: '#1C1203',
  infoBg: '#172554',
  pendingBg: '#1C1003',

  // Status text/icon — slightly brightened for dark bg
  success: '#34D399',
  successAlt: '#10B981',
  error: '#F87171',
  errorAlt: '#FC8181',
  warning: '#FBBF24',
  warningAlt: '#F59E0B',
  info: '#60A5FA',
  amber: '#FBBF24',
  amberWarning: '#F59E0B',        // warning accent for min charge alert

  // Overlays — heavier on dark
  overlay: 'rgba(0,0,0,0.7)',
  overlayLight: 'rgba(0,0,0,0.5)',

  // Borders (extra)
  borderLighter: '#1E293B',
  borderMedium: '#475569',

  // Text (extra)
  textPlaceholder: '#64748B',

  // Stars / ratings
  starYellow: '#FBBF24',

  // Error extra
  errorLight: '#450A0A',

  // Disabled
  disabled: '#475569',
  disabledBg: '#1E293B',
} as const;

export type ColorsType = typeof Colors;
