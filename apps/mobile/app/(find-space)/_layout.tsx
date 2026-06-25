import { Stack, Redirect } from 'expo-router';
import { Colors } from '../../theme';
import { useAuthStore } from '../../store/authStore';

export default function FindSpaceLayout() {
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);

  // Wait for hydration before deciding (no flicker), then guard on missing auth.
  if (!isHydrated) return null;
  if (!token || !user) return <Redirect href="/(auth)/login" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: Colors.white },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Find Parking' }} />
      <Stack.Screen name="space-detail" options={{ title: 'Space Details' }} />
      <Stack.Screen name="space-reviews" options={{ title: 'Reviews' }} />
      <Stack.Screen name="vehicle-select" options={{ title: 'Select Vehicle' }} />
      <Stack.Screen name="booking-confirm" options={{ title: 'Confirm Booking' }} />
      <Stack.Screen name="booking-success" options={{ title: 'Booking Sent' }} />
      <Stack.Screen name="booking-status" options={{ title: 'Booking Status' }} />
      <Stack.Screen name="booking-terms" options={{ title: 'Booking Terms' }} />
      <Stack.Screen name="active-session" options={{ title: 'Active Session' }} />
      <Stack.Screen name="session-complete" options={{ title: 'Session Complete' }} />
      <Stack.Screen name="incident-detail" options={{ title: 'Incident Report' }} />
      <Stack.Screen name="public-profile" options={{ title: 'Profile' }} />
    </Stack>
  );
}
