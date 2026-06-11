import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import SplashScreen from '../components/Screens/SplashScreen';
import { RealtimeProvider } from '../hooks/useRealtime';
import { ErrorBoundary } from '../components';
import { useAuthStore } from '../store/authStore';
import OwnerBookingAlert from '../components/OwnerBookingAlert';
import { ThemeProvider } from '../context/ThemeContext';
import { api } from '../services/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
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
    const tokenData = await Notifications.getExpoPushTokenAsync();
    await api.post('/users/me/push-token', { token: tokenData.data });
  } catch {
    // Non-critical — fail silently
  }
}

export default function RootLayout() {
  const [splashVisible, setSplashVisible] = useState(true);
  const hydrateAuth = useAuthStore((s) => s.hydrate);
  const user = useAuthStore((s) => s.user);

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
        </Stack>
      </RealtimeProvider>
      )}
      </ThemeProvider>
    </ErrorBoundary>
  );
}
