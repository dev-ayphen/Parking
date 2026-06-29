/**
 * Centralized status / risk → Tailwind class maps.
 *
 * These were previously copy-pasted as inline objects across spaces, bookings,
 * payments, subscriptions, and users pages. Import from here so a colour change
 * happens in one place and badges stay consistent across the admin app.
 */

const FALLBACK = 'bg-gray-100 text-gray-700';

/** User account status (matches the listing API's display status). */
export const USER_STATUS_STYLES: Record<string, string> = {
  Active: 'bg-emerald-50 text-emerald-700',
  Inactive: 'bg-gray-100 text-gray-700',
  Suspended: 'bg-rose-50 text-rose-700',
  Banned: 'bg-gray-900 text-white',
  Deleted: 'bg-red-100 text-red-700',
};

/** Booking lifecycle status. */
export const BOOKING_STATUS_STYLES: Record<string, string> = {
  Completed: 'bg-emerald-50 text-emerald-700',
  Active: 'bg-indigo-50 text-indigo-700',
  Approved: 'bg-blue-50 text-blue-700',
  Pending: 'bg-amber-50 text-amber-700',
  Cancelled: 'bg-rose-50 text-rose-700',
  Rejected: 'bg-rose-50 text-rose-700',
  Expired: 'bg-gray-100 text-gray-700',
};

/** Payment / transaction status. */
export const PAYMENT_STATUS_STYLES: Record<string, string> = {
  SUCCESS: 'bg-emerald-50 text-emerald-700',
  PENDING: 'bg-amber-50 text-amber-700',
  FAILED: 'bg-rose-50 text-rose-700',
};

/** Space risk level. */
export const RISK_STYLES: Record<string, string> = {
  LOW: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
  HIGH: 'bg-rose-50 text-rose-700 border-rose-200',
};

/** Space approval status. */
export const SPACE_STATUS_STYLES: Record<string, string> = {
  APPROVED: 'bg-emerald-50 text-emerald-700',
  PENDING: 'bg-amber-50 text-amber-700',
  REJECTED: 'bg-rose-50 text-rose-700',
  BLOCKED: 'bg-gray-900 text-white',
};

/** Look up a style from a map with a safe gray fallback. */
export const styleFor = (map: Record<string, string>, key: string | null | undefined): string =>
  (key && map[key]) || FALLBACK;
