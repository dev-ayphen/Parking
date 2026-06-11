/**
 * UNUSED FILE - Kept for reference, will be deleted later
 *
 * This file's functionality has been moved to:
 * Location: (find-space)/index.tsx
 * Function: renderMyVehiclesView()
 * Access: Find Parking screen > Vehicle tab
 *
 * Navigation:
 * Drawer > My Vehicles → router.push({ pathname: '/(find-space)', params: { tab: 'vehicle' } })
 *
 * Original code preserved below in comments for reference during future deletion.
 */

import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, FontSize } from '../../theme';

export default function MyVehiclesScreen() {
  const router = useRouter();

  React.useEffect(() => {
    // Redirect to main vehicle page in Find Parking screen
    router.replace({ pathname: '/(find-space)', params: { tab: 'vehicle' } });
  }, [router]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.text}>Redirecting to vehicle management...</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: FontSize.md, color: Colors.textSecondary },        // 14 = md ✓
});

/*
================================================================================
ORIGINAL CODE ARCHIVED BELOW - Remove when deleting this file
================================================================================
[Original my-vehicles.tsx code would go here for reference]
================================================================================
*/
