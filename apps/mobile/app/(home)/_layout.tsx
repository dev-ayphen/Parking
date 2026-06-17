import React from 'react';
import { Stack } from 'expo-router';

export default function HomeLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ title: 'Home' }} />
      <Stack.Screen name="recent-activity" options={{ title: 'Recent Activity' }} />
      <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
      <Stack.Screen name="profile" options={{ title: 'Profile' }} />
      <Stack.Screen name="edit-profile" options={{ title: 'Edit Profile' }} />
      {/* UNUSED: my-vehicles moved to Find Parking > Vehicle tab. See (find-space)/index.tsx renderMyVehiclesView() */}
      {/* <Stack.Screen name="my-vehicles" options={{ title: 'My Vehicles' }} /> */}
      <Stack.Screen name="my-bookings" options={{ title: 'My Bookings' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      <Stack.Screen name="help-support" options={{ title: 'Help & Support' }} />
      <Stack.Screen name="manage-billing" options={{ title: 'Billing Details' }} />
      <Stack.Screen name="support/tickets" options={{ title: 'My Support Tickets' }} />
      <Stack.Screen name="support/create-ticket" options={{ title: 'Contact Support' }} />
      <Stack.Screen name="support/ticket/[id]" options={{ title: 'Ticket Details' }} />
      <Stack.Screen name="support/faq" options={{ title: 'FAQ' }} />
      <Stack.Screen name="support/articles" options={{ title: 'Help Articles' }} />
      <Stack.Screen name="support/chat" options={{ title: 'Live Chat' }} />
    </Stack>
  );
}
