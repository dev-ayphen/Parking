import React, { useEffect, useRef, useState } from 'react';
import {
  Animated, StyleSheet, Text, TouchableOpacity, View, Platform,
} from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSessionBarStore } from '../store/sessionBarStore';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../theme';

// ── Screens where the bar is always hidden ────────────────────────────────────
// (the screen itself is the full action UI)
const HIDDEN_SEGMENTS = new Set([
  'booking-status',
  'active-session',
  'session-complete',
  'booking-request',
  'exit-verification',
]);

// ── Countdown helpers ─────────────────────────────────────────────────────────
const fmt = (totalSec: number) => {
  if (totalSec <= 0) return '0:00';
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

const minsLeft = (endsAt: string | null) => {
  if (!endsAt) return null;
  const diff = Math.floor((new Date(endsAt).getTime() - Date.now()) / 60000);
  return Math.max(0, diff);
};

// ── Bar config per variant ────────────────────────────────────────────────────
function useBarConfig(nowTs: number) {
  const {
    variant, spaceName, vehiclePlate, expiresAt, endsAt, otp, etaText,
  } = useSessionBarStore();

  if (!variant) return null;

  const remainingApprovalSec = expiresAt
    ? Math.max(0, Math.floor((new Date(expiresAt).getTime() - nowTs) / 1000))
    : 0;
  const remainingMins = minsLeft(endsAt);
  const isEndingSoon = remainingMins !== null && remainingMins < 15;

  switch (variant) {
    // ── Parker stages ──────────────────────────────────────────────────
    case 'booking_pending':
      return {
        bg: Colors.warningBg,
        border: '#FDE68A',
        icon: '⏳',
        title: 'Awaiting owner approval',
        subtitle: `${spaceName} · expires in ${fmt(remainingApprovalSec)}`,
        titleColor: '#92400E',
        subtitleColor: '#B45309',
        route: '/(find-space)/booking-status',
      };
    case 'booking_approved':
      return {
        bg: Colors.successBg,
        border: '#BBF7D0',
        icon: '✅',
        title: 'Booking approved! Head over',
        subtitle: spaceName,
        titleColor: Colors.success,
        subtitleColor: '#15803D',
        route: '/(find-space)/booking-status',
      };
    case 'arrived_otp_ready':
      return {
        bg: '#EFF6FF',
        border: '#BFDBFE',
        icon: '🚗',
        title: "You're on your way",
        subtitle: `${spaceName} · OTP: ${otp ?? '—'}`,
        titleColor: '#1D4ED8',
        subtitleColor: '#2563EB',
        route: '/(find-space)/active-session',
      };
    case 'session_active':
      return {
        bg: Colors.successBg,
        border: '#BBF7D0',
        icon: '🟢',
        title: 'Currently parked',
        subtitle: remainingMins !== null
          ? `${spaceName} · ${remainingMins}h ${remainingMins < 1 ? '' : ''}${remainingMins < 60 ? `${remainingMins} min` : `${Math.floor(remainingMins / 60)}h ${remainingMins % 60}m`} remaining`
          : spaceName,
        titleColor: Colors.success,
        subtitleColor: '#15803D',
        route: '/(find-space)/active-session',
      };
    case 'session_ending':
      return {
        bg: Colors.errorBg,
        border: '#FECACA',
        icon: '🔴',
        title: 'Session ending soon',
        subtitle: `${spaceName} · ${remainingMins ?? 0} min left`,
        titleColor: Colors.error,
        subtitleColor: Colors.error,
        route: '/(find-space)/active-session',
      };
    case 'rating_pending':
      return {
        bg: '#FFFBEB',
        border: '#FDE68A',
        icon: '⭐',
        title: 'Rate your experience',
        subtitle: spaceName,
        titleColor: '#92400E',
        subtitleColor: '#B45309',
        route: '/(find-space)/session-complete',
      };

    // ── Owner stages ───────────────────────────────────────────────────
    case 'new_request':
      return {
        bg: Colors.warningBg,
        border: '#FDE68A',
        icon: '🔔',
        title: 'New booking request!',
        subtitle: `${vehiclePlate} · approve in ${fmt(remainingApprovalSec)}`,
        titleColor: '#92400E',
        subtitleColor: '#B45309',
        route: '/(my-spaces)/booking-request',
      };
    case 'parker_en_route':
      return {
        bg: '#EFF6FF',
        border: '#BFDBFE',
        icon: '🚗',
        title: 'Parker is on the way',
        subtitle: `${spaceName}${etaText ? ` · ETA ${etaText}` : ''}`,
        titleColor: '#1D4ED8',
        subtitleColor: '#2563EB',
        route: '/(my-spaces)/verify',
      };
    case 'parker_at_gate':
      return {
        bg: '#FDF4FF',
        border: '#E9D5FF',
        icon: '🔑',
        title: 'Parker at gate — verify OTP',
        subtitle: `${spaceName} · tap to verify`,
        titleColor: '#7C3AED',
        subtitleColor: '#6D28D9',
        route: '/(my-spaces)/verify',
      };
    case 'owner_session_active':
      return {
        bg: Colors.successBg,
        border: '#BBF7D0',
        icon: '🟢',
        title: 'Active session running',
        subtitle: endsAt
          ? `${spaceName} · ends at ${new Date(endsAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`
          : spaceName,
        titleColor: Colors.success,
        subtitleColor: '#15803D',
        route: '/(my-spaces)/active',
      };
    case 'owner_session_ending':
      return {
        bg: Colors.errorBg,
        border: '#FECACA',
        icon: '🔴',
        title: 'Session ending soon',
        subtitle: `${spaceName} · ${remainingMins ?? 0} min left`,
        titleColor: Colors.error,
        subtitleColor: Colors.error,
        route: '/(my-spaces)/active',
      };

    default:
      return null;
  }
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function SessionBar() {
  const router = useRouter();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const variant = useSessionBarStore((s) => s.variant);
  const bookingId = useSessionBarStore((s) => s.bookingId);

  // Tick every second for countdowns
  const [nowTs, setNowTs] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const config = useBarConfig(nowTs);

  // Determine if the current screen suppresses the bar
  const lastSegment = segments[segments.length - 1] ?? '';
  const isSuppressed = HIDDEN_SEGMENTS.has(lastSegment);

  // Slide-up animation
  const translateY = useRef(new Animated.Value(80)).current;
  const shouldShow = !!config && !isSuppressed;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: shouldShow ? 0 : 80,
      useNativeDriver: true,
      damping: 18,
      stiffness: 200,
    }).start();
  }, [shouldShow, translateY]);

  if (!config) return null;

  const handlePress = () => {
    const route = config.route as any;
    if (bookingId && (
      route.includes('booking-status') ||
      route.includes('active-session') ||
      route.includes('session-complete') ||
      route.includes('booking-request')
    )) {
      router.push({ pathname: route, params: { bookingId } });
    } else {
      router.push(route);
    }
  };

  // Bottom offset: above the tab bar if we're in my-spaces (has custom tab bar)
  // Otherwise just above the home indicator / safe area
  const isInMySpaces = segments[0] === '(my-spaces)';
  const bottomOffset = isInMySpaces
    ? (Platform.OS === 'ios' ? 100 : 90)  // above the floating tab bar
    : Math.max(insets.bottom, 8) + 4;

  return (
    <Animated.View
      style={[
        styles.wrapper,
        { bottom: bottomOffset, transform: [{ translateY }] },
      ]}
      pointerEvents={shouldShow ? 'box-none' : 'none'}
    >
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={handlePress}
        style={[
          styles.bar,
          {
            backgroundColor: config.bg,
            borderColor: config.border,
          },
        ]}
      >
        <Text style={styles.icon}>{config.icon}</Text>
        <View style={styles.textBlock}>
          <Text style={[styles.title, { color: config.titleColor }]} numberOfLines={1}>
            {config.title}
          </Text>
          <Text style={[styles.subtitle, { color: config.subtitleColor }]} numberOfLines={1}>
            {config.subtitle}
          </Text>
        </View>
        <Text style={[styles.chevron, { color: config.subtitleColor }]}>›</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: Spacing['3xl'],    // 16
    right: Spacing['3xl'],   // 16
    zIndex: 900,             // below NetworkBanner (9999) and OwnerBookingAlert modal
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,       // 16
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: Spacing['3xl'],   // 16
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 4,
  },
  icon: {
    fontSize: 18,
    lineHeight: 22,
  },
  textBlock: {
    flex: 1,
    gap: 1,
  },
  title: {
    fontSize: FontSize.sm,          // 13
    fontWeight: FontWeight.bold,    // 700
    lineHeight: 18,
  },
  subtitle: {
    fontSize: FontSize.xs,          // 12
    fontWeight: FontWeight.medium,  // 500
    lineHeight: 16,
  },
  chevron: {
    fontSize: 20,
    fontWeight: FontWeight.bold,
    lineHeight: 24,
    marginLeft: 2,
  },
});
