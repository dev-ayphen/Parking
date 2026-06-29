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
 * DarkColors — neutral dark palette matching Uber / Zomato / Spotify production standard.
 *
 * Design principles:
 *   1. NEUTRAL grays (no blue tint) — brand pink pops cleanly on neutral dark
 *   2. Three clear depth levels: base (#111) → card (#1C1C1E) → elevated (#2C2C2E)
 *   3. Text hierarchy: bright white → medium gray → dim gray
 *   4. Status colors vivid enough to read without bg tints fighting the theme
 *   5. Borders barely-visible hairlines — depth via bg contrast, not heavy lines
 */
export const DarkColors = {
  // Brand — unchanged
  primary: '#DC0159',
  primaryLight: '#FF4D8F',
  primaryDark: '#A8003F',
  primaryGradient: '#FF3D7F',
  primaryBg: '#2A0015',       // very dark wine — visible but not garish
  primaryBgLight: '#1F000F',

  // ── 3-level neutral depth (iOS/Android system dark standard) ─────
  // Level 0 — base screen background
  screenBg: '#111111',        // near-black neutral (Uber, Zomato base)
  // Level 1 — cards, headers, modals, drawers (clearly above base)
  white: '#1C1C1E',           // Apple system dark card — +11 stops from base
  // Level 2 — chips, badges, tab bars, inputs (topmost, pops off cards)
  surfaceBg: '#2C2C2E',       // Apple system elevated surface — +10 stops from card
  inputBg: '#252525',         // inputs — between card and elevated

  // Text — clean three-tier hierarchy
  textPrimary: '#F5F5F5',     // near-white — headings, key values (not harsh #FFF)
  textSecondary: '#ABABAB',   // medium gray — body, meta (Spotify body text)
  textMuted: '#636366',       // dim gray — placeholders, captions
  textDark: '#C7C7CC',        // light gray — icons, support text
  textBody: '#ABABAB',        // body paragraphs
  textAuth: '#F5F5F5',        // auth screen inputs

  // Borders — hairlines only, depth comes from bg contrast
  borderLight: '#2C2C2E',     // intra-card separators (same as surfaceBg — seamless)
  border: '#3A3A3C',          // standard card/input borders
  borderMuted: '#48484A',     // radio buttons, dashed borders

  // Status backgrounds — dark enough for dark mode, saturated enough to read
  successBg: '#0D2B1A',       // dark green tint
  successBgAlt: '#0A2416',
  errorBg: '#2B0D0D',         // dark red tint
  warningBg: '#2B1A00',       // dark amber tint
  warningBgAlt: '#241500',
  infoBg: '#0D1A2B',          // dark blue tint
  pendingBg: '#2B1800',       // dark orange tint

  // Status text/icon — vivid, WCAG AA on dark backgrounds
  success: '#30D158',         // Apple system green (vivid, not washed)
  successAlt: '#32D583',
  error: '#FF453A',           // Apple system red
  errorAlt: '#FF6961',
  warning: '#FFD60A',         // Apple system yellow
  warningAlt: '#FFCC00',
  info: '#0A84FF',            // Apple system blue
  amber: '#FFD60A',
  amberWarning: '#FFCC00',

  // Overlays
  overlay: 'rgba(0,0,0,0.75)',
  overlayLight: 'rgba(0,0,0,0.5)',

  // Borders (extra)
  borderLighter: '#2C2C2E',   // hairline within cards
  borderMedium: '#48484A',    // medium borders

  // Text (extra)
  textPlaceholder: '#636366',

  // Stars / ratings
  starYellow: '#FFD60A',

  // Error extra
  errorLight: '#2B0D0D',

  // Disabled
  disabled: '#48484A',
  disabledBg: '#1C1C1E',
} as const;

export type ColorsType = typeof Colors;
