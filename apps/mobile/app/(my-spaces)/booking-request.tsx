import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, StatusBar, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView, Platform, Linking, DeviceEventEmitter, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Clock, User, Car, MapPin, XCircle, Phone, Star, TimerOff, Ban, ChevronLeft } from 'lucide-react-native';
import PageHeader from '../../components/PageHeader';
import { api } from '../../services/api';
import { useNetworkStore } from '../../store/networkStore';
import { useRealtime } from '../../hooks/useRealtime';
import { FontSize, FontWeight, BorderRadius, Spacing } from '../../theme';
import type { ColorsType } from '../../theme';
import { useTheme } from '../../hooks/useTheme';
import { toast } from '../../utils/toast';

const APPROVAL_WINDOW_SEC = 120; // 2 minutes

const fmt = (sec: number) =>
  `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

export default function BookingRequestScreen() {
  const router = useRouter();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const { onEvent } = useRealtime();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(false);
  const [nowTs, setNowTs] = useState(Date.now());

  const fetchBooking = useCallback(async () => {
    try {
      const data = await api.get(`/bookings/${bookingId}`);
      setBooking(data.booking || data.data || data);
    } catch (e) {
      if (__DEV__) console.log('[BOOKING_REQUEST] fetch error', e);
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => { fetchBooking(); }, [fetchBooking]);

  // This screen is the full action/status UI (Booking Request → Approved Booking),
  // so suppress the floating session bar the whole time it's mounted — it would
  // otherwise cover the Accept/Reject buttons or duplicate the status. Done via an
  // event (not route-based) because this hidden-tab screen isn't reliably detected
  // by Expo Router's segments/pathname.
  useEffect(() => {
    DeviceEventEmitter.emit('sessionbar:suppress', true);
    return () => { DeviceEventEmitter.emit('sessionbar:suppress', false); };
  }, []);

  // Tick every second to keep countdown live
  useEffect(() => {
    const t = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Real-time: if the parker cancels while we're looking at it, flip the status
  // INSTANTLY from the socket payload (no refetch wait), then refresh in the
  // background for any extra detail. The user sees it change immediately.
  useEffect(() => {
    const unsub = onEvent('booking:cancelled', (d: any) => {
      if (String(d.bookingId) !== String(bookingId)) return;
      setBooking((prev: any) => (prev ? { ...prev, status: 'CANCELLED' } : prev));
      setLoading(false);
      fetchBooking();
    });
    return unsub;
  }, [bookingId, fetchBooking, onEvent]);

  // Real-time: parker marked themselves as arrived — refetch so the APPROVED
  // view flips from "on the way" to "Parker has arrived" banner immediately.
  useEffect(() => {
    const unsub = onEvent('parker:arrived', (d: any) => {
      if (String(d.bookingId) !== String(bookingId)) return;
      fetchBooking();
    });
    return unsub;
  }, [bookingId, fetchBooking, onEvent]);

  const createdAt = booking?.createdAt ? new Date(booking.createdAt).getTime() : null;
  const elapsedSec = createdAt ? Math.floor((nowTs - createdAt) / 1000) : 0;
  const remainingSec = Math.max(0, APPROVAL_WINDOW_SEC - elapsedSec);
  const isExpired = elapsedSec >= APPROVAL_WINDOW_SEC;
  const isPending = booking?.status === 'PENDING_APPROVAL';

  const handleAction = async (action: 'accept' | 'decline') => {
    if (isExpired) return;
    if (!useNetworkStore.getState().requireOnline()) return;
    const label = action === 'accept' ? 'Accept' : 'Reject';
    Alert.alert(`${label} Booking?`, `Are you sure you want to ${label.toLowerCase()} this booking request?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: label,
        style: action === 'decline' ? 'destructive' : 'default',
        onPress: async () => {
          try {
            setActioning(true);
            // Unified decline contract: backend's declineBooking reads an OPTIONAL
            // `reason` and relays it to the parker. This screen has no reason input,
            // so send a sensible default (matching verify.tsx + OwnerBookingAlert).
            // Accept carries no body.
            await api.put(
              `/bookings/${bookingId}/${action}`,
              action === 'decline' ? { reason: 'Owner is unavailable right now' } : undefined,
            );
            await fetchBooking();
          } catch (e: any) {
            toast.error(e.message || 'Action failed');
          } finally {
            setActioning(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <PageHeader title="Booking Request" onBack={() => router.replace('/(my-spaces)')} />
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView style={styles.container}>
        <PageHeader title="Booking Request" onBack={() => router.replace('/(my-spaces)')} />
        <View style={styles.center}><Text style={styles.errText}>Booking not found</Text></View>
      </SafeAreaView>
    );
  }

  // Phone is mandatory (User.phone is required + unique), so fall back to it for
  // the display name when the parker hasn't set their first/last name yet —
  // more useful to the owner than a generic "Parker".
  const parkerName =
    [booking.parker?.firstName, booking.parker?.lastName].filter(Boolean).join(' ')
    || booking.parker?.phone
    || 'Parker';
  const parkerPhotoUrl: string | null = booking.parker?.photoUrl || null;
  const spaceName = booking.space?.name || 'Your Space';
  const duration = booking.duration ? `${booking.duration}h` : '-';
  const etaStr = booking.eta ? fmtTime(booking.eta) : '-';

  // Parker reputation (mutual ratings). Null-safe: older cached bookings may not
  // carry `parkerRating`, and a 0-count parker is "New" (a 0.0 ★ reads like a bad
  // rating, which is wrong for someone never rated).
  const parkerRatingCount = booking.parkerRating?.count ?? 0;
  const parkerRatingAvg = booking.parkerRating?.avg ?? 0;
  const hasParkerRating = parkerRatingCount > 0;

  // --- ACCEPTED → live "Approved Booking" status view (not a request anymore) ---
  if (booking.status === 'APPROVED') {
    const atGate = !!booking.arrivedAt || !!booking.sessionOtp;
    const parkerPhone = booking.parker?.phone || null;
    const callParker = () => {
      if (!parkerPhone) { Alert.alert('No phone', "Parker's phone number is not available."); return; }
      const normalised = /^\+/.test(parkerPhone) ? parkerPhone : `+91${parkerPhone}`;
      Linking.openURL(`tel:${normalised}`).catch(() =>
        Alert.alert('Error', 'Could not start the call.'));
    };
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <PageHeader title="Approved Booking" onBack={() => router.replace('/(my-spaces)')} />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Status banner */}
          <View style={[styles.approvedBanner, atGate && styles.approvedBannerGate]}>
            <Text style={styles.approvedBannerIcon}>{atGate ? '🔑' : '🚗'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.approvedBannerTitle}>
                {atGate ? 'Parker has arrived' : 'Parker is on the way'}
              </Text>
              <Text style={styles.approvedBannerSub}>
                {atGate ? 'Verify their OTP to start the session.' : 'You approved this booking — the parker is heading over.'}
              </Text>
            </View>
          </View>

          {/* Details */}
          <View style={styles.detailsCard}>
            <Text style={styles.cardTitle}>Booking Details</Text>
            <View style={styles.detailRow}>
              <View style={styles.detailLabelWrap}><User size={16} color={colors.textSecondary} /><Text style={styles.detailLabel}>Parker</Text></View>
              <Text style={styles.detailValue}>{parkerName}</Text>
            </View>
            <View style={styles.detailRow}>
              <View style={styles.detailLabelWrap}><MapPin size={16} color={colors.textSecondary} /><Text style={styles.detailLabel}>Space</Text></View>
              <Text style={styles.detailValue}>{spaceName}</Text>
            </View>
            <View style={styles.detailRow}>
              <View style={styles.detailLabelWrap}><Car size={16} color={colors.textSecondary} /><Text style={styles.detailLabel}>Vehicle</Text></View>
              <Text style={styles.detailValue}>{booking.vehicle?.licensePlate || '—'}</Text>
            </View>
            <View style={styles.detailRow}>
              <View style={styles.detailLabelWrap}><Clock size={16} color={colors.textSecondary} /><Text style={styles.detailLabel}>Expected Arrival</Text></View>
              <Text style={styles.detailValue}>{etaStr}</Text>
            </View>
          </View>

          {/* Contact / verify actions */}
          <TouchableOpacity style={styles.contactBtn} onPress={callParker}>
            <Text style={styles.contactBtnText}>📞  Contact Parker</Text>
          </TouchableOpacity>
          {atGate && (
            <TouchableOpacity style={styles.verifyBtn} onPress={() => router.push('/(my-spaces)/verify')}>
              <Text style={styles.verifyBtnText}>Verify OTP to Start</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // --- Terminal result (rejected / cancelled / expired) ---
  if (!isPending) {
    const isRejected = booking.status === 'REJECTED';
    const isCancelled = booking.status === 'CANCELLED';

    // State-appropriate visuals: rejected = red (an action you took), expired =
    // neutral amber (nothing went "wrong", the window just passed), cancelled =
    // muted grey. Each gets its own icon + tint instead of one generic red box.
    const result = isRejected
      ? { title: 'Request Rejected', sub: 'You declined this booking. The parker has been notified.', Icon: Ban, tint: colors.error, soft: colors.errorBg }
      : isCancelled
        ? { title: 'Booking Cancelled', sub: 'This booking was cancelled and is no longer active.', Icon: XCircle, tint: colors.textSecondary, soft: colors.surfaceBg }
        : { title: 'Request Expired', sub: 'This request expired before any action was taken. The parker can send a new one.', Icon: TimerOff, tint: colors.warningAlt, soft: colors.warningBgAlt };

    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <PageHeader title="Booking Request" onBack={() => router.replace('/(my-spaces)')} />
        <View style={styles.resultWrap}>
          <View style={styles.resultBody}>
            {/* Layered icon badge — faint outer halo ring + solid soft inner circle */}
            <View style={[styles.resultBadgeOuter, { borderColor: result.soft }]}>
              <View style={[styles.resultBadgeInner, { backgroundColor: result.soft }]}>
                <result.Icon size={40} color={result.tint} strokeWidth={2} />
              </View>
            </View>
            <Text style={styles.resultTitle}>{result.title}</Text>
            <Text style={styles.resultSub}>{result.sub}</Text>
          </View>

          {/* Primary action pinned to the bottom of the screen */}
          <TouchableOpacity style={styles.resultBtn} onPress={() => router.back()} activeOpacity={0.85}>
            <ChevronLeft size={18} color={colors.white} strokeWidth={2.5} />
            <Text style={styles.resultBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // --- Active pending request ---
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <PageHeader title="Booking Request" onBack={() => router.replace('/(my-spaces)')} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Countdown pill */}
        {!isExpired ? (
          <View style={[styles.countdownBanner, remainingSec < 30 && styles.countdownBannerUrgent]}>
            <Clock size={16} color={remainingSec < 30 ? colors.error : colors.warning} />
            <Text style={[styles.countdownText, remainingSec < 30 && styles.countdownTextUrgent]}>
              Respond within {fmt(remainingSec)}
            </Text>
          </View>
        ) : (
          <View style={styles.expiredBanner}>
            <Clock size={16} color={colors.textSecondary} />
            <Text style={styles.expiredBannerText}>This request has expired</Text>
          </View>
        )}

        {/* Parker info */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={styles.avatarCircle}>
              {parkerPhotoUrl ? (
                <Image source={{ uri: parkerPhotoUrl }} style={styles.avatarImg} resizeMode="cover" onError={() => {}} />
              ) : (
                <Text style={styles.avatarText}>{parkerName.charAt(0).toUpperCase()}</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.parkerName}>{parkerName}</Text>
              <View style={styles.ratingRow}>
                {hasParkerRating ? (
                  <>
                    <Star size={14} color={colors.warning} fill={colors.warning} />
                    <Text style={styles.ratingText}>
                      {parkerRatingAvg.toFixed(1)} ({parkerRatingCount} {parkerRatingCount === 1 ? 'rating' : 'ratings'})
                    </Text>
                  </>
                ) : (
                  <>
                    <Star size={14} color={colors.textMuted} />
                    <Text style={styles.ratingTextMuted}>New parker</Text>
                  </>
                )}
              </View>
              <Text style={styles.parkerSub}>wants to park at your space</Text>
            </View>
          </View>
        </View>

        {/* Booking details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Booking Details</Text>
          <View style={styles.detailRow}>
            <MapPin size={16} color={colors.textSecondary} />
            <Text style={styles.detailLabel}>Space</Text>
            <Text style={styles.detailValue}>{spaceName}</Text>
          </View>
          <View style={styles.detailRow}>
            <Car size={16} color={colors.textSecondary} />
            <Text style={styles.detailLabel}>Vehicle</Text>
            <Text style={styles.detailValue}>
              {booking.vehicle?.licensePlate || '-'} ({booking.vehicle?.vehicleType || '-'})
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Clock size={16} color={colors.textSecondary} />
            <Text style={styles.detailLabel}>Duration</Text>
            <Text style={styles.detailValue}>{duration}</Text>
          </View>
          <View style={styles.detailRow}>
            <User size={16} color={colors.textSecondary} />
            <Text style={styles.detailLabel}>Arrival ETA</Text>
            <Text style={styles.detailValue}>{etaStr}</Text>
          </View>
          <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.detailLabel}>Amount</Text>
            <Text style={[styles.detailValue, { color: colors.primary, fontWeight: FontWeight.extrabold, fontSize: FontSize.xl }]}>
              ₹{booking.totalAmount}
            </Text>
          </View>
        </View>

        {/* Vehicle Photo */}
        <View style={styles.vehiclePhotoCard}>
          <Text style={styles.vehiclePhotoTitle}>Vehicle Photo</Text>
          {booking.vehicle?.frontPhotoUrl ? (
            <Image
              source={{ uri: booking.vehicle.frontPhotoUrl }}
              style={styles.vehiclePhotoImg}
              resizeMode="cover"
              onError={() => {}}
            />
          ) : (
            <View style={styles.vehiclePhotoPlaceholder}>
              <Text style={styles.vehiclePhotoPlaceholderIcon}>🚗</Text>
              <Text style={styles.vehiclePhotoPlaceholderText}>No photo uploaded by parker</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Action footer */}
      {!isExpired && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.rejectBtn}
            onPress={() => handleAction('decline')}
            disabled={actioning}
          >
            {actioning ? <ActivityIndicator color={colors.error} /> : <Text style={styles.rejectBtnText}>Reject</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.acceptBtn}
            onPress={() => handleAction('accept')}
            disabled={actioning}
          >
            {actioning ? <ActivityIndicator color={colors.white} /> : <Text style={styles.acceptBtnText}>Accept</Text>}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors: ColorsType) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing['4xl'] },
  errText: { color: colors.textSecondary, fontSize: FontSize.lg },   // 15 = lg ✓

  content: { padding: Spacing.screenH, gap: Spacing['2xl'], paddingBottom: 120 },

  countdownBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: colors.warningBgAlt, borderRadius: BorderRadius.md, padding: Spacing['2xl'],  // 12 = md ✓
    borderLeftWidth: 4, borderLeftColor: colors.warning,
  },
  countdownBannerUrgent: { backgroundColor: colors.errorBg, borderLeftColor: colors.error },
  countdownText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: colors.warning, flex: 1 },  // 14 = md ✓
  countdownTextUrgent: { color: colors.error },
  expiredBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: colors.surfaceBg, borderRadius: BorderRadius.md, padding: Spacing['2xl'],  // 12 = md ✓
    borderLeftWidth: 4, borderLeftColor: colors.textMuted,
  },
  expiredBannerText: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: colors.textSecondary },  // 14 = md ✓

  card: {
    backgroundColor: colors.white, borderRadius: BorderRadius.button, padding: Spacing['3xl'],  // 14 = button ✓
    borderWidth: 1, borderColor: colors.border,
  },
  cardTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: colors.textPrimary, marginBottom: Spacing.xl },  // 14 = md ✓
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xl },
  avatarCircle: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.primaryBg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%', borderRadius: 24 },
  avatarText: { fontSize: FontSize['3xl'], fontWeight: FontWeight.extrabold, color: colors.primary },  // 20 = 3xl ✓
  parkerName: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: colors.textPrimary },  // 16 = xl ✓
  parkerSub: { fontSize: FontSize.sm, color: colors.textSecondary, marginTop: Spacing.micro },  // 12 = sm ✓
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.micro, marginTop: Spacing.micro },
  ratingText: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: colors.textPrimary },  // 13 = base ✓
  ratingTextMuted: { fontSize: FontSize.base, fontWeight: FontWeight.medium, color: colors.textMuted },  // 13 = base ✓

  detailRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.lg,
    paddingVertical: Spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.surfaceBg,
  },
  detailLabel: { fontSize: FontSize.base, color: colors.textSecondary, fontWeight: FontWeight.medium, flex: 1 },  // 13 = base ✓
  detailValue: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: colors.textPrimary, textAlign: 'right', flex: 2 },  // 13 = base ✓
  detailValueLink: { color: colors.primary, textDecorationLine: 'underline' },
  vehiclePhotoCard: {
    backgroundColor: colors.white, borderRadius: BorderRadius.xl,
    borderWidth: 1, borderColor: colors.borderLight,
    overflow: 'hidden', marginBottom: Spacing['3xl'],
  },
  vehiclePhotoTitle: {
    fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: colors.textSecondary,
    paddingHorizontal: Spacing['3xl'], paddingVertical: Spacing['2xl'],
  },
  vehiclePhotoImg: { width: '100%', height: 200 },
  vehiclePhotoPlaceholder: {
    height: 120, alignItems: 'center', justifyContent: 'center', gap: Spacing.md,
    backgroundColor: colors.screenBg,
  },
  vehiclePhotoPlaceholderIcon: { fontSize: 32 },
  vehiclePhotoPlaceholderText: { fontSize: FontSize.sm, color: colors.textMuted },

  // ── Approved-booking status view ──────────────────────────────────────
  detailLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  detailsCard: {
    backgroundColor: colors.white, borderRadius: BorderRadius.lg,
    padding: Spacing.screenH, borderWidth: 1, borderColor: colors.border,
  },
  approvedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.lg,
    backgroundColor: colors.infoBg, borderRadius: BorderRadius.lg, padding: Spacing.screenH,
  },
  approvedBannerGate: { backgroundColor: colors.warningBg },
  approvedBannerIcon: { fontSize: 28 },
  approvedBannerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: colors.textPrimary },  // 15 = lg
  approvedBannerSub: { fontSize: FontSize.base, color: colors.textSecondary, marginTop: 2 },  // 13 = base
  contactBtn: {
    backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.primary,
    borderRadius: BorderRadius.md, paddingVertical: Spacing['2xl'], alignItems: 'center',
  },
  contactBtnText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: colors.primary },  // 15 = lg
  verifyBtn: {
    backgroundColor: colors.primary, borderRadius: BorderRadius.md,
    paddingVertical: Spacing['2xl'], alignItems: 'center',
  },
  verifyBtnText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: colors.white },  // 15 = lg

  footer: {
    flexDirection: 'row', gap: Spacing.xl, paddingHorizontal: Spacing.screenH, paddingTop: Spacing['3xl'],
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
    backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border,
  },
  rejectBtn: {
    flex: 1, paddingVertical: Spacing['2xl'], borderRadius: BorderRadius.md,  // 12 = md ✓
    borderWidth: 1.5, borderColor: colors.error, alignItems: 'center',
  },
  rejectBtnText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: colors.error },  // 15 = lg ✓
  acceptBtn: {
    flex: 1, paddingVertical: Spacing['2xl'], borderRadius: BorderRadius.md,  // 12 = md ✓
    backgroundColor: colors.success, alignItems: 'center',
  },
  acceptBtnText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: colors.white },  // 15 = lg ✓

  // ── Terminal result (rejected / cancelled / expired) — clean centered state ──
  resultWrap: {
    flex: 1,
    paddingHorizontal: Spacing['4xl'],
    paddingBottom: Spacing['4xl'],
    justifyContent: 'space-between',
  },
  resultBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  resultBadgeOuter: {
    width: 108,
    height: 108,
    borderRadius: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 8,
    marginBottom: Spacing.md,
  },
  resultBadgeInner: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultTitle: {
    fontSize: FontSize['4xl'],
    fontWeight: FontWeight.extrabold,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  resultSub: {
    fontSize: FontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: Spacing.xl,
  },
  resultBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: colors.primary,
    paddingVertical: Spacing['2xl'],
    borderRadius: BorderRadius.button,
    width: '100%',
  },
  resultBtnText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: colors.white },
});
