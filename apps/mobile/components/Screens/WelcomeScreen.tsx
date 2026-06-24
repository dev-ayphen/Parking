import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Svg, { Path, Defs, RadialGradient, Stop } from 'react-native-svg';
import { useTheme } from '../../hooks/useTheme';

import { Map, ShieldCheck } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

const PinIcon = ({ size = 80 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 512 512">
    <Defs>
      <RadialGradient id="pinGradWelcome" cx="40%" cy="30%" r="70%">
        <Stop offset="0%" stopColor="#FF3D7F" />
        <Stop offset="100%" stopColor="#A8003F" />
      </RadialGradient>
    </Defs>
    <Path
      fill="url(#pinGradWelcome)"
      d="M256 32C167.6 32 96 103.6 96 192c0 112 160 288 160 288s160-176 160-288C416 103.6 344.4 32 256 32zm0 224c-35.3 0-64-28.7-64-64s28.7-64 64-64 64 28.7 64 64-28.7 64-64 64z"
    />
  </Svg>
);

const WelcomeScreen = () => {
  const router = useRouter();
  const { colors } = useTheme();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, scaleAnim]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.white }]}>
      <StatusBar backgroundColor={colors.white} barStyle="dark-content" />


      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.topSection}>
          {/* Logo */}
          <Animated.View
            style={[
              styles.logoContainer,
              {
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <View style={styles.logoBackground}>
              <PinIcon size={64} />
            </View>
          </Animated.View>

          {/* App Name */}
          <Text style={styles.title}>
            <Text style={{ color: colors.textPrimary }}>Park</Text>
            <Text style={{ color: colors.primary }}>Swift</Text>
          </Text>

          {/* Subtitle */}
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Find, book, and manage your parking effortlessly.
          </Text>
        </View>

        {/* Feature Highlights */}
        <View style={styles.featuresContainer}>
          <View style={styles.featureRow}>
            <View style={styles.featureIconBox}>
              <Map size={24} color={colors.primary} strokeWidth={2.5} />
            </View>
            <View style={styles.featureTextContainer}>
              <Text style={[styles.featureTitle, { color: colors.textPrimary }]}>Discover Spots</Text>
              <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>Find premium parking near you</Text>
            </View>
          </View>

          <View style={styles.featureRow}>
            <View style={[styles.featureIconBox, { backgroundColor: 'rgba(34, 197, 94, 0.12)' }]}>
              <ShieldCheck size={24} color="#22C55E" strokeWidth={2.5} />
            </View>
            <View style={styles.featureTextContainer}>
              <Text style={[styles.featureTitle, { color: colors.textPrimary }]}>Secure Sessions</Text>
              <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>Verified spaces & payments</Text>
            </View>
          </View>
        </View>

        <View style={styles.bottomSection}>
          {/* Main Action Button */}
          <TouchableOpacity activeOpacity={0.85} onPress={() => router.push('/(auth)/login')}>
            <LinearGradient
              colors={[colors.primaryLight, colors.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.button}
            >
              <Text style={styles.buttonText}>Get Started</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 60,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  topSection: {
    alignItems: 'center',
    marginTop: height * 0.1,
  },
  logoContainer: {
    marginBottom: 24,
  },
  logoBackground: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFF1F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -1.5,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '500',
    lineHeight: 26,
    textAlign: 'center',
    letterSpacing: 0.2,
    paddingHorizontal: 20,
  },
  featuresContainer: {
    width: '100%',
    paddingHorizontal: 16,
    marginVertical: 40,
    gap: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  featureIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(220,1,89,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 14,
    fontWeight: '400',
  },
  bottomSection: {
    width: '100%',
  },
  button: {
    width: '100%',
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#DC0159',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default WelcomeScreen;