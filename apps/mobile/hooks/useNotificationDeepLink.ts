import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';

/**
 * Routes a tapped push notification to the right screen using the `data` payload
 * the backend attaches (see admin.service `buildDeepLinkData`):
 *
 *   { screen: 'booking-detail'   , bookingId }  → parker's booking status screen
 *   { screen: 'booking-requests' }              → owner's incoming requests list
 *   { screen: 'billing' }                       → billing / payments
 *   { screen: 'my-spaces', spaceId }            → owner's spaces
 *   (anything else)                             → notifications inbox
 *
 * Handles BOTH cases:
 *  - warm tap: app already running, user taps a banner → addNotificationResponseReceivedListener
 *  - cold start: app was killed, launched by tapping the notification → getLastNotificationResponseAsync
 */
export function useNotificationDeepLink() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  // Guard so a cold-start response isn't also re-handled by the live listener.
  const handledColdStart = useRef(false);

  useEffect(() => {
    const route = (data: any) => {
      if (!data) return;
      const screen = data.screen as string | undefined;
      const bookingId = data.bookingId ? String(data.bookingId) : undefined;

      try {
        switch (screen) {
          case 'booking-detail':
            if (bookingId) {
              router.push({ pathname: '/(find-space)/booking-status', params: { bookingId } });
            } else {
              router.push('/(home)/my-bookings');
            }
            break;
          case 'booking-requests':
            // A specific incoming request → open the actionable accept/decline
            // screen directly; otherwise fall back to the requests list.
            if (bookingId) {
              router.push({ pathname: '/(my-spaces)/booking-request', params: { bookingId } });
            } else {
              router.push('/(my-spaces)/recent-requests');
            }
            break;
          case 'billing':
            router.push('/(home)/manage-billing');
            break;
          case 'my-spaces':
            router.push('/(my-spaces)');
            break;
          default:
            // Unknown / generic notification — open the inbox.
            router.push('/(home)/notifications');
        }
      } catch {
        // Navigation can throw if the router isn't ready yet (very early cold
        // start). Fall back to the inbox, which always exists.
        router.push('/(home)/notifications');
      }
    };

    // Warm taps while the app is running.
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      route(response?.notification?.request?.content?.data);
    });

    // Cold start — app launched by tapping a notification. We must wait until
    // (a) auth has hydrated and the user is logged in (else the target screen
    // bounces to login) and (b) the navigator is actually ready. Rather than a
    // brittle fixed delay, retry on an interval until the route lands.
    (async () => {
      const last = await Notifications.getLastNotificationResponseAsync();
      if (!last || handledColdStart.current) return;

      // Only route once auth is settled and a user is present.
      if (!isHydrated || !user?.id) return;

      handledColdStart.current = true;
      const data = last.notification.request.content.data;

      let attempts = 0;
      const tryRoute = () => {
        attempts += 1;
        try {
          route(data);
        } catch {
          // Navigator not mounted yet — retry up to ~5s, then give up to inbox.
          if (attempts < 25) {
            setTimeout(tryRoute, 200);
          } else {
            try { router.push('/(home)/notifications'); } catch { /* noop */ }
          }
        }
      };
      // First attempt on the next tick so the root navigator can mount.
      setTimeout(tryRoute, 200);
    })();

    return () => sub.remove();
  }, [router, user?.id, isHydrated]);
}
