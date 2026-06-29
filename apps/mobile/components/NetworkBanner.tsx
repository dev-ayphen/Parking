import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View, Platform, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WifiOff, Wifi, RotateCw } from 'lucide-react-native';
import { DeviceEventEmitter } from 'react-native';
import { useNetworkStore, NETWORK_RECONNECTED } from '../store/networkStore';
import { toast } from '../utils/toast';
import { FontSize, FontWeight, Spacing } from '../theme';
import { useTheme } from '../hooks/useTheme';
import type { ColorsType } from '../theme';

const makeStyles = (colors: ColorsType) => StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingBottom: Spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  icon: {
    marginRight: Spacing.sm,
  },
  text: {
    color: colors.white,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    minWidth: 56,
    justifyContent: 'center',
  },
  retryText: {
    color: colors.white,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
});

export const NetworkBanner = () => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const isConnected = useNetworkStore((s) => s.isConnected);
  const refresh = useNetworkStore((s) => s.refresh);
  const [retrying, setRetrying] = useState(false);
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-150)).current; // Start hidden above
  const [status, setStatus] = useState<'offline' | 'back_online' | 'hidden'>('hidden');

  // We need a ref to track the previous connection state to detect "came back online"
  const prevConnected = useRef(isConnected);

  // Declarative visibility — driven SOLELY by the current isConnected value, not
  // by tracking transitions through a ref (which broke across Fast Refresh and in
  // the "already online" race). Offline → slide the banner in. Online → if we
  // were offline, flash "Back online" then hide; otherwise just stay hidden.
  useEffect(() => {
    if (isConnected === null) return; // still initializing

    if (!isConnected) {
      setStatus('offline');
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
      prevConnected.current = isConnected;
      return;
    }

    // isConnected is true here.
    const wasOffline = prevConnected.current === false;
    prevConnected.current = isConnected;

    if (wasOffline) {
      setStatus('back_online');
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
      const timer = setTimeout(() => {
        Animated.timing(translateY, { toValue: -150, duration: 300, useNativeDriver: true })
          .start(() => setStatus('hidden'));
      }, 1500);
      return () => clearTimeout(timer);
    }

    // Already online → ensure hidden.
    setStatus('hidden');
    translateY.setValue(-150);
  }, [isConnected, translateY]);

  if (status === 'hidden') return null;

  const isOffline = status === 'offline';
  const backgroundColor = isOffline ? colors.error : colors.success;
  const message = isOffline ? 'No internet connection' : 'Back online';
  const Icon = isOffline ? WifiOff : Wifi;

  const onRetry = async () => {
    if (retrying) return;
    setRetrying(true);
    const online = await refresh();
    setRetrying(false);
    if (online) {
      // Reload the visible screen's data.
      DeviceEventEmitter.emit(NETWORK_RECONNECTED);
      // Force the banner away NOW — don't wait on the isConnected effect, which
      // may not re-run if the store was already 'online'. Slide up and hide.
      Animated.timing(translateY, {
        toValue: -150,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setStatus('hidden'));
    } else {
      toast.error('Still offline. Check your connection and try again.');
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor,
          paddingTop: Math.max(insets.top, Spacing.sm) + Spacing.sm,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.content}>
        <Icon color={colors.white} size={18} style={styles.icon} strokeWidth={2.5} />
        <Text style={styles.text}>{message}</Text>
        {isOffline && (
          <Pressable style={styles.retryBtn} onPress={onRetry} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            {retrying ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <RotateCw color={colors.white} size={13} strokeWidth={2.5} />
                <Text style={styles.retryText}>Retry</Text>
              </>
            )}
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
};
