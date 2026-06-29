import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WifiOff, RefreshCw } from 'lucide-react-native';
import { useNetworkStore } from '../store/networkStore';
import { FontSize, FontWeight, BorderRadius, Spacing } from '../theme';
import type { ColorsType } from '../theme';
import { useTheme } from '../hooks/useTheme';

/**
 * Full-screen "No internet connection" page that takes over the ENTIRE app while
 * the device is offline. Unlike the thin banner, this blocks all interaction —
 * the user can't browse stale screens; they see one clear message + Retry until
 * connectivity returns (Instagram/Swiggy-style hard offline gate).
 *
 * "Retry" runs the store's real reachability check; the moment it confirms we're
 * back online, the gate unmounts and the app reappears exactly where it was.
 */
const OfflineScreen: React.FC = () => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const refresh = useNetworkStore((s) => s.refresh);
  const [checking, setChecking] = useState(false);

  const onRetry = async () => {
    if (checking) return;
    setChecking(true);
    try {
      await refresh();
    } finally {
      setChecking(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.iconCircle}>
          <WifiOff size={44} color={colors.errorAlt} strokeWidth={1.75} />
        </View>
        <Text style={styles.title}>No internet connection</Text>
        <Text style={styles.message}>
          You're offline. Connect to the internet to continue using ParkSwift.
        </Text>
        <TouchableOpacity style={styles.retryBtn} onPress={onRetry} activeOpacity={0.85} disabled={checking}>
          {checking ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <RefreshCw size={16} color={colors.white} strokeWidth={2.5} />
              <Text style={styles.retryBtnText}>Try Again</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const makeStyles = (colors: ColorsType) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.screenBg },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['4xl'],
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.errorBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing['3xl'],
  },
  title: {
    fontSize: FontSize['3xl'],
    fontWeight: FontWeight.bold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  message: {
    fontSize: FontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: Spacing.md,
    marginBottom: Spacing['4xl'],
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    backgroundColor: colors.primary,
    paddingHorizontal: Spacing['5xl'],
    paddingVertical: Spacing.xl,
    borderRadius: BorderRadius.button,
    minWidth: 160,
  },
  retryBtnText: {
    color: colors.white,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
});

export default OfflineScreen;
