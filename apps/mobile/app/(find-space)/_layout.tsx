import { Stack } from 'expo-router';
import { Colors } from '../../theme';

export default function FindSpaceLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'none',
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
    </Stack>
  );
}
