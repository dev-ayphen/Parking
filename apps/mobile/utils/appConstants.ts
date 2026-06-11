import { Colors, ExtendedColors } from '../theme';

/**
 * Centralized app constants — status mappings, badges, labels
 * These are used across multiple screens and should be imported once
 * to avoid duplication and ensure consistency.
 */

// ─────────────────────────────────────────────────────────────────────
// BOOKING STATUS MAPPINGS
// ─────────────────────────────────────────────────────────────────────

export const BOOKING_STATUS_MAP: Record<string, string> = {
  PENDING_APPROVAL: 'Upcoming',
  APPROVED: 'Upcoming',
  ACTIVE: 'Upcoming',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  REJECTED: 'Cancelled',
  EXPIRED: 'Cancelled',
};

export const BOOKING_STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  PENDING_APPROVAL: { label: 'Waiting for approval', color: Colors.warning, bg: Colors.warningBgAlt },
  APPROVED: { label: 'Approved', color: Colors.success, bg: Colors.successBg },
  ACTIVE: { label: 'Active session', color: ExtendedColors.activeBlueText, bg: ExtendedColors.activeBlueBg },
  COMPLETED: { label: 'Completed', color: Colors.textBody, bg: Colors.surfaceBg },
  CANCELLED: { label: 'Cancelled', color: Colors.error, bg: Colors.errorBg },
  REJECTED: { label: 'Rejected', color: Colors.error, bg: Colors.errorBg },
  EXPIRED: { label: 'Expired', color: Colors.textSecondary, bg: Colors.surfaceBg },
};

// ─────────────────────────────────────────────────────────────────────
// SUPPORT TICKET STATUS MAPPINGS
// ─────────────────────────────────────────────────────────────────────

export const SUPPORT_TABS = ['All', 'Open', 'Resolved'];

export const SUPPORT_STATUS_DISPLAY: Record<string, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  WAITING_FOR_USER: 'Waiting for you',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

export const SUPPORT_CATEGORY_LABELS: Record<string, string> = {
  BOOKING: 'Booking Issue',
  SPACE_OWNER: 'Space Owner Support',
  SUBSCRIPTION: 'Subscription Issue',
  ACCOUNT: 'Account Help',
  TECHNICAL: 'Technical Problem',
  OTHER: 'Other',
};

// ─────────────────────────────────────────────────────────────────────
// BOOKING REQUEST STATUS MAPPINGS
// ─────────────────────────────────────────────────────────────────────

export const REQUEST_STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  PENDING_APPROVAL: { label: 'Pending', color: Colors.warning, bg: Colors.warningBgAlt },
  APPROVED: { label: 'Approved', color: Colors.success, bg: Colors.successBg },
  REJECTED: { label: 'Rejected', color: Colors.error, bg: Colors.errorBg },
  ACTIVE: { label: 'Active', color: ExtendedColors.activeBlueText, bg: ExtendedColors.activeBlueBg },
  COMPLETED: { label: 'Completed', color: Colors.textBody, bg: Colors.surfaceBg },
  CANCELLED: { label: 'Cancelled', color: Colors.error, bg: Colors.errorBg },
};

// ─────────────────────────────────────────────────────────────────────
// SPACE STATUS TABS
// ─────────────────────────────────────────────────────────────────────

export const SPACE_TABS = ['Active', 'Pending', 'Rejected'];

export const TAB_STATUSES: Record<string, string[]> = {
  Active: ['VERIFIED'],
  Pending: ['PENDING'],
  Rejected: ['REJECTED', 'BLOCKED'],
};

// ─────────────────────────────────────────────────────────────────────
// NOTIFICATION TYPE MAPPINGS
// ─────────────────────────────────────────────────────────────────────

export const NOTIFICATION_TYPE_MAP: Record<string, string> = {
  BOOKING_APPROVED: 'Booking Approved',
  BOOKING_REJECTED: 'Booking Rejected',
  BOOKING_CANCELLED: 'Booking Cancelled',
  SESSION_STARTED: 'Session Started',
  SESSION_ENDED: 'Session Ended',
  PAYMENT_RECEIVED: 'Payment Received',
  SPACE_VERIFIED: 'Space Verified',
  SPACE_REJECTED: 'Space Rejected',
  SUPPORT_REPLY: 'Support Reply',
  SYSTEM_ALERT: 'System Alert',
};

// ─────────────────────────────────────────────────────────────────────
// PRESET VALUES FOR QUICK SELECTION
// ─────────────────────────────────────────────────────────────────────

export const DURATION_PRESETS = [1, 2, 4, 8, 12, 24]; // hours
export const ARRIVAL_PRESETS = [10, 20, 30, 60]; // minutes
export const ETA_PRESETS = [10, 20, 30, 45, 60]; // minutes
export const RADIUS_OPTIONS = [1, 3, 5, 10]; // kilometers
export const DEFAULT_RADIUS_KM = 5;

// ─────────────────────────────────────────────────────────────────────
// EMPTY STATE DEFAULTS
// ─────────────────────────────────────────────────────────────────────

export const EMPTY_DASHBOARD = {
  stats: { totalBookings: 0, totalSpaces: 0, totalEarnings: 0 },
  requests: [],
  activeSessions: [],
  subscriptionStatus: 'free',
};

// ─────────────────────────────────────────────────────────────────────
// SUPPORT MODAL STATUSES
// Statuses that should show a quick modal instead of full screen
// ─────────────────────────────────────────────────────────────────────

export const MODAL_STATUSES = ['Expired', 'Rejected', 'Cancelled'];
