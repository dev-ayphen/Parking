import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus, DeviceEventEmitter } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';

/**
 * App lifecycle / session-recovery hook. Mounted ONCE at the app root.
 *
 * Fixes three real-world gaps:
 *  1. Resume re-validation — when the app returns to the foreground after being
 *     backgrounded for a while, we re-validate the session (refreshProfile hits
 *     /users/me; a 401 there triggers the global auth:lost → login flow) and emit
 *     `app:resumed` so visible screens re-sync their data + the session bar. This
 *     also catches a server-side suspend/ban that happened while we were away.
 *  2. Proactive keep-alive — while foregrounded, ping /users/me on an interval so
 *     the access token is refreshed before it silently expires (the api layer
 *     auto-refreshes on any call), preventing an abrupt logout on the next tap
 *     after a long idle.
 *  3. Cold-start active-session deep-link — on launch, if the parker has an ACTIVE
 *     session, route straight to the active-session screen instead of dropping
 *     them on home with only a tappable bar.
 *
 * Everything here is best-effort and never blocks the UI.
 */

const RESUME_REVALIDATE_AFTER_MS = 60_000; // only re-validate if backgrounded ≥ 60s
const KEEPALIVE_INTERVAL_MS = 4 * 60_000;  // refresh session every 4 min while open

export function useAppLifecycle() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  const backgroundedAt = useRef<number | null>(null);
  const keepAliveTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  // Tracks whether we've already routed into the active session for the CURRENT
  // logged-in session. Reset whenever auth goes false→true (fresh login / re-login
  // after an expiry) so the user is taken back to their active session each time.
  const routedForAuth = useRef(false);
  const wasAuthed = useRef(false);

  // ── 1 + 2: AppState resume re-validation & keep-alive ──────────────────────
  useEffect(() => {
    const startKeepAlive = () => {
      if (keepAliveTimer.current) return;
      keepAliveTimer.current = setInterval(() => {
        if (useAuthStore.getState().isAuthenticated()) {
          // refreshProfile → /users/me runs through the api layer, which
          // auto-refreshes the access token if it's expiring. Keeps us fresh.
          refreshProfile().catch(() => undefined);
        }
      }, KEEPALIVE_INTERVAL_MS);
    };

    const stopKeepAlive = () => {
      if (keepAliveTimer.current) {
        clearInterval(keepAliveTimer.current);
        keepAliveTimer.current = null;
      }
    };

    const handleChange = (next: AppStateStatus) => {
      if (next === 'background' || next === 'inactive') {
        backgroundedAt.current = Date.now();
        stopKeepAlive();
        return;
      }

      if (next === 'active') {
        const wasBackgrounded = backgroundedAt.current;
        backgroundedAt.current = null;
        startKeepAlive();

        if (!useAuthStore.getState().isAuthenticated()) return;

        // Only do the heavier re-validate if we were away long enough to matter.
        const awayMs = wasBackgrounded ? Date.now() - wasBackgrounded : 0;
        if (awayMs >= RESUME_REVALIDATE_AFTER_MS) {
          // Re-validate the session; a 401 here bubbles to the global auth:lost.
          refreshProfile().catch(() => undefined);
          // Tell visible screens to re-sync (and the session bar to re-derive).
          DeviceEventEmitter.emit('app:resumed');
        }
      }
    };

    const sub = AppState.addEventListener('change', handleChange);
    // Kick off keep-alive immediately if we launch already foregrounded.
    if (AppState.currentState === 'active') startKeepAlive();

    return () => {
      sub.remove();
      stopKeepAlive();
    };
  }, [refreshProfile]);

  // ── 3: Deep-link into an active session on launch AND after (re)login ───────
  // Runs on cold start and whenever auth transitions false→true. The second case
  // is the recovery path: if the token expired DURING an active parking session
  // and the user logged back in, we route them straight back to their session
  // (which still exists server-side) instead of stranding them on home.
  const authed = isAuthenticated();
  useEffect(() => {
    if (!authed) {
      // Logged out / session lost — re-arm so the next login routes again.
      wasAuthed.current = false;
      routedForAuth.current = false;
      return;
    }

    const justAuthed = !wasAuthed.current;
    wasAuthed.current = true;
    if (routedForAuth.current && !justAuthed) return;
    routedForAuth.current = true;

    (async () => {
      try {
        const json = await api.get('/bookings/my?limit=10');
        const bookings: any[] = json?.bookings ?? [];
        const active = bookings.find((b: any) => b.status === 'ACTIVE');
        if (active?.id) {
          router.push({
            pathname: '/(find-space)/active-session',
            params: { bookingId: String(active.id) },
          });
        }
      } catch {
        // Best-effort: if this fails the SessionBar still shows the active state.
      }
    })();
  }, [authed, router]);
}
