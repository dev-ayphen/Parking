import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import Toast from 'react-native-toast-message';
import SplashScreen from '../components/Screens/SplashScreen';
import { RealtimeProvider } from '../hooks/useRealtime';
import { ErrorBoundary } from '../components';
import { useAuthStore } from '../store/authStore';
import OwnerBookingAlert from '../components/OwnerBookingAlert';
import { NetworkBanner } from '../components/NetworkBanner';
import { ThemeProvider } from '../context/ThemeContext';
import { useNotificationDeepLink } from '../hooks/useNotificationDeepLink';
import { api } from '../services/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true, // show the app-icon badge so users know something arrived
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerPushToken() {
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

  // Route notification taps (warm + cold start) to the right screen.
  useNotificationDeepLink();

  useEffect(() => {
    hydrateAuth();
    const timer = setTimeout(() => {
      setSplashVisible(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, [hydrateAuth]);

  // Register push token once the user is logged in
  useEffect(() => {
    if (user?.id) {
      registerPushToken();
    }
  }, [user?.id]);

  return (
    <ErrorBoundary>
      <ThemeProvider>
      {splashVisible ? <SplashScreen /> : (
      <RealtimeProvider>
        {/* Global network banner — appears on ANY screen when connection drops */}
        <NetworkBanner />
        {/* Global owner alert — appears on ANY screen when a booking request comes in */}
        <OwnerBookingAlert />
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
