import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState, useRef } from 'react';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import Toast from 'react-native-toast-message';
import SplashScreen from '../components/Screens/SplashScreen';
import { RealtimeProvider } from '../hooks/useRealtime';
import { ErrorBoundary } from '../components';
import { useAuthStore } from '../store/authStore';
import OwnerBookingAlert from '../components/OwnerBookingAlert';
import { NetworkBanner } from '../components/NetworkBanner';
import OfflineScreen from '../components/OfflineScreen';
import SessionBar from '../components/SessionBar';
import { useNetworkStore } from '../store/networkStore';
import { ThemeProvider } from '../context/ThemeContext';
import { useNotificationDeepLink } from '../hooks/useNotificationDeepLink';
import { useAppLifecycle } from '../hooks/useAppLifecycle';
import { startNetworkListener } from '../store/networkStore';
import { api } from '../services/api';

// Expo Go (SDK 53+) REMOVED the native push module, so even `import 'expo-notifications'`
// THROWS at module-evaluation time in Expo Go — which previously crashed this whole
// layout. So we detect Expo Go and NEVER statically import the module; we lazily
// require it only on a real build (development build / EAS), where push works.
// See https://docs.expo.dev/develop/development-builds/.
const isExpoGo = Constants.appOwnership === 'expo' || Constants.executionEnvironment === 'storeClient';

// Lazily load expo-notifications, but never in Expo Go (the require would throw).
// Returns null when unavailable so all callers degrade gracefully.
function getNotifications(): any | null {
  if (isExpoGo) return null;
  try {
    return require('expo-notifications');
  } catch {
    return null;
  }
}

// Set the foreground presentation handler once, only when the module is available.
(() => {
  const N = getNotifications();
  if (!N) return;
  try {
    N.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true, // show the app-icon badge so users know something arrived
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch {
    // No-op — never let notification setup crash module evaluation.
  }
})();

async function registerPushToken() {
  const Notifications = getNotifications();
  // Unavailable in Expo Go — bail before any native call that would throw.
  if (!Notifications) {
    if (__DEV__) console.log('[PUSH] Skipped — push requires a development build (not Expo Go).');
    return;
  }
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('parkswift', {
        name: 'ParkSwift',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    // projectId is REQUIRED for getExpoPushTokenAsync() in production/EAS builds
    // (Expo Go can resolve it implicitly, standalone builds cannot). We read it
    // from the EAS config in app.config.js → extra.eas.projectId.
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      (Constants as any)?.easConfig?.projectId;

    if (!projectId) {
      // Without this, a production build throws here and no token is ever saved.
      // Loud in dev so it's caught before release; silent no-op in prod.
      if (__DEV__) {
        console.warn(
          '[PUSH] No EAS projectId configured — push tokens will NOT be obtained in production. Run `eas init` and set extra.eas.projectId.',
        );
      }
      return;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    await api.post('/users/me/push-token', { token: tokenData.data });
  } catch (err) {
    // Non-critical — never block app startup on push registration.
    if (__DEV__) console.warn('[PUSH] token registration failed:', (err as Error)?.message);
  }
}

export default function RootLayout() {
  const [splashVisible, setSplashVisible] = useState(true);
  const hydrateAuth = useAuthStore((s) => s.hydrate);
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const router = useRouter();
  const segments = useSegments();
  // Device connectivity (null until the first check; true/false after).
  const isConnected = useNetworkStore((s) => s.isConnected);

  // Mandatory profile-completion gate: a logged-in user whose profile is NOT
  // complete (no name/email) must finish it before using the app — covers the
  // cold-start / already-logged-in case where they never hit the OTP routing.
  // Only redirect once we're past splash + hydration, and not already in (auth).
  useEffect(() => {
    if (splashVisible || !isHydrated || !user?.id) return;
    if (user.isProfileComplete === false && segments[0] !== '(auth)') {
      router.replace('/(auth)/complete-profile');
    }
  }, [splashVisible, isHydrated, user?.id, user?.isProfileComplete, segments, router]);

  // Route notification taps (warm + cold start) to the right screen.
  useNotificationDeepLink();

  // App resume re-validation, keep-alive, and cold-start active-session deep-link.
  useAppLifecycle();

  // Single global connectivity listener (powers the banner + requireOnline guard).
  useEffect(() => { startNetworkListener(); }, []);

  useEffect(() => {
    hydrateAuth();
    const timer = setTimeout(() => {
      setSplashVisible(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, [hydrateAuth]);

  // Register the push token ONCE per logged-in user. The user object is refreshed
  // periodically (keep-alive /users/me ping), which re-created a new object each
  // time and re-fired this effect — spamming registerPushToken (and its
  // "[PUSH] Skipped" log) repeatedly. Track the id we've already registered for.
  const pushRegisteredFor = useRef<number | null>(null);
  useEffect(() => {
    const id = user?.id;
    if (id && pushRegisteredFor.current !== id) {
      pushRegisteredFor.current = id;
      registerPushToken();
    }
    if (!id) pushRegisteredFor.current = null; // reset on logout so next login re-registers
  }, [user?.id]);

  return (
    <ErrorBoundary>
      <ThemeProvider>
      {splashVisible ? <SplashScreen /> : isConnected === false ? (
        // HARD OFFLINE GATE: when the device has no connection, take over the whole
        // app with a single "No internet connection / Try Again" screen instead of
        // letting the user browse stale/broken screens. The moment connectivity is
        // restored (passive listener, auto-poll, or the screen's Retry), this
        // unmounts and the app reappears exactly where it was.
        <OfflineScreen />
      ) : (
      <RealtimeProvider>
        {/* Global network banner — appears on ANY screen when connection drops */}
        <NetworkBanner />
        {/* Global owner alert — appears on ANY screen when a booking request comes in */}
        <OwnerBookingAlert />
        {/* Persistent sticky session bar — shows active booking/session state across all screens */}
        <SessionBar />
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'none',
            contentStyle: { backgroundColor: 'transparent' },
          }}
          initialRouteName="(auth)"
        >
          <Stack.Screen
            name="(auth)"
            options={{
              headerShown: false,
              animation: 'none',
              contentStyle: { backgroundColor: 'transparent' },
            }}
          />
          <Stack.Screen
            name="(home)"
            options={{
              headerShown: false,
              animation: 'none',
              contentStyle: { backgroundColor: 'transparent' },
            }}
          />
          <Stack.Screen
            name="(find-space)"
            options={{
              headerShown: false,
              contentStyle: { backgroundColor: 'transparent' },
            }}
          />
          <Stack.Screen
            name="(my-spaces)"
            options={{
              headerShown: false,
              contentStyle: { backgroundColor: 'transparent' },
            }}
          />
          <Stack.Screen
            name="add-space"
            options={{
              headerShown: false,
              animation: 'slide_from_right',
              contentStyle: { backgroundColor: 'transparent' },
            }}
          />
        </Stack>
      </RealtimeProvider>
      )}
      </ThemeProvider>
      <Toast />
    </ErrorBoundary>
  );
}
