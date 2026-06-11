/**
 * Color Palette - Centralized Color Definitions
 * Used by theme system for both light and dark modes
 */

export const ColorPalette = {
  // Primary Brand Colors
  primary: {
    main: '#DC0159',      // Main pink
    dark: '#A8003F',      // Dark pink for hover/active
    light: '#FF006B',     // Lighter pink for variants
    lighter: '#FFF5FA',   // Very light pink background
  },

  // Accent Colors
  accent: {
    indigo: '#6366F1',    // Indigo accent
    blue: '#3B82F6',      // Blue (future use)
  },

  // Neutral/Gray Scale (Light to Dark)
  neutral: {
    50: '#F9FAFB',        // Lightest
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#E2E8F0',       // Light borders
    400: '#CBD5E1',
    500: '#94A3B8',       // Light text
    600: '#64748B',       // Secondary text
    700: '#475569',       // Muted text
    800: '#1E293B',       // Dark text
    900: '#0F172A',       // Very dark (headings)
  },

  // Semantic Colors
  status: {
    success: '#22C55E',   // Green
    error: '#EF4444',     // Red
    warning: '#F59E0B',   // Amber
    info: '#3B82F6',      // Blue
  },

  // Special
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

/**
 * Light Theme Configuration
 */
export const LightTheme = {
  // Primary Colors
  primary: ColorPalette.primary.main,
  primaryDark: ColorPalette.primary.dark,
  primaryLight: ColorPalette.primary.light,

  // Accent
  accent: ColorPalette.accent.indigo,

  // Backgrounds
  background: {
    primary: ColorPalette.white,           // Main background
    secondary: ColorPalette.neutral[50],   // Secondary background
    tertiary: ColorPalette.neutral[100],   // Tertiary background
  },

  // Text Colors
  text: {
    primary: ColorPalette.neutral[900],    // Main text
    secondary: ColorPalette.neutral[600],  // Secondary text
    tertiary: ColorPalette.neutral[500],   // Tertiary text
    muted: ColorPalette.neutral[400],      // Muted text
    light: ColorPalette.neutral[300],      // Light text (on dark bg)
  },

  // Borders
  border: {
    primary: ColorPalette.neutral[300],    // Main border
    secondary: ColorPalette.neutral[200],  // Secondary border
    light: ColorPalette.neutral[100],      // Light border
  },

  // Input/Form
  input: {
    background: ColorPalette.neutral[50],
    border: ColorPalette.neutral[300],
    placeholder: ColorPalette.neutral[400],
    text: ColorPalette.neutral[900],
  },

  // Surface (Cards, Dialogs)
  surface: {
    primary: ColorPalette.white,
    secondary: ColorPalette.neutral[50],
  },

  // Status Colors
  success: ColorPalette.status.success,
  error: ColorPalette.status.error,
  warning: ColorPalette.status.warning,
  info: ColorPalette.status.info,

  // Shadows (Light theme - subtle)
  shadow: {
    light: 'rgba(0, 0, 0, 0.04)',
    medium: 'rgba(0, 0, 0, 0.08)',
    heavy: 'rgba(0, 0, 0, 0.12)',
  },

  // Disabled/Inactive States
  disabled: {
    background: ColorPalette.neutral[100],
    text: ColorPalette.neutral[400],
    border: ColorPalette.neutral[200],
  },

  // Overlay/Backdrop
  overlay: {
    light: 'rgba(0, 0, 0, 0.3)',
    medium: 'rgba(0, 0, 0, 0.5)',
    dark: 'rgba(0, 0, 0, 0.7)',
  },

  // Space Type Risk Levels (Compliance)
  riskLevel: {
    low: '#22C55E',        // 🟢 Green - Verified private parking
    medium: '#F59E0B',     // 🟡 Yellow - Semi-open/shared area
    high: '#EF4444',       // 🔴 Red - Open roadside/public
  },

  // Booking Status Colors
  bookingStatus: {
    pending: '#F59E0B',     // 🟡 Yellow - Pending approval
    approved: '#3B82F6',    // 🔵 Blue - Approved
    active: '#10B981',      // 🟢 Green - Active/in use
    completed: '#22C55E',   // 🟢 Green - Completed
    cancelled: '#EF4444',   // 🔴 Red - Cancelled
    rejected: '#EF4444',    // 🔴 Red - Rejected
  },

  // Rating Colors
  rating: {
    star: '#FBBF24',        // ⭐ Gold
    unrated: ColorPalette.neutral[300],
  },

  // Availability Colors
  availability: {
    available: '#10B981',   // 🟢 Green - Available
    partial: '#F59E0B',     // 🟡 Yellow - Partially available
    full: '#EF4444',        // 🔴 Red - Full/Booked
  },

  // Utility Colors
  white: ColorPalette.white,
  black: ColorPalette.black,
} as const;

/**
 * Dark Theme Configuration
 */
export const DarkTheme = {
  // Primary Colors (adjusted for dark mode)
  primary: ColorPalette.primary.main,      // Keep pink same
  primaryDark: ColorPalette.primary.dark,
  primaryLight: ColorPalette.primary.light,

  // Accent
  accent: '#818CF8',                         // Lighter indigo for dark mode

  // Backgrounds
  background: {
    primary: '#0F172A',                     // Very dark background
    secondary: '#1E293B',                   // Dark secondary
    tertiary: '#334155',                    // Slightly lighter dark
  },

  // Text Colors (inverted)
  text: {
    primary: '#F9FAFB',                     // Light text
    secondary: '#CBD5E1',                   // Light gray text
    tertiary: '#94A3B8',                    // Medium gray text
    muted: '#64748B',                       // Muted text
    light: '#475569',                       // For accents
  },

  // Borders
  border: {
    primary: '#334155',                     // Dark border
    secondary: '#1E293B',                   // Darker border
    light: '#0F172A',                       // Very dark border
  },

  // Input/Form (Dark mode)
  input: {
    background: '#1E293B',
    border: '#334155',
    placeholder: '#64748B',
    text: '#F9FAFB',
  },

  // Surface (Cards, Dialogs)
  surface: {
    primary: '#1E293B',
    secondary: '#0F172A',
  },

  // Status Colors (adjusted for dark mode)
  success: '#10B981',                       // Adjusted green
  error: '#F87171',                         // Adjusted red
  warning: '#FBBF24',                       // Adjusted amber
  info: '#60A5FA',                          // Adjusted blue

  // Shadows (Dark theme - stronger)
  shadow: {
    light: 'rgba(0, 0, 0, 0.20)',
    medium: 'rgba(0, 0, 0, 0.40)',
    heavy: 'rgba(0, 0, 0, 0.60)',
  },

  // Disabled/Inactive States
  disabled: {
    background: '#334155',
    text: '#64748B',
    border: '#1E293B',
  },

  // Overlay/Backdrop
  overlay: {
    light: 'rgba(0, 0, 0, 0.4)',
    medium: 'rgba(0, 0, 0, 0.6)',
    dark: 'rgba(0, 0, 0, 0.8)',
  },

  // Space Type Risk Levels (Dark mode adjusted)
  riskLevel: {
    low: '#10B981',        // 🟢 Green - Verified private parking
    medium: '#FBBF24',     // 🟡 Yellow - Semi-open/shared area
    high: '#F87171',       // 🔴 Red - Open roadside/public
  },

  // Booking Status Colors (Dark mode adjusted)
  bookingStatus: {
    pending: '#FBBF24',     // 🟡 Yellow - Pending approval
    approved: '#60A5FA',    // 🔵 Blue - Approved
    active: '#10B981',      // 🟢 Green - Active/in use
    completed: '#10B981',   // 🟢 Green - Completed
    cancelled: '#F87171',   // 🔴 Red - Cancelled
    rejected: '#F87171',    // 🔴 Red - Rejected
  },

  // Rating Colors (Dark mode)
  rating: {
    star: '#FBBF24',        // ⭐ Gold (same in dark)
    unrated: '#475569',
  },

  // Availability Colors (Dark mode adjusted)
  availability: {
    available: '#10B981',   // 🟢 Green - Available
    partial: '#FBBF24',     // 🟡 Yellow - Partially available
    full: '#F87171',        // 🔴 Red - Full/Booked
  },

  // Utility Colors
  white: ColorPalette.white,
  black: ColorPalette.black,
} as const;

/**
 * Spacing Scale
 * Audit-verified: most used values across all 50+ screens
 */
export const Spacing = {
  hairline: 1,  // divider borders, thin separators (~79 uses)
  micro: 2,     // mini separators, dot margins (~68 uses)
  xs: 4,        // tight spacing — badge padding, dot gaps (~20 uses)
  sm: 6,        // icon gaps, small chip gaps, notification dots (~70 uses)
  md: 8,        // small elements — chip padding (~40 uses)
  lg: 10,       // tab paddingVertical, badge paddingHorizontal (~99 uses)
  xl: 12,       // standard small padding — card inner, badge horizontal (~45 uses)
  '2xl': 14,    // button paddingVertical, input padding (~104 uses — most common button spacing)
  '3xl': 16,    // most common card padding (~95 uses)
  screenH: 20,  // standard screen horizontal padding (~60 uses)
  '4xl': 24,    // section padding — invoice card, wide content (~35 uses)
  '5xl': 28,    // section spacing (~11 uses)
  '6xl': 32,    // large gaps — auth section separation
  '7xl': 40,    // bottom padding, footer heights (~24 uses)
} as const;

/**
 * Font Sizes
 * Audit-verified: every size actually used across all screens
 */
export const FontSize = {
  tiny: 8,      // notification bell badge text
  micro: 9,     // active badge, vehicle type badge, risk badge
  nano: 10,     // nav tab text, footer price label, smallest overlays
  xs: 11,       // smallest metadata — vehicle type, legend, stat labels (~35 uses)
  sm: 12,       // captions, timestamps, badge text (~75 uses — most common label size)
  base: 13,     // secondary body text, helper text, notification body (~60 uses)
  md: 14,       // standard body text — list items, descriptions (~65 uses)
  lg: 15,       // card titles, action button text, primary body (~50 uses)
  xl: 16,       // section headings, input text, most CTA button text (~60 uses)
  '2xl': 18,    // page/screen titles, primary section headings (~30 uses)
  '3xl': 20,    // modal titles, prices inline, hero values (~15 uses)
  '4xl': 24,    // section headings large, success title, receipt total (~12 uses)
  '5xl': 26,    // subscription price, add-space step heading
  '6xl': 28,    // add-space step heading, ActionCard
  '7xl': 32,    // wallet balance, OTP code display
  '8xl': 34,    // complete-profile screen title
  '9xl': 36,    // countdown timer
  '10xl': 38,   // auth/login title, session stat countdown
  '11xl': 40,   // auth screen titles (login, OTP)
  '12xl': 44,   // OTP display code in active-session
} as const;

/**
 * Font Weights
 * Audit-verified: every weight actually used across all screens
 */
export const FontWeight = {
  normal: '400' as const,    // body paragraphs (Terms/Privacy, analytics)
  medium: '500' as const,    // secondary body, meta info, input text
  semibold: '600' as const,  // sub-headings, secondary buttons, labels (~90 uses)
  bold: '700' as const,      // most button labels, card headings, field values (~175 uses)
  boldAlias: 'bold' as const,// non-numeric 'bold' alias (bell badge, ProHeader — 2 uses)
  extrabold: '800' as const, // screen titles, prices, primary headings (~110 uses)
  black: '900' as const,     // logo text "ParkSwift" only
} as const;

/**
 * Border Radius Scale
 * Audit-verified: every radius actually used across all screens
 */
export const BorderRadius = {
  dot: 2,       // progress bar fill, handle pills, divider
  indicator: 3, // dot indicators, progress corners
  xs: 4,        // skeleton chips, stat placeholder, tiny badges
  risk: 5,      // risk badge inline, verified badge inline
  badge: 6,     // small badges, card icon corners, status badge (~12 uses)
  bell: 7,      // ProHeader bell badge
  sm: 8,        // status badges, filter chips, category chips (~25 uses)
  input: 10,    // category icons, dropdown corners, small chips (~33 uses)
  md: 12,       // input fields, secondary buttons, small cards (~55 uses)
  button: 14,   // CTA buttons — most action buttons (~30 uses)
  lg: 16,       // standard cards — universal card corners (~95 uses)
  iconBtn: 18,  // icon circle buttons in modals
  circle: 19,   // icon circle buttons (38×38 → radius 19) (~20 uses)
  circleXl: 20, // slightly larger circle cards, modals (~18 uses)
  avatar: 22,   // circle avatars (44×44)
  xl: 24,       // modal bottom-sheet top corners, large cards (~8 uses)
  circleLg: 32, // large circle modal icon wraps
  circleXxl: 40, // extra-large empty state circles
  pill: 100,    // category chip full-round (pill shape)
  full: 999,    // fully round pill elements
} as const;

/**
 * Typography Presets
 * Audit-verified: real usage patterns across screens
 */
export const Typography = {
  // Screen / Page level
  screenTitle: { fontSize: FontSize['2xl'], fontWeight: FontWeight.bold },
  sectionHeading: { fontSize: FontSize.xl, fontWeight: FontWeight.bold },

  // Card level
  cardTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold },
  cardValue: { fontSize: FontSize.md, fontWeight: FontWeight.bold },

  // Body
  body: { fontSize: FontSize.md, fontWeight: FontWeight.normal },
  bodyBold: { fontSize: FontSize.md, fontWeight: FontWeight.bold },

  // Labels & Captions
  label: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  labelBold: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  caption: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },

  // Prices & Numbers
  price: { fontSize: FontSize['3xl'], fontWeight: FontWeight.bold },
  priceLarge: { fontSize: FontSize['4xl'], fontWeight: FontWeight.extrabold },

  // Buttons
  buttonText: { fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  buttonTextSm: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },

  // Legacy full objects (kept for compatibility)
  heading1: { fontSize: 32, fontWeight: '800' as const, lineHeight: 40, letterSpacing: -0.8 },
  heading2: { fontSize: 24, fontWeight: '700' as const, lineHeight: 32, letterSpacing: -0.5 },
  heading3: { fontSize: 20, fontWeight: '600' as const, lineHeight: 28, letterSpacing: -0.2 },
  bodySmall: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20, letterSpacing: 0 },
  captionSmall: { fontSize: 12, fontWeight: '600' as const, lineHeight: 16, letterSpacing: 0.5 },
} as const;

/**
 * Status / Semantic Color Tokens
 * Audit-verified: every status color + background tint used in the app
 */
export const StatusColors = {
  // Success
  success: '#16A34A',
  successAlt: '#10B981',
  successBg: '#F0FDF4',
  successBgAlt: '#ECFDF5',
  successDark: '#065F46',

  // Error / Danger
  error: '#DC2626',
  errorAlt: '#EF4444',
  errorBg: '#FEF2F2',
  errorDark: '#7F1D1D',

  // Warning / Amber
  warning: '#D97706',
  warningAlt: '#F59E0B',
  warningBg: '#FFFBEB',
  warningBgAlt: '#FEF3C7',
  warningDark: '#92400E',

  // Info / Blue
  info: '#3B82F6',
  infoBg: '#EFF6FF',

  // Pending / Orange
  pending: '#F97316',
  pendingBg: '#FFF7ED',

  // Approved / Green
  approved: '#16A34A',
  approvedBg: '#F0FDF4',

  // Cancelled / Red
  cancelled: '#DC2626',
  cancelledBg: '#FEF2F2',

  // Expired / Gray
  expired: '#64748B',
  expiredBg: '#F1F5F9',

  // Active / Teal
  active: '#10B981',
  activeBg: '#ECFDF5',

  // Leaving / Amber
  leaving: '#D97706',
  leavingBg: '#FFFBEB',

  // Completed
  completed: '#16A34A',
  completedBg: '#F0FDF4',
} as const;

/**
 * Shadow Tokens
 * Audit-verified: shadow patterns used across all cards
 */
export const Shadows = {
  feather: {                          // very light cards — FAQ, articles, ticket cards
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  thin: {                             // most common pattern — header cards, settings groups (~22 uses)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  card: {                             // standard cards
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardMd: {                           // medium cards
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardLg: {                           // large cards
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  invoice: {                          // invoice card, larger modals
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 5,
  },
  fab: {                              // FAB buttons, dropdown menus
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 8,
  },
  float: {                            // floating circle buttons on map
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  filterSheet: {                      // filter bottom sheet
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 10,
  },
  button: {                           // primary CTA buttons
    shadowColor: '#DC0159',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  bottomSheet: {                      // bottom sheets, space card
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
  },
} as const;

/**
 * Extended Colors
 * Audit-verified: every color used in screens not already in ColorPalette / Colors
 */
export const ExtendedColors = {
  // Indigo / Violet family (find-space, search, amenity badges)
  indigoBg: '#EEF2FF',        // search chip bg, amenity badge bg, radius button
  indigoTint: '#E0E7FF',      // amenity badge border, analytics text
  indigoBorder: '#C7D2FE',    // search chip border
  indigoText: '#4F46E5',      // search chip text (indigo-600)
  indigoAccent: '#6366F1',    // radius button active, search chip icon (indigo-500)

  // Sky Blue family (ACTIVE booking status)
  activeBlueBg: '#E0F2FE',    // ACTIVE booking badge bg, booking-status hero
  activeBlueText: '#0284C7',  // ACTIVE booking badge text, notifications
  activeBlueDeep: '#0C4A6E',  // timestamp value deep text

  // Teal / Emerald
  teal: '#059669',             // phone icon, booking-confirm icon
  verifiedBg: '#EAF9F1',       // "Verified" badge background

  // Pink / Primary tints (backgrounds only)
  primaryTint1: '#FFF1F6',    // selected vehicle card, login bg, auth screens
  primaryTint2: '#FFF5F9',    // active gateway card bg (manage-billing)
  primaryTint3: '#FFF5F5',    // input error bg (edit-profile)
  primaryTint4: '#FFF0F5',    // stat icon wrapper (my-spaces)
  primaryBorder: '#FECDD3',   // OTP display border, price badge border
  primaryTextDeep: '#9F1239', // OTP label dark text
  primaryRed: '#E11D48',      // price badge unit text

  // Amber / Warning extended (add-space compliance banners)
  warningYellow: '#FEF9C3',   // warning banner bg (add-space, ticket rating)
  warningYellowBorder: '#FDE047', // warning border in compliance banners
  warningYellowBorderAlt: '#FDE68A', // MED RISK badge border
  warningDark: '#854D0E',     // warning dark text
  warningDeep: '#78350F',     // warning deepest text
  warningAmber: '#92400E',    // leaving banner text (amber-800)
  warningMid: '#A16207',      // history amber label text
  warningText: '#B45309',     // countdown, booking-success amber text
  warningStarBorder: '#FCD34D', // ticket rating banner border
  disabledPink: '#F3A0B5',    // disabled save button bg

  // Green extended
  greenTint: '#DCFCE7',       // completed status chip bg
  greenBorderLight: '#BBF7D0', // add-space success border, LOW RISK border
  greenBorderAlt: '#A7F3D0',  // invoice banner border
  greenBorderFine: '#86EFAC', // resolution note border
  greenBg: '#E6F4EA',         // Google-style available tint
  greenTextDeep: '#15803D',   // available status text
  greenTextDark: '#166534',   // resolution note text
  googleGreenDeep: '#137333', // Google-style available badge text (status chip)
  greenInvoice: '#065F46',    // invoice "Paid" deep emerald text (emerald-800)

  // Red / Rose extended
  redTint: '#FEE2E2',         // HIGH RISK badge bg
  redBorder: '#FECACA',       // HIGH RISK badge border
  redTextDeep: '#991B1B',     // HIGH RISK badge text
  redTextDeepest: '#7F1D1D',  // rejection reason body text (red-900)
  redTextMid: '#B91C1C',      // cancelled history text
  redOrange: '#C2410C',       // reason title text (orange-red)
  orange: '#F97316',          // reason box left accent (orange-500)
  redBg: '#FCE8E6',           // Google-style booked tint
  redTextGoogle: '#C5221F',   // Google-style booked text

  // Purple / Violet (WAITING_FOR_USER ticket status)
  purpleText: '#A855F7',      // waiting-for-user badge text (3 screens)
  purpleBg: '#FAF5FF',        // waiting-for-user badge bg
  purpleTint: '#F3E8FF',      // purple icon tint (analytics)
  purpleDeep: '#9333EA',      // analytics Profile Views icon (purple-600)

  // Blue extended
  blueDark: '#1E40AF',        // add-space info text dark
  blueDeep: '#1D4ED8',        // verify.tsx alert title
  blueTint: '#BFDBFE',        // add-space info box border
  blueIcon: '#0E9EE8',        // find-parking icon tint (HomeCard)
  skyBlue: '#0EA5E9',         // Find Parking HomeCard icon/illustration (sky-500)
  skyBlueAlpha12: 'rgba(14, 165, 233, 0.12)', // Find Parking icon bg tint
  skyBlueTint: '#F0F9FF',     // owner dashboard live-session card bg (sky-50)

  // Dark surfaces (used in light-mode screens)
  darkCard: '#1E293B',        // contact card, rating text, gradient stop
  darkGrad1: '#09090B',       // gradient (non-subscribed card)
  darkGrad2: '#18181B',       // gradient (non-subscribed card)
  darkGrad3: '#27272A',       // gradient (non-subscribed card)

  // Notification special
  unreadBg: '#FAFCFF',        // unread notification item background
  analyticsBg: '#EEF2F6',     // analytics/subscription icon wrapper bg

  // Payment gateway brand colors (manage-billing)
  razorpayBlue: '#3395FF',    // Razorpay brand blue
  stripePurple: '#635BFF',    // Stripe brand purple

  // Stars / Ratings
  starLegacy: '#FFB000',      // legacy star rating color
  starDark: '#EAB308',        // selected star in history

  // RGBA opacity tokens used as bg (not overlays)
  primaryAlpha03: 'rgba(220,1,89,0.03)',  // very subtle primary tint bg
  primaryAlpha05: 'rgba(220,1,89,0.05)',  // primary tint bg
  primaryAlpha10: 'rgba(220,1,89,0.1)',   // primary icon bg (My Space HomeCard)
  whiteAlpha10: 'rgba(255,255,255,0.1)',  // overlay text on dark gradient
  whiteAlpha20: 'rgba(255,255,255,0.2)',  // overlay on dark cards
  whiteAlpha40: 'rgba(255,255,255,0.4)',  // overlay on dark cards
  whiteAlpha70: 'rgba(255,255,255,0.7)',  // message timestamp on pink bubble
  whiteAlpha80: 'rgba(255,255,255,0.8)',  // light overlay
  overlayHeavy: 'rgba(0,0,0,0.55)',       // modal overlay (heavier variant)
  overlayLight: 'rgba(0,0,0,0.45)',       // light modal overlay
  overlaySoft: 'rgba(0,0,0,0.05)',        // very soft card overlay
  successAlpha: 'rgba(16,185,129,0.15)',  // success icon bg tint
  darkOverlay: 'rgba(15,23,42,0.6)',      // dark overlay variant
} as const;

/**
 * Opacity Scale
 */
export const Opacity = {
  none: 0,
  low: 0.25,
  medium: 0.5,
  high: 0.75,
  full: 1,
} as const;

/**
 * Z-Index Scale
 */
export const ZIndex = {
  dropdown: 100,
  sticky: 200,
  fixed: 300,
  modal: 400,
  popover: 500,
  tooltip: 600,
} as const;

/**
 * Animation Timings (milliseconds)
 */
export const Animation = {
  fast: 150,
  normal: 300,
  slow: 500,
} as const;

// Type exports
export type ThemeType = typeof LightTheme;
export type ColorPaletteType = typeof ColorPalette;
export type TypographyType = typeof Typography;
export type BorderRadiusType = typeof BorderRadius;
export type OpacityType = typeof Opacity;
export type ZIndexType = typeof ZIndex;
export type AnimationType = typeof Animation;
export type SpacingType = typeof Spacing;
