import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View, Platform, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WifiOff, Wifi, RotateCw } from 'lucide-react-native';
import { useNetworkStore } from '../store/networkStore';
import { Colors, FontSize, FontWeight, Spacing } from '../theme';

export const NetworkBanner = () => {
  const isConnected = useNetworkStore((s) => s.isConnected);
  const refresh = useNetworkStore((s) => s.refresh);
  const [retrying, setRetrying] = useState(false);
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-150)).current; // Start hidden above
  const [status, setStatus] = useState<'offline' | 'back_online' | 'hidden'>('hidden');

  // We need a ref to track the previous connection state to detect "came back online"
  const prevConnected = useRef(isConnected);

  useEffect(() => {
    // If still initializing (isConnected === null), do nothing
    if (isConnected === null) return;

    if (!isConnected) {
      // Went offline
      setStatus('offline');
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 0,
      }).start();
    } else if (isConnected && prevConnected.current === false) {
      // Came back online
      setStatus('back_online');
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 0,
      }).start();

      // Hide after 2 seconds
      const timer = setTimeout(() => {
        Animated.timing(translateY, {
          toValue: -150,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setStatus('hidden');
        });
      }, 2000);

      prevConnected.current = isConnected;
      return () => clearTimeout(timer);
    } else {
      // Already online or initial state is online, ensure hidden
      Animated.timing(translateY, {
        toValue: -150,
        duration: 0,
        useNativeDriver: true,
      }).start(() => {
        setStatus('hidden');
      });
    }

    prevConnected.current = isConnected;
  }, [isConnected, translateY]);

  if (status === 'hidden') return null;

  const isOffline = status === 'offline';
  const backgroundColor = isOffline ? Colors.error : Colors.success;
  const message = isOffline ? 'No internet connection' : 'Back online';
  const Icon = isOffline ? WifiOff : Wifi;

  const onRetry = async () => {
    if (retrying) return;
    setRetrying(true);
    await refresh();           // re-checks NetInfo; banner auto-hides if reconnected
    setTimeout(() => setRetrying(false), 600);
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
        <Icon color={Colors.white} size={18} style={styles.icon} strokeWidth={2.5} />
        <Text style={styles.text}>{message}</Text>
        {isOffline && (
          <Pressable style={styles.retryBtn} onPress={onRetry} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            {retrying ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <>
                <RotateCw color={Colors.white} size={13} strokeWidth={2.5} />
                <Text style={styles.retryText}>Retry</Text>
              </>
            )}
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
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
    color: Colors.white,
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
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
});

