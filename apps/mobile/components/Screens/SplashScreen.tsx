import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Defs, RadialGradient, Stop } from 'react-native-svg';
import { useTheme } from '../../hooks/useTheme';

const { width, height } = Dimensions.get('window');

// The official premium PinIcon used across the app
const PinIcon = ({ size = 80 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 512 512">
    <Defs>
      <RadialGradient id="pinGradSplash" cx="40%" cy="30%" r="70%">
        <Stop offset="0%" stopColor="#FF3D7F" />
        <Stop offset="100%" stopColor="#A8003F" />
      </RadialGradient>
    </Defs>
    <Path
      fill="url(#pinGradSplash)"
      d="M256 32C167.6 32 96 103.6 96 192c0 112 160 288 160 288s160-176 160-288C416 103.6 344.4 32 256 32zm0 224c-35.3 0-64-28.7-64-64s28.7-64 64-64 64 28.7 64 64-28.7 64-64 64z"
    />
  </Svg>
);

export const SplashScreen: React.FC = () => {
  const { colors } = useTheme();

  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Logo entrance
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Text fade in after logo
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    });
  }, [scaleAnim, opacityAnim, textOpacity]);

  return (
    <View style={[styles.container, { backgroundColor: colors.white }]}>
      <Animated.View
        style={[
          styles.logoContainer,
          {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        <PinIcon size={120} />
      </Animated.View>

      <Animated.View style={{ opacity: textOpacity, alignItems: 'center' }}>
        <Text style={styles.title}>
          <Text style={{ color: colors.textPrimary }}>Park</Text>
          <Text style={{ color: colors.primary }}>Swift</Text>
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Smart Parking Simplified
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width,
    height,
  },
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#DC0159',
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  title: {
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: -1,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
});

export default SplashScreen;