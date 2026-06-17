import { create } from 'zustand';

// ── Bar priority (higher = wins when multiple states are true) ────────────────
// PARKER                       OWNER
//  6  session_ending           5  owner_session_ending
//  5  session_active           4  owner_session_active
//  4  arrived_otp_ready        3  parker_at_gate
//  3  booking_approved         2  parker_en_route
//  2  booking_pending          1  new_request
//  1  rating_pending

export type BarVariant =
  // Parker stages
  | 'booking_pending'     // PENDING_APPROVAL — awaiting owner
  | 'booking_approved'    // APPROVED — head over
  | 'arrived_otp_ready'   // Marked arrived, OTP visible
  | 'session_active'      // ACTIVE — parked
  | 'session_ending'      // ACTIVE + < 15 min left
  | 'rating_pending'      // COMPLETED — not yet rated
  // Owner stages
  | 'new_request'         // PENDING_APPROVAL — new incoming
  | 'parker_en_route'     // APPROVED — parker coming
  | 'parker_at_gate'      // Parker arrived, OTP not yet verified
  | 'owner_session_active'// ACTIVE — session running
  | 'owner_session_ending'// ACTIVE + < 15 min left
  | null;

export interface BarData {
  variant: BarVariant;
  bookingId: string | null;
  spaceName: string;
  vehiclePlate: string;
  // Countdown target (ISO string) — for pending countdown & session remaining
  expiresAt: string | null;
  // Session end time (ISO string)
  endsAt: string | null;
  // OTP shown to parker on active-session screen
  otp: string | null;
  // ETA text (owner sees "ETA 20 min")
  etaText: string | null;
}

const PRIORITY: Record<NonNullable<BarVariant>, number> = {
  session_ending:        6,
  session_active:        5,
  arrived_otp_ready:     4,
  booking_approved:      3,
  booking_pending:       2,
  rating_pending:        1,
  owner_session_ending:  5,
  owner_session_active:  4,
  parker_at_gate:        3,
  parker_en_route:       2,
  new_request:           1,
};

const EMPTY: BarData = {
  variant: null,
  bookingId: null,
  spaceName: '',
  vehiclePlate: '',
  expiresAt: null,
  endsAt: null,
  otp: null,
  etaText: null,
};

interface SessionBarState extends BarData {
  // Routes where the bar should be suppressed (the screen IS the action)
  suppressedRoutes: string[];
  currentRoute: string;

  setBar: (data: Partial<BarData>) => void;
  clearBar: () => void;
  setRoute: (route: string) => void;
  setSuppressedRoutes: (routes: string[]) => void;
  // Attempt to update bar — only replaces if new priority >= existing priority
  updateBar: (data: Partial<BarData>) => void;
}

export const useSessionBarStore = create<SessionBarState>((set, get) => ({
  ...EMPTY,
  suppressedRoutes: [],
  currentRoute: '',

  setBar: (data) => set({ ...EMPTY, ...data }),

  clearBar: () => set(EMPTY),

  setRoute: (route) => set({ currentRoute: route }),

  setSuppressedRoutes: (routes) => set({ suppressedRoutes: routes }),

  updateBar: (data) => {
    const current = get();
    const currentPriority = current.variant ? (PRIORITY[current.variant] ?? 0) : 0;
    const newPriority = data.variant ? (PRIORITY[data.variant] ?? 0) : 0;
    if (newPriority >= currentPriority) {
      set({ ...EMPTY, ...data });
    }
  },
}));
