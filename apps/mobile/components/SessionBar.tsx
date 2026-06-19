import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  Animated, StyleSheet, Text, TouchableOpacity, View, Platform,
  PanResponder, Keyboard, AccessibilityInfo, Pressable,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter, useSegments } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import {
  useSessionBarStore, minsUntil, isDismissible, isInformational, type BarEntry, type BarVariant,
} from '../store/sessionBarStore';
import { useNetworkStore } from '../store/networkStore';
import { useTheme, type AppTheme } from '../hooks/useTheme';
import { TAB_BAR_TOTAL } from '../constants/tabBar';

// ── Screens where the bar is suppressed (the screen IS the full action UI) ────
const HIDDEN_SEGMENTS = new Set([
  'booking-status',
  'active-session',
  'session-complete',
  'booking-request',
  'exit-verification',
  'verify',           // owner is already inside the OTP verification flow
]);

// ── Countdown: "1:45" from total seconds ──────────────────────────────────────
const fmtCountdown = (totalSec: number) => {
  if (totalSec <= 0) return '0:00';
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

// ── Human-readable remaining time: "2h 15m" or "12 min" ──────────────────────
const fmtRemaining = (mins: number) => {
  if (mins <= 0) return '< 1 min';
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

interface BarConfig {
  bg: string;
  border: string;
  icon: string;
  title: string;
  subtitle: string;
  titleColor: string;
  subtitleColor: string;
  targetRoute: string;
  needsBookingId: boolean;
}

// ── Build display config for ONE bar entry from theme + live clock ────────────
function buildConfig(entry: BarEntry, C: AppTheme['colors'], nowTs: number): BarConfig {
  const { variant, spaceName, vehiclePlate, parkerName, amount,
          durationHours, expiresAt, endsAtISO, otp, etaText } = entry;

  const approvalSec = expiresAt
    ? Math.max(0, Math.floor((new Date(expiresAt).getTime() - nowTs) / 1000))
    : 0;
  const remMins = minsUntil(endsAtISO);

  switch (variant) {
    // ── PARKER ──────────────────────────────────────────────────────────────
    case 'booking_pending':
      return {
        bg: C.warningBg, border: C.warningBgAlt, icon: '⏳',
        title: 'Awaiting owner approval',
        subtitle: `${spaceName} · expires in ${fmtCountdown(approvalSec)}`,
        titleColor: C.warning, subtitleColor: C.warning,
        targetRoute: '/(find-space)/booking-status', needsBookingId: true,
      };
    case 'booking_approved':
      return {
        bg: C.successBg, border: C.successBgAlt, icon: '✅',
        title: 'Booking approved! Head over',
        // Show the arrival deadline (etaText) so the parker doesn't forget to go.
        subtitle: [
          spaceName || null,
          etaText ? `Arrive by ${etaText}` : (durationHours ? `${durationHours}h booked` : null),
        ].filter(Boolean).join(' · ') || 'Tap to view details',
        titleColor: C.success, subtitleColor: C.success,
        targetRoute: '/(find-space)/booking-status', needsBookingId: true,
      };
    case 'arrived_otp_ready':
      return {
        bg: C.infoBg, border: C.infoBg, icon: '🚗',
        title: "You're on your way",
        subtitle: otp ? `${spaceName} · OTP: ${otp.split('').join(' ')}` : `${spaceName} · generating OTP…`,
        titleColor: C.info, subtitleColor: C.info,
        targetRoute: '/(find-space)/active-session', needsBookingId: true,
      };
    case 'session_active':
      return {
        bg: C.successBg, border: C.successBgAlt, icon: '🟢',
        title: 'Currently parked',
        subtitle: remMins !== null ? `${spaceName} · ${fmtRemaining(remMins)} remaining` : spaceName,
        titleColor: C.success, subtitleColor: C.success,
        targetRoute: '/(find-space)/active-session', needsBookingId: true,
      };
    case 'session_ending':
      return {
        bg: C.errorBg, border: C.errorBg, icon: '🔴',
        title: 'Session ending soon',
        subtitle: remMins !== null ? `${spaceName} · ${fmtRemaining(remMins)} left` : spaceName,
        titleColor: C.error, subtitleColor: C.error,
        targetRoute: '/(find-space)/active-session', needsBookingId: true,
      };
    case 'rating_pending':
      return {
        bg: C.warningBg, border: C.warningBgAlt, icon: '⭐',
        title: 'Rate your experience',
        subtitle: spaceName ? `How was your stay at ${spaceName}?` : 'Tap to rate your session',
        titleColor: C.warning, subtitleColor: C.warning,
        targetRoute: '/(find-space)/session-complete', needsBookingId: true,
      };

    // ── OWNER ───────────────────────────────────────────────────────────────
    case 'new_request':
      return {
        bg: C.warningBg, border: C.warningBgAlt, icon: '🔔',
        // Countdown right in the title so the owner sees urgency at a glance.
        title: `New booking request — ${fmtCountdown(approvalSec)} left`,
        subtitle: [parkerName, vehiclePlate, amount != null ? `₹${amount}` : null]
          .filter(Boolean).join(' · ') || 'Tap to review',
        titleColor: C.warning, subtitleColor: C.warning,
        targetRoute: '/(my-spaces)/booking-request', needsBookingId: true,
      };
    case 'parker_en_route':
      return {
        bg: C.infoBg, border: C.infoBg, icon: '🚗',
        title: 'Parker is on the way',
        subtitle: [spaceName, parkerName, vehiclePlate, etaText ? `ETA ${etaText}` : null]
          .filter(Boolean).join(' · '),
        titleColor: C.info, subtitleColor: C.info,
        // Parker is still travelling — there's nothing to VERIFY yet. Open the
        // booking details (ETA, vehicle, phone, directions) instead. Verification
        // only opens once the parker arrives (parker_at_gate).
        targetRoute: '/(my-spaces)/booking-request', needsBookingId: true,
      };
    case 'parker_at_gate':
      return {
        bg: C.pendingBg, border: C.pendingBg, icon: '🔑',
        title: 'Parker at gate — verify OTP',
        subtitle: [spaceName, parkerName, vehiclePlate].filter(Boolean).join(' · '),
        titleColor: C.warning, subtitleColor: C.warning,
        targetRoute: '/(my-spaces)/verify', needsBookingId: false,
      };
    case 'owner_session_active': {
      const endsDisplay = endsAtISO
        ? new Date(endsAtISO).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
        : null;
      return {
        bg: C.successBg, border: C.successBgAlt, icon: '🟢',
        title: etaText ? `${etaText} active` : 'Active session running',
        subtitle: [spaceName, parkerName, vehiclePlate, endsDisplay ? `ends ${endsDisplay}` : null]
          .filter(Boolean).join(' · '),
        titleColor: C.success, subtitleColor: C.success,
        targetRoute: '/(my-spaces)/active', needsBookingId: false,
      };
    }
    case 'owner_session_ending':
      return {
        bg: C.errorBg, border: C.errorBg, icon: '🔴',
        title: 'Session ending soon',
        subtitle: [spaceName, parkerName, remMins !== null ? `${fmtRemaining(remMins)} left` : null]
          .filter(Boolean).join(' · '),
        titleColor: C.error, subtitleColor: C.error,
        targetRoute: '/(my-spaces)/active', needsBookingId: false,
      };
    case 'owner_session_leaving':
      return {
        bg: C.warningBg, border: C.warningBgAlt, icon: '🚪',
        title: 'Parker leaving — confirm exit',
        subtitle: [spaceName, parkerName, vehiclePlate, 'tap to verify & complete']
          .filter(Boolean).join(' · '),
        titleColor: C.warning, subtitleColor: C.warning,
        targetRoute: '/(my-spaces)/active', needsBookingId: false,
      };
  }
}

// Variants that should fire a haptic the first time they appear (time-critical).
const URGENT_VARIANTS = new Set<BarVariant>([
  'new_request', 'session_ending', 'owner_session_ending',
  'owner_session_leaving', 'parker_at_gate',
]);

// ── Component ─────────────────────────────────────────────────────────────────
export default function SessionBar() {
  const router = useRouter();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const C = theme.colors;
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const bars = useSessionBarStore((s) => s.bars);
  const dismiss = useSessionBarStore((s) => s.dismiss);
  const pruneExpired = useSessionBarStore((s) => s.pruneExpired);
  // When offline, the bar may be showing the last-synced state — flag it so the
  // user knows it could be outdated rather than presenting stale data as live.
  const isOffline = useNetworkStore((s) => s.isConnected === false);

  // 1-second tick for live countdowns + expiry pruning.
  const [nowTs, setNowTs] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => {
      setNowTs(Date.now());
      pruneExpired(); // auto-flip: drop bars whose approval window hit 0
    }, 1000);
    return () => clearInterval(t);
  }, [pruneExpired]);

  // Context-scope the bar to the tab the user is in (mirrors Swiggy/Uber: each
  // context surfaces only its own status):
  //   • Owner tabs (my-spaces)  → OWNER bars only (new request, verify, etc.)
  //   • Find-space / History    → PARKER bars only (your booking, active session)
  //   • Home (the neutral hub)  → BOTH, stacked/swipeable — it's the one place a
  //                               dual-role user sees their parker booking AND an
  //                               incoming owner request at once.
  const group = segments[0];
  const inOwnerTabs = group === '(my-spaces)';
  const inHome = group === '(home)';
  const visibleBars = useMemo(
    () =>
      bars.filter((b) =>
        inHome ? true : inOwnerTabs ? b.source === 'owner' : b.source === 'parker',
      ),
    [bars, inHome, inOwnerTabs],
  );

  // Which card in the stack is showing.
  const [index, setIndex] = useState(0);
  useEffect(() => {
    // Keep index in range as the stack shrinks/grows.
    if (index > visibleBars.length - 1) setIndex(Math.max(0, visibleBars.length - 1));
  }, [visibleBars.length, index]);

  // Suppress on action screens.
  const lastSegment = segments[segments.length - 1] ?? '';
  const isSuppressed = HIDDEN_SEGMENTS.has(lastSegment);
  const shouldShow = visibleBars.length > 0 && !isSuppressed;

  const active = visibleBars[index] ?? visibleBars[0] ?? null;

  // ── Haptic when a NEW urgent bar first appears ──────────────────────────────
  const seenUrgent = useRef<Set<string>>(new Set());
  useEffect(() => {
    const currentUrgent = new Set(bars.filter((b) => URGENT_VARIANTS.has(b.variant)).map((b) => b.id));
    let fired = false;
    currentUrgent.forEach((id) => {
      if (!seenUrgent.current.has(id) && !fired) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        fired = true;
      }
    });
    seenUrgent.current = currentUrgent;
  }, [bars]);

  // ── Keyboard avoidance: lift the bar above the keyboard when it's open ──────
  const [kbHeight, setKbHeight] = useState(0);
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const sub1 = Keyboard.addListener(showEvt, (e) => setKbHeight(e.endCoordinates?.height ?? 0));
    const sub2 = Keyboard.addListener(hideEvt, () => setKbHeight(0));
    return () => { sub1.remove(); sub2.remove(); };
  }, []);

  // ── Slide-up spring (entrance/exit) ─────────────────────────────────────────
  const translateY = useRef(new Animated.Value(80)).current;
  useEffect(() => {
    Animated.spring(translateY, {
      toValue: shouldShow ? 0 : 80,
      useNativeDriver: true, damping: 18, stiffness: 200,
    }).start();
  }, [shouldShow, translateY]);

  // ── Cross-fade when the *content* of the visible card changes ──────────────
  const fade = useRef(new Animated.Value(1)).current;
  const prevKey = useRef<string>('');
  const contentKey = active ? `${active.id}` : '';
  useEffect(() => {
    if (contentKey && contentKey !== prevKey.current && prevKey.current !== '') {
      fade.setValue(0);
      Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    }
    prevKey.current = contentKey;
  }, [contentKey, fade]);

  // ── Horizontal swipe between stacked cards (only when 2+) ──────────────────
  const swipeX = useRef(new Animated.Value(0)).current;
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) =>
          visibleBars.length > 1 && Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderMove: Animated.event([null, { dx: swipeX }], { useNativeDriver: false }),
        onPanResponderRelease: (_e, g) => {
          const threshold = 60;
          if (g.dx <= -threshold && index < visibleBars.length - 1) {
            setIndex((i) => Math.min(visibleBars.length - 1, i + 1));
            Haptics.selectionAsync().catch(() => {});
          } else if (g.dx >= threshold && index > 0) {
            setIndex((i) => Math.max(0, i - 1));
            Haptics.selectionAsync().catch(() => {});
          }
          Animated.spring(swipeX, { toValue: 0, useNativeDriver: false }).start();
        },
      }),
    [visibleBars.length, index, swipeX],
  );

  const handlePress = useCallback((cfg: BarConfig, entry: BarEntry) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    // Informational bars (e.g. "Request expired") are dead status notices — there
    // is nothing to act on, so a tap does NOT navigate. The user dismisses them
    // with the X. Only actionable bars deep-link to their screen.
    if (isInformational(entry.variant)) return;
    const route = cfg.targetRoute as any;
    if (cfg.needsBookingId && entry.bookingId) {
      router.push({ pathname: route, params: { bookingId: entry.bookingId } });
    } else {
      router.push(route);
    }
  }, [router]);

  const handleDismiss = useCallback((entry: BarEntry) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    dismiss(entry.id);
    AccessibilityInfo.announceForAccessibility?.('Notification dismissed');
  }, [dismiss]);

  if (!active) return null;

  const cfg = buildConfig(active, C, nowTs);
  if (!cfg) return null;

  // Position: above the floating tab bar in my-spaces, else above safe area;
  // always clear the keyboard when it's open.
  const isInMySpaces = segments[0] === '(my-spaces)';
  const baseOffset = isInMySpaces
    ? TAB_BAR_TOTAL + 8                       // clears the floating tab bar
    : Math.max(insets.bottom, 8) + 4;
  const bottomOffset = kbHeight > 0 ? kbHeight + 8 : baseOffset;

  const canDismiss = isDismissible(active.variant);
  const a11yLabel = `${cfg.title}. ${cfg.subtitle}.${isOffline ? ' Offline, may be outdated.' : ''}${visibleBars.length > 1 ? ` ${index + 1} of ${visibleBars.length}.` : ''}`;

  return (
    <Animated.View
      style={[styles.wrapper, { bottom: bottomOffset, transform: [{ translateY }] }]}
      pointerEvents={shouldShow ? 'box-none' : 'none'}
      accessibilityLiveRegion="polite"
    >
      <Animated.View
        style={{ opacity: fade, transform: [{ translateX: swipeX }] }}
        {...(visibleBars.length > 1 ? panResponder.panHandlers : {})}
      >
        <Pressable
          onPress={() => handlePress(cfg, active)}
          accessibilityRole="button"
          accessibilityLabel={a11yLabel}
          accessibilityHint="Opens the related screen"
          android_ripple={{ color: 'rgba(0,0,0,0.06)', borderless: false }}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          style={({ pressed }) => [
            styles.bar,
            { backgroundColor: cfg.bg, borderColor: cfg.border },
            pressed && { transform: [{ scale: 0.985 }], opacity: 0.92 },
          ]}
        >
          <Text style={styles.icon} accessible={false}>{cfg.icon}</Text>
          <View style={styles.textBlock}>
            <Text style={[styles.title, { color: cfg.titleColor }]} numberOfLines={1}>
              {cfg.title}
            </Text>
            <Text style={[styles.subtitle, { color: cfg.subtitleColor }]} numberOfLines={1}>
              {isOffline ? `⚠ offline · ${cfg.subtitle}` : cfg.subtitle}
            </Text>
          </View>

          {/* Stack indicator: "1/2" + dots when multiple bars overlap */}
          {visibleBars.length > 1 && (
            <View style={styles.stackIndicator} accessible={false}>
              <Text style={[styles.stackCount, { color: cfg.subtitleColor }]}>
                {index + 1}/{visibleBars.length}
              </Text>
              <View style={styles.dotsRow}>
                {visibleBars.map((b, i) => (
                  <View
                    key={b.id}
                    style={[
                      styles.dot,
                      { backgroundColor: i === index ? cfg.titleColor : C.borderMuted },
                    ]}
                  />
                ))}
              </View>
            </View>
          )}

          {canDismiss ? (
            <TouchableOpacity
              onPress={() => handleDismiss(active)}
              accessibilityRole="button"
              accessibilityLabel="Dismiss"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.closeBtn}
            >
              <X size={16} color={cfg.subtitleColor} strokeWidth={2.5} />
            </TouchableOpacity>
          ) : (
            <Text style={[styles.chevron, { color: cfg.subtitleColor }]} accessible={false}>›</Text>
          )}
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const makeStyles = ({ colors: C, radius, fontSize, fontWeight, spacing }: AppTheme) =>
  StyleSheet.create({
    wrapper: {
      position: 'absolute',
      left: spacing['3xl'],
      right: spacing['3xl'],
      zIndex: 900,
    },
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: radius.lg,
      borderWidth: 1,
      paddingVertical: 10,
      paddingHorizontal: spacing['3xl'],
      gap: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.10,
      shadowRadius: 6,
      elevation: 4,
    },
    icon: { fontSize: 18, lineHeight: 22 },
    textBlock: { flex: 1, gap: 1 },
    title: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, lineHeight: 18 },
    subtitle: { fontSize: fontSize.xs, fontWeight: fontWeight.medium, lineHeight: 16 },
    chevron: { fontSize: 20, fontWeight: fontWeight.bold, lineHeight: 24, marginLeft: 2 },
    closeBtn: {
      width: 26, height: 26, borderRadius: 13,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.04)',
    },
    stackIndicator: { alignItems: 'center', gap: 3, marginRight: 2 },
    stackCount: { fontSize: 10, fontWeight: fontWeight.bold },
    dotsRow: { flexDirection: 'row', gap: 3 },
    dot: { width: 5, height: 5, borderRadius: 2.5 },
  });
