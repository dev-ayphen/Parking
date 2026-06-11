import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import SplashScreen from '../components/Screens/SplashScreen';
import { RealtimeProvider } from '../hooks/useRealtime';
import { ErrorBoundary } from '../components';
import { useAuthStore } from '../store/authStore';
import OwnerBookingAlert from '../components/OwnerBookingAlert';
import { ThemeProvider } from '../context/ThemeContext';

export default function RootLayout() {
  const [splashVisible, setSplashVisible] = useState(true);
  const hydrateAuth = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    // Hydrate persisted auth from SecureStore before app reads it
    hydrateAuth();
    const timer = setTimeout(() => {
      setSplashVisible(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, [hydrateAuth]);

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
