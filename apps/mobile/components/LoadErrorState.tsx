import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { WifiOff, XCircle } from 'lucide-react-native';
import { useNetworkStore } from '../store/networkStore';
import { FontSize, FontWeight, BorderRadius, Spacing } from '../theme';
import { useTheme } from '../hooks/useTheme';
import type { ColorsType } from '../theme';

interface LoadErrorStateProps {
  /** The error message from the failed fetch (shown only when actually online). */
  message?: string | null;
  /** Re-run the fetch. */
  onRetry: () => void;
}

/**
 * Full-screen "can't load" state for data screens — the industry-standard
 * offline pattern (Instagram / Swiggy / Zomato): when a screen has NO data to
 * show and the fetch failed, show this instead of stale numbers or a misleading
 * empty state. It automatically distinguishes "you're offline" from a real
 * server error so the copy is honest.
 *
 * Usage in a screen:
 *   if (loadFailed && !hasData) return <LoadErrorState onRetry={fetchData} message={error} />;
 */
const makeStyles = (colors: ColorsType) => StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['4xl'],
    backgroundColor: colors.screenBg,
  },
  title: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.bold,
    color: colors.textPrimary,
    marginTop: Spacing.xl,
  },
  message: {
    fontSize: FontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: Spacing.sm,
    marginBottom: Spacing['3xl'],
  },
  retryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: Spacing['5xl'],
    paddingVertical: Spacing.xl,
    borderRadius: BorderRadius.button,
  },
  retryBtnText: {
    color: colors.white,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
});

const LoadErrorState: React.FC<LoadErrorStateProps> = ({ message, onRetry }) => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const isConnected = useNetworkStore((s) => s.isConnected);
  const offline = isConnected === false;

  return (
    <View style={styles.container}>
      {offline ? (
        <WifiOff size={48} color={colors.errorAlt} strokeWidth={1.5} />
      ) : (
        <XCircle size={48} color={colors.errorAlt} strokeWidth={1.5} />
      )}
      <Text style={styles.title}>{offline ? 'No internet connection' : 'Failed to load'}</Text>
      <Text style={styles.message}>
        {offline
          ? 'Connect to the internet to continue. Check your connection and try again.'
          : (message || 'Something went wrong. Please try again.')}
      </Text>
      <TouchableOpacity style={styles.retryBtn} onPress={onRetry} activeOpacity={0.85}>
        <Text style={styles.retryBtnText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
};

export default LoadErrorState;
