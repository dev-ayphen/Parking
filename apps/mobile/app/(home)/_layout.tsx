import React from 'react';
import { Stack, Redirect } from 'expo-router';
import { useAuthStore } from '../../store/authStore';

export default function HomeLayout() {
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);

  // Only redirect once auth state is KNOWN (hydrated). During hydration we render
  // nothing to avoid a flicker/redirect loop. After hydration, no token/user → login.
  if (!isHydrated) return null;
  if (!token || !user) return <Redirect href="/(auth)/login" />;

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="index" options={{ title: 'Home' }} />
      <Stack.Screen name="recent-activity" options={{ title: 'Recent Activity' }} />
      <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
      <Stack.Screen name="profile" options={{ title: 'Profile' }} />
      {/* UNUSED: my-vehicles moved to Find Parking > Vehicle tab. See (find-space)/index.tsx renderMyVehiclesView() */}
      {/* <Stack.Screen name="my-vehicles" options={{ title: 'My Vehicles' }} /> */}
      <Stack.Screen name="my-bookings" options={{ title: 'My Bookings' }} />
      <Stack.Screen name="my-incidents" options={{ title: 'My Incidents' }} />
      <Stack.Screen name="my-reports" options={{ title: 'My Reports' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      <Stack.Screen name="help-support" options={{ title: 'Help & Support' }} />
      <Stack.Screen name="manage-billing" options={{ title: 'Billing Details' }} />
      <Stack.Screen name="support/tickets" options={{ title: 'My Support Tickets' }} />
      <Stack.Screen name="support/create-ticket" options={{ title: 'Contact Support' }} />
      <Stack.Screen name="support/ticket/[id]" options={{ title: 'Ticket Details' }} />
      <Stack.Screen name="support/faq" options={{ title: 'FAQ' }} />
      <Stack.Screen name="support/articles" options={{ title: 'Help Articles' }} />
    </Stack>
  );
}
