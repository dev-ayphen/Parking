import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WifiOff, Wifi } from 'lucide-react-native';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { Colors, FontSize, FontWeight, Spacing } from '../theme';

export const NetworkBanner = () => {
  const { isConnected } = useNetworkStatus();
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
});
