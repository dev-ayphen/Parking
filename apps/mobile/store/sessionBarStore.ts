import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Priority table ────────────────────────────────────────────────────────────
// Higher number = shown first when several states overlap. With stacking, the
// list is sorted by this; the top of the stack is the highest-priority bar.
// PARKER                         OWNER
//  6  session_ending             6  owner_session_leaving
//  5  session_active             5  owner_session_ending
//  4  arrived_otp_ready          4  owner_session_active
//  3  booking_approved           3  parker_at_gate
//  2  booking_pending            2  parker_en_route
//  1  rating_pending             1  new_request

export type BarVariant =
  | 'booking_pending'      // Parker: PENDING_APPROVAL
  | 'booking_approved'     // Parker: APPROVED, not yet arrived
  | 'arrived_otp_ready'    // Parker: APPROVED + OTP generated, heading over
  | 'session_active'       // Parker: ACTIVE
  | 'session_ending'       // Parker: ACTIVE + < 15 min left
  | 'session_leaving'      // Parker: tapped "I'm leaving" — awaiting owner exit
  | 'rating_pending'       // Parker: COMPLETED, no rating yet
  | 'new_request'          // Owner:  PENDING_APPROVAL incoming
  | 'parker_en_route'      // Owner:  APPROVED, parker coming
  | 'parker_at_gate'       // Owner:  Parker arrived, OTP pending
  | 'owner_session_active' // Owner:  ACTIVE session running
  | 'owner_session_ending' // Owner:  ACTIVE + < 15 min left
  | 'owner_session_leaving';// Owner: parker tapped "I'm leaving" — confirm exit

export interface BarData {
  variant: BarVariant;
  bookingId: string | null;
  // Display strings — computed from real API, never hardcoded
  spaceName: string;
  vehiclePlate: string;
  parkerName: string;     // full name of the parker (owner-side)
  amount: number | null;  // booking amount for new_request bar
  durationHours: number | null;
  // Countdown: ISO string for the 2-min approval window expiry
  expiresAt: string | null;
  // Session end: ISO string computed from sessionStartedAt + duration
  endsAtISO: string | null;
  // OTP — from GET /bookings/:id/otp or booking.sessionOtp
  otp: string | null;
  // ETA for owner view
  etaText: string | null;
}

/**
 * A bar entry in the stack. `source` identifies WHO produced it (parker booking
 * flow vs owner dashboard) so re-syncs replace the right entry instead of
 * clobbering an unrelated role's bar. `id` is the stable identity used for
 * dismissal + de-dupe (variant+bookingId).
 */
export interface BarEntry extends BarData {
  id: string;        // `${variant}:${bookingId}` — stable per concrete bar
  source: string;    // 'parker' | 'owner' — which sync owns this entry
}

export type BarSource = 'parker' | 'owner';

const PRIORITY: Record<NonNullable<BarVariant>, number> = {
  session_leaving:       7,
  session_ending:        6,
  session_active:        5,
  arrived_otp_ready:     4,
  booking_approved:      3,
  booking_pending:       2,
  rating_pending:        1,
  owner_session_leaving: 6,
  owner_session_ending:  5,
  owner_session_active:  4,
  parker_at_gate:        3,
  parker_en_route:       2,
  new_request:           1,
};

export function barPriority(variant: BarVariant | null): number {
  return variant ? (PRIORITY[variant] ?? 0) : 0;
}

/** Only the post-session "rate your stay" bar may be dismissed by the user. */
export function isDismissible(variant: BarVariant | null): boolean {
  // Informational end-states the user can close once seen.
  return variant === 'rating_pending';
}

/**
 * Non-actionable bars: tapping them does NOTHING (no navigation). They only
 * inform the user a state happened. Currently none — every live bar deep-links
 * to a screen — but the guard stays so future status-only bars don't navigate.
 */
export function isInformational(variant: BarVariant | null): boolean {
  return false;
}

export const EMPTY_BAR: BarData = {
  variant: 'booking_pending', // placeholder; never used directly
  bookingId: null,
  spaceName: '',
  vehiclePlate: '',
  parkerName: '',
  amount: null,
  durationHours: null,
  expiresAt: null,
  endsAtISO: null,
  otp: null,
  etaText: null,
};

function entryId(variant: BarVariant, bookingId: string | null): string {
  return `${variant}:${bookingId ?? 'none'}`;
}

/** Shallow-equal two bar entries on the display-relevant fields (dedupe / no-flicker). */
function sameEntry(a: BarEntry, b: BarEntry): boolean {
  return (
    a.variant === b.variant &&
    a.bookingId === b.bookingId &&
    a.spaceName === b.spaceName &&
    a.vehiclePlate === b.vehiclePlate &&
    a.parkerName === b.parkerName &&
    a.amount === b.amount &&
    a.durationHours === b.durationHours &&
    a.expiresAt === b.expiresAt &&
    a.endsAtISO === b.endsAtISO &&
    a.otp === b.otp &&
    a.etaText === b.etaText
  );
}

interface SessionBarState {
  bars: BarEntry[];          // sorted, highest priority first
  dismissedIds: string[];    // ids the user explicitly closed (rating_pending only)

  /**
   * Replace ALL bars owned by `source` with the given set in one shot.
   * Each screen sync computes its full picture and calls this; entries from
   * OTHER sources are left untouched, so a parker's active session and an
   * owner's incoming request coexist. No-op if nothing actually changed.
   */
  setBarsForSource: (source: BarSource, bars: Array<Partial<BarData> & { variant: BarVariant }>) => void;

  /** Convenience: set a single bar for a source (or clear if null). */
  setBarForSource: (source: BarSource, bar: (Partial<BarData> & { variant: BarVariant }) | null) => void;

  /** Remove every bar owned by `source` (e.g. role has nothing active). */
  clearSource: (source: BarSource) => void;

  /** Wipe ALL bars + dismissed history. Called on logout so a signed-out user
   *  (or the next person on the device) never sees the previous user's bar. */
  clearAll: () => void;

  /** User explicitly closed a (dismissible) bar. */
  dismiss: (id: string) => void;

  /** Drop bars whose countdown has fully expired (so we never show "0:00" forever). */
  pruneExpired: () => void;
}

function buildEntry(source: BarSource, bar: Partial<BarData> & { variant: BarVariant }): BarEntry {
  const merged = { ...EMPTY_BAR, ...bar } as BarData;
  return {
    ...merged,
    id: entryId(merged.variant, merged.bookingId),
    source,
  };
}

function sortBars(bars: BarEntry[]): BarEntry[] {
  return [...bars].sort((a, b) => barPriority(b.variant) - barPriority(a.variant));
}

export const useSessionBarStore = create<SessionBarState>()(
  persist(
    (set, get) => ({
      bars: [],
      dismissedIds: [],

      setBarsForSource: (source, incoming) => {
        const cur = get();
        const others = cur.bars.filter((b) => b.source !== source);
        const built = incoming
          .map((b) => buildEntry(source, b))
          // Honour user dismissals (rating_pending the user closed stays gone).
          .filter((b) => !cur.dismissedIds.includes(b.id));
        const next = sortBars([...others, ...built]);

        // Dedupe / no-flicker: bail if the visible set is identical.
        if (
          next.length === cur.bars.length &&
          next.every((b, i) => sameEntry(b, cur.bars[i]))
        ) {
          return;
        }
        set({ bars: next });
      },

      setBarForSource: (source, bar) => {
        get().setBarsForSource(source, bar ? [bar] : []);
      },

      clearSource: (source) => {
        const cur = get();
        if (!cur.bars.some((b) => b.source === source)) return;
        set({ bars: cur.bars.filter((b) => b.source !== source) });
      },

      // Keep dismissedIds across logout so a dismissed rating banner never
      // reappears after the user signs back in to the same account.
      clearAll: () => set((cur) => ({ bars: [], dismissedIds: cur.dismissedIds })),

      dismiss: (id) => {
        const cur = get();
        set({
          bars: cur.bars.filter((b) => b.id !== id),
          dismissedIds: cur.dismissedIds.includes(id)
            ? cur.dismissedIds
            : [...cur.dismissedIds, id].slice(-20), // cap the memory
        });
      },

      pruneExpired: () => {
        const cur = get();
        const now = Date.now();
        const kept = cur.bars.filter((b) => {
          // Approval-window bars die when the window closes (no replacement bar —
          // the inbox notification covers the expired/rejected case).
          if ((b.variant === 'booking_pending' || b.variant === 'new_request') && b.expiresAt) {
            return new Date(b.expiresAt).getTime() > now;
          }
          return true;
        });
        if (kept.length !== cur.bars.length) set({ bars: kept });
      },
    }),
    {
      name: 'session-bar',
      storage: createJSONStorage(() => AsyncStorage),
      // Persist the bars + dismissals so the strip is present immediately on a
      // cold start, before the first API sync re-derives the truth.
      // SECURITY: the arrival OTP must NOT be written to disk — strip it from every
      // persisted bar. It's re-fetched from the API on the next sync, so the live
      // bar still shows it; it just never sits in AsyncStorage.
      partialize: (s) => ({
        bars: s.bars.map((b) => ({ ...b, otp: null })),
        dismissedIds: s.dismissedIds,
      }),
    },
  ),
);

// ── Shared helpers (used by multiple screens) ─────────────────────────────────
export const APPROVAL_WINDOW_MS = 120_000; // 2 minutes

/** Compute ISO end-time from sessionStartedAt + duration (hours). */
export function computeEndsAtISO(
  sessionStartedAt: string | null | undefined,
  eta: string | null | undefined,
  createdAt: string | null | undefined,
  durationHours: number,
): string {
  const startMs = sessionStartedAt
    ? new Date(sessionStartedAt).getTime()
    : eta
    ? new Date(eta).getTime()
    : createdAt
    ? new Date(createdAt).getTime()
    : Date.now();
  return new Date(startMs + durationHours * 3_600_000).toISOString();
}

/** Compute ISO expiry for the 2-min approval window. */
export function computeExpiresAt(createdAt: string): string {
  return new Date(new Date(createdAt).getTime() + APPROVAL_WINDOW_MS).toISOString();
}

/** Minutes left until an ISO timestamp. Returns null if no timestamp. */
export function minsUntil(isoStr: string | null | undefined): number | null {
  if (!isoStr) return null;
  return Math.max(0, Math.floor((new Date(isoStr).getTime() - Date.now()) / 60_000));
}
