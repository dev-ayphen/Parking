import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Linking,
  Alert,
  BackHandler,
  DeviceEventEmitter} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Phone,
  MessageSquare,
  Navigation,
} from 'lucide-react-native';
import { api } from '../../services/api';
import { useNetworkStore, NETWORK_RECONNECTED } from '../../store/networkStore';
import PageHeader from '../../components/PageHeader';
import { useRealtime } from '../../hooks/useRealtime';
import { useSessionBarStore, computeExpiresAt } from '../../store/sessionBarStore';
import { FontSize, FontWeight, BorderRadius, Spacing, ExtendedColors } from '../../theme';
import { useTheme, type AppTheme } from '../../hooks/useTheme';

interface BookingData {
  id: string | number;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'ACTIVE' | 'COMPLETED' | 'EXPIRED';
  duration: number; // in hours
  totalAmount: number;
  eta: string;
  createdAt?: string;
  space: {
    name: string;
    address: string;
    lat: number;
    lng: number;
    hourlyRate: number;
    owner?: {
      phoneNumber?: string;
    };
  };
  vehicle: {
    licensePlate: string;
    vehicleType: string;
  };
}

const ETA_PRESETS = [10, 20, 30, 45, 60]; // minutes from now

export default function BookingStatusScreen() {
  const theme = useTheme();
  const { colors: C, isDark } = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const params = useLocalSearchParams();
  const router = useRouter();
  const bookingId = params.bookingId as string;
  const setBarForSource = useSessionBarStore((s) => s.setBarForSource);
  const clearSource = useSessionBarStore((s) => s.clearSource);
  const setBar = useCallback((b: any) => setBarForSource('parker', b), [setBarForSource]);
  const clearBar = useCallback(() => clearSource('parker'), [clearSource]);

  const isMounted = useRef(true);
  useEffect(() => { return () => { isMounted.current = false; }; }, []);

  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ETA update
  const [selectedEtaMin, setSelectedEtaMin] = useState<number | null>(null);
  const [etaUpdating, setEtaUpdating] = useState(false);

  // 5-minute approval countdown (ticks while waiting)
  const [nowTs, setNowTs] = useState(Date.now());

  const fetchBooking = useCallback(async () => {
    try {
      const data = await api.get(`/bookings/${bookingId}`);
      setBooking(data.booking || data.data || data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  // Back should always land on the Home hub — the user reaches this screen from
  // several places (booking-success, my-bookings, recent-activity), and a plain
  // router.back() can drop them back into the now-stale booking-creation flow.
  // replace() avoids stacking and guarantees a predictable destination.
  const handleBack = useCallback(() => {
    router.replace('/(home)');
  }, [router]);

  // Android hardware back button: route to Home too (not just the on-screen
  // chevron). Without this, the system back does a default pop that can land the
  // user back in the stale booking-creation flow. Returning true blocks the pop.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        handleBack();
        return true;
      });
      return () => sub.remove();
    }, [handleBack])
  );

  // Re-fetch when connectivity is restored (offline banner's "Retry" / auto-
  // reconnect) so the booking status reloads instead of going stale.
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(NETWORK_RECONNECTED, () => fetchBooking());
    return () => sub.remove();
  }, [fetchBooking]);

  // Realtime updates
  const { onEvent } = useRealtime();

  // Apply a new status to the local booking IMMEDIATELY from the socket payload,
  // so the screen flips the instant the event arrives — without waiting for a
  // full re-fetch round-trip. We still refetch in the background to fill in any
  // extra detail (reason, amounts), but the user sees the change with no delay.
  const applyStatusNow = useCallback((status: BookingData['status']) => {
    setBooking((prev) => (prev ? { ...prev, status } : prev));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!bookingId) return;
    const forThis = (data: any) => String(data?.bookingId) === String(bookingId);

    const unsub1 = onEvent('booking:approved', (data: any) => {
      if (forThis(data)) { applyStatusNow('APPROVED'); fetchBooking(); }
    });
    const unsub2 = onEvent('booking:rejected', (data: any) => {
      if (forThis(data)) { applyStatusNow('REJECTED'); fetchBooking(); }
    });
    const unsub3 = onEvent('session:started', (data: any) => {
      if (forThis(data)) { applyStatusNow('ACTIVE'); fetchBooking(); }
    });
    const unsub4 = onEvent('verification:ready', (data: any) => {
      if (forThis(data)) fetchBooking();
    });
    const unsub5 = onEvent('booking:expired', (data: any) => {
      if (forThis(data)) { applyStatusNow('EXPIRED'); fetchBooking(); }
    });
    // Cancellation — by the owner, the other party, or an auto no-show release.
    // This is the cross-device case: flip to CANCELLED the instant it arrives.
    const unsub6 = onEvent('booking:cancelled', (data: any) => {
      if (forThis(data)) { applyStatusNow('CANCELLED'); fetchBooking(); }
    });

    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
      unsub5();
      unsub6();
    };
  }, [bookingId, fetchBooking, onEvent, applyStatusNow]);

  // ── Feed session bar from this screen's booking data ──────────────────
  useEffect(() => {
    if (!booking || !bookingId) return;
    const spaceName = booking.space?.name ?? '';
    const status = booking.status;

    if (status === 'PENDING_APPROVAL') {
      setBar({
        variant: 'booking_pending',
        bookingId: String(bookingId),
        spaceName,
        parkerName: '',
        vehiclePlate: booking.vehicle?.licensePlate ?? '',
        amount: booking.totalAmount ?? null,
        durationHours: booking.duration ?? null,
        expiresAt: booking.createdAt ? computeExpiresAt(booking.createdAt) : null,
        endsAtISO: null,
        otp: null,
        etaText: null,
      });
    } else if (status === 'APPROVED') {
      setBar({
        variant: 'booking_approved',
        bookingId: String(bookingId),
        spaceName,
        parkerName: '',
        vehiclePlate: booking.vehicle?.licensePlate ?? '',
        amount: booking.totalAmount ?? null,
        durationHours: booking.duration ?? null,
        expiresAt: null,
        endsAtISO: null,
        otp: null,
        etaText: null,
      });
    } else if (status === 'CANCELLED' || status === 'REJECTED' || status === 'EXPIRED') {
      clearBar();
    }
  }, [booking, bookingId, setBar, clearBar]);

  // Navigate forward when ACTIVE
  useEffect(() => {
    if (booking?.status === 'ACTIVE') {
      if (!isMounted.current) return;
      router.replace({
        pathname: '/(find-space)/active-session',
        params: { bookingId },
      });
    }
  }, [booking?.status, bookingId, router]);

  // Tick every second while waiting for approval
  useEffect(() => {
    if (booking?.status !== 'PENDING_APPROVAL') return;
    const t = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(t);
  }, [booking?.status]);

  // Data-poll fallback: while the booking is still in flight (not a terminal
  // state), refetch every 8s. The socket pushes updates instantly; this only
  // covers the case where a socket event was missed (e.g. dropped on flaky Wi-Fi
  // in Expo Go), so the screen never stays stale waiting on a push that didn't land.
  useEffect(() => {
    const terminal = ['CANCELLED', 'REJECTED', 'EXPIRED', 'COMPLETED'];
    if (!booking || terminal.includes(booking.status)) return;
    const t = setInterval(() => { fetchBooking(); }, 8000);
    return () => clearInterval(t);
  }, [booking?.status, fetchBooking]);

  // Remaining seconds in the 5-minute approval window (null when not waiting)
  const countdownSec =
    booking?.status === 'PENDING_APPROVAL' && booking?.createdAt
      ? Math.max(0, 300 - Math.floor((nowTs - new Date(booking.createdAt).getTime()) / 1000))
      : null;

  const shortId = booking ? `#${String(booking.id).slice(-6).toUpperCase()}` : '';
  const fmtCountdown = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const handleCancel = async () => {
    Alert.alert('Cancel Request', 'Are you sure you want to cancel this booking request?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            setActionLoading(true);
            await api.put(`/bookings/${bookingId}/cancel`);
            router.back();
          } catch (err: any) {
            Alert.alert('Error', err.message);
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleArrived = async () => {
    if (!useNetworkStore.getState().requireOnline()) return;
    try {
      setActionLoading(true);
      await api.put(`/bookings/${bookingId}/arrived`);
      // Move to active-session so the parker can acknowledge the condition (if any)
      // and GENERATE the arrival OTP to show the owner. (Booking is still APPROVED here;
      // active-session handles the APPROVED → OTP → ACTIVE sub-states.)
      router.replace({
        pathname: '/(find-space)/active-session',
        params: { bookingId },
      });
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateEta = async () => {
    if (selectedEtaMin == null) return;
    try {
      setEtaUpdating(true);
      const newEta = new Date(Date.now() + selectedEtaMin * 60 * 1000).toISOString();
      await api.put(`/bookings/${bookingId}/eta`, { eta: newEta });
      setSelectedEtaMin(null);
      Alert.alert('Arrival Time Updated', 'The owner has been notified of your new ETA.');
      fetchBooking();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setEtaUpdating(false);
    }
  };

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <PageHeader title="Booking Status" onBack={handleBack} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !booking) {
    return (
      <SafeAreaView style={styles.container}>
        <PageHeader title="Booking Status" onBack={handleBack} />
        <View style={styles.center}>
          <Text style={styles.errorText}>{error || 'Booking not found'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchBooking}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Status visuals — SOFT tinted card (light bg + colored icon + dark text),
  // not a harsh solid banner. Calmer, more premium, consistent with the app.
  let heroTint  = '#B45309'; // amber-700 (icon/accent)
  let heroSoft  = '#FEF3C7'; // amber-100 (badge bg)
  let heroIcon  = (c: string) => <Clock size={22} color={c} strokeWidth={2.5} />;
  let heroTitle = 'Waiting for Approval';
  let heroSub   = 'The owner has been notified.';

  if (booking.status === 'APPROVED') {
    heroTint = '#15803D'; heroSoft = '#DCFCE7';
    heroIcon = (c) => <CheckCircle2 size={22} color={c} strokeWidth={2.5} />;
    heroTitle = 'Booking Approved 🎉';
    heroSub   = 'Head to the space.';
  } else if (booking.status === 'REJECTED' || booking.status === 'CANCELLED') {
    heroTint = '#B91C1C'; heroSoft = '#FEE2E2';
    heroIcon = (c) => <XCircle size={22} color={c} strokeWidth={2.5} />;
    heroTitle = booking.status === 'REJECTED' ? 'Booking Rejected' : 'Booking Cancelled';
    heroSub   = 'The owner declined this booking.';
  } else if (booking.status === 'ACTIVE') {
    heroTint = '#1D4ED8'; heroSoft = '#DBEAFE';
    heroIcon = (c) => <CheckCircle2 size={22} color={c} strokeWidth={2.5} />;
    heroTitle = 'Session Active';
    heroSub   = '';
  } else if (booking.status === 'EXPIRED') {
    heroTint = '#475569'; heroSoft = '#E2E8F0';
    heroIcon = (c) => <Clock size={22} color={c} strokeWidth={2.5} />;
    heroTitle = 'Request Expired';
    heroSub   = 'Owner did not respond within 5 minutes.';
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <PageHeader title="Booking Status" onBack={handleBack} />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} showsVerticalScrollIndicator={false}>

        {/* Status Hero — compact horizontal row */}
        <View style={[styles.heroCard, { backgroundColor: heroSoft, borderColor: heroTint + '40' }]}>
          {heroIcon(heroTint)}
          <View style={styles.heroTextWrap}>
            <Text style={[styles.heroTitle, { color: heroTint }]}>{heroTitle}</Text>
            {heroSub ? <Text style={styles.heroSub}>{heroSub}</Text> : null}
          </View>
          {booking.status === 'PENDING_APPROVAL' && countdownSec != null && (
            <View style={[styles.countdownPill, { backgroundColor: heroTint }]}>
              <Clock size={12} color="#fff" />
              <Text style={styles.countdownText}>
                {countdownSec > 0 ? fmtCountdown(countdownSec) : '—'}
              </Text>
            </View>
          )}
        </View>

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Booking Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Booking ID</Text>
            <Text style={styles.summaryVal}>{shortId}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Space</Text>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={styles.summaryVal}>{booking.space?.name}</Text>
              <Text style={styles.summaryValSub}>{booking.space?.address}</Text>
            </View>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Vehicle</Text>
            <Text style={styles.summaryVal}>{booking.vehicle?.licensePlate} ({booking.vehicle?.vehicleType})</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Duration</Text>
            <Text style={styles.summaryVal}>{booking.duration} hr(s)</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Arrival Time</Text>
            <Text style={styles.summaryVal}>{formatTime(booking.eta)}</Text>
          </View>
          <View style={[styles.summaryRow, styles.summaryRowLast]}>
            <Text style={styles.summaryLabel}>Amount</Text>
            <Text style={styles.summaryValAmount}>₹{booking.totalAmount}</Text>
          </View>

          {/* Contact actions — a compact strip inside the Summary card (only once
              approved), so there's no separate big "Contact Owner" card. */}
          {booking.status === 'APPROVED' && (
            <View style={styles.contactStrip}>
              <TouchableOpacity
                style={styles.contactAction}
                activeOpacity={0.7}
                onPress={() => {
                  const num = booking.space?.owner?.phoneNumber;
                  if (num) Linking.openURL(`tel:${num}`);
                  else Alert.alert('Unavailable', 'Phone number not provided.');
                }}
              >
                <View style={[styles.contactIcon, { backgroundColor: C.successBg }]}>
                  <Phone size={18} color={C.success} strokeWidth={2.2} />
                </View>
                <Text style={styles.contactLabel}>Call</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.contactAction}
                activeOpacity={0.7}
                onPress={() => {
                  const num = booking.space?.owner?.phoneNumber;
                  if (num) Linking.openURL(`sms:${num}`);
                  else Alert.alert('Unavailable', 'Phone number not provided.');
                }}
              >
                <View style={[styles.contactIcon, { backgroundColor: ExtendedColors.indigoBg }]}>
                  <MessageSquare size={18} color={ExtendedColors.indigoAccent} strokeWidth={2.2} />
                </View>
                <Text style={styles.contactLabel}>Message</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.contactAction}
                activeOpacity={0.7}
                onPress={() => {
                  const { lat, lng } = booking.space;
                  Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
                }}
              >
                <View style={[styles.contactIcon, { backgroundColor: C.primaryBg }]}>
                  <Navigation size={18} color={C.primary} strokeWidth={2.2} />
                </View>
                <Text style={styles.contactLabel}>Navigate</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Update Arrival Time (while waiting or on the way) */}
        {(booking.status === 'PENDING_APPROVAL' || booking.status === 'APPROVED') && (
          <View style={styles.etaCard}>
            <Text style={styles.cardTitle}>Update Arrival Time</Text>
            <Text style={styles.etaHint}>Running late? Let the owner know your new ETA.</Text>
            <View style={styles.etaChipRow}>
              {ETA_PRESETS.map((m) => {
                const active = selectedEtaMin === m;
                return (
                  <TouchableOpacity
                    key={m}
                    style={[styles.etaChip, active && styles.etaChipActive]}
                    onPress={() => setSelectedEtaMin(m)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.etaChipText, active && styles.etaChipTextActive]}>{m} min</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity
              // Outlined/muted until a time is picked, then a clear FILLED pink
              // call-to-action so it's obvious this sends the update to the owner.
              style={[
                styles.etaUpdateBtn,
                selectedEtaMin != null && styles.etaUpdateBtnReady,
                etaUpdating && styles.etaUpdateBtnDisabled,
              ]}
              onPress={handleUpdateEta}
              disabled={selectedEtaMin == null || etaUpdating}
              activeOpacity={0.85}
            >
              {etaUpdating ? (
                <ActivityIndicator color={C.white} size="small" />
              ) : (
                <Text style={[styles.etaUpdateBtnText, selectedEtaMin != null && styles.etaUpdateBtnTextReady]}>
                  {selectedEtaMin ? 'Update Arrival Time' : 'Select a time above'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Sticky Footer */}
      <View style={styles.footer}>
        {booking.status === 'PENDING_APPROVAL' && (
          <TouchableOpacity
            style={styles.btnOutlineDanger}
            onPress={handleCancel}
            disabled={actionLoading}
          >
            {actionLoading ? <ActivityIndicator color={C.error} /> : <Text style={styles.btnOutlineDangerText}>Cancel Request</Text>}
          </TouchableOpacity>
        )}
        {booking.status === 'APPROVED' && (
          <>
            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={handleArrived}
              disabled={actionLoading}
            >
              {actionLoading ? <ActivityIndicator color={C.white} /> : <Text style={styles.btnPrimaryText}>I Have Arrived</Text>}
            </TouchableOpacity>
            {/* Parker can still back out before arriving (traffic, changed plans). */}
            <TouchableOpacity
              style={[styles.btnTextDanger]}
              onPress={handleCancel}
              disabled={actionLoading}
            >
              <Text style={styles.btnTextDangerLabel}>Cancel Booking</Text>
            </TouchableOpacity>
          </>
        )}
        {(booking.status === 'REJECTED' || booking.status === 'CANCELLED') && (
          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={() => router.replace('/(find-space)')}
          >
            <Text style={styles.btnPrimaryText}>Find Another Space</Text>
          </TouchableOpacity>
        )}
        {booking.status === 'EXPIRED' && (
          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={() => router.replace('/(find-space)')}
          >
            <Text style={styles.btnPrimaryText}>Search Other Spaces</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const makeStyles = ({ colors: C }: AppTheme) => StyleSheet.create({
  // White SafeAreaView so the header + top safe-area inset match every other
  // screen (which use white). The scrollable content below keeps its grey bg
  // (see `content`) so the cards still stand out.
  container: { flex: 1, backgroundColor: C.white },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.screenBg },
  errorText: { color: C.error, marginBottom: Spacing.xl },           // 12 = xl ✓
  retryBtn: { padding: Spacing.xl, backgroundColor: C.errorBg, borderRadius: BorderRadius.sm },  // 12 = xl ✓
  retryBtnText: { color: C.error, fontWeight: FontWeight.semibold },
  content: { flex: 1, backgroundColor: C.screenBg },
  contentInner: { padding: Spacing.screenH, gap: Spacing['3xl'], paddingBottom: 28 },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xl,
    paddingVertical: Spacing['2xl'],
    paddingHorizontal: Spacing['3xl'],
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  heroIconCircle: {},
  heroTextWrap: { flex: 1 },
  heroTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold },
  heroSub: { fontSize: FontSize.sm, color: C.textSecondary, marginTop: 2 },
  countdownPill: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm, borderRadius: 20, marginTop: Spacing.lg,
    alignSelf: 'flex-start',
  },
  countdownText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: '#fff' },
  summaryCard: {
    backgroundColor: C.white,
    borderRadius: BorderRadius.lg,                    // 16 = lg ✓
    padding: Spacing.screenH,
    borderWidth: 1,
    borderColor: C.border,                       // '#E2E8F0' = border ✓
  },
  cardTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: C.textPrimary, marginBottom: Spacing['3xl'] },  // 16 = xl ✓
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,                         // 12 = xl ✓
  },
  summaryRowLast: { marginBottom: 0, marginTop: Spacing.xl, paddingTop: Spacing.xl, borderTopWidth: 1, borderTopColor: C.surfaceBg, borderStyle: 'dashed' },  // 12 = xl ✓
  summaryLabel: { color: C.textSecondary, fontSize: FontSize.md, fontWeight: FontWeight.medium },      // 14 = md ✓
  summaryVal: { color: C.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.semibold, textAlign: 'right' },   // 14 = md ✓
  summaryValSub: { color: C.textMuted, fontSize: FontSize.sm, textAlign: 'right', marginTop: 2 },    // 12 = sm ✓
  summaryValAmount: { color: C.primary, fontSize: FontSize['2xl'], fontWeight: FontWeight.extrabold },  // 18 = 2xl ✓
  contactCard: {
    backgroundColor: C.white,
    borderRadius: BorderRadius.lg,                    // 16 = lg ✓
    padding: Spacing.screenH,
    borderWidth: 1,
    borderColor: C.border,                       // '#E2E8F0' = border ✓
  },
  actionRow: { flexDirection: 'row', gap: Spacing.md },
  etaCard: {
    backgroundColor: C.white,
    borderRadius: BorderRadius.lg,                    // 16 = lg ✓
    padding: Spacing.screenH,
    borderWidth: 1,
    borderColor: C.border,                       // '#E2E8F0' = border ✓
  },
  etaHint: { fontSize: FontSize.base, color: C.textSecondary, marginTop: -8, marginBottom: Spacing['2xl'] },  // 13 = base ✓
  etaChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginBottom: Spacing['3xl'] },
  etaChip: {
    paddingHorizontal: Spacing['3xl'],
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,                    // 12 = md ✓
    borderWidth: 1.5,
    borderColor: C.border,                       // '#E2E8F0' = border ✓
    backgroundColor: C.white,
  },
  etaChipActive: { borderColor: C.primary, backgroundColor: C.primaryBg },
  etaChipText: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: C.textSecondary },  // 13 = base ✓
  etaChipTextActive: { color: C.primary },
  etaUpdateBtn: {
    // Default (no time picked): muted outlined placeholder — clearly not yet tappable.
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: BorderRadius.md,                    // 12 = md ✓
    paddingVertical: Spacing['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.white,
  },
  // A time is selected → solid pink call-to-action.
  etaUpdateBtnReady: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  etaUpdateBtnDisabled: { opacity: 0.6 },
  etaUpdateBtnText: { color: C.textMuted, fontSize: FontSize.md, fontWeight: FontWeight.bold },  // 14 = md ✓
  etaUpdateBtnTextReady: { color: C.white },
  // Compact contact strip INSIDE the Summary card (dashed top divider), so the
  // 3 actions don't need their own large "Contact Owner" card.
  contactStrip: {
    flexDirection: 'row',
    marginTop: Spacing.xl,
    paddingTop: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: C.surfaceBg,
  },
  contactAction: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  contactIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: C.textPrimary,
  },
  footer: {
    padding: Spacing.screenH,
    backgroundColor: C.white,
    borderTopWidth: 1,
    borderTopColor: C.border,                    // '#E2E8F0' = border ✓
  },
  btnPrimary: {
    backgroundColor: C.primary,
    borderRadius: BorderRadius.button,                // 14 = button ✓
    paddingVertical: Spacing['3xl'],
    alignItems: 'center',
  },
  btnPrimaryText: { color: C.white, fontSize: FontSize.xl, fontWeight: FontWeight.bold },   // 16 = xl ✓
  btnOutlineDanger: {
    backgroundColor: C.white,
    borderWidth: 1.5,
    borderColor: C.error,
    borderRadius: BorderRadius.button,                // 14 = button ✓
    paddingVertical: Spacing['2xl'],
    alignItems: 'center',
  },
  btnOutlineDangerText: { color: C.error, fontSize: FontSize.xl, fontWeight: FontWeight.bold },  // 16 = xl ✓
  btnTextDanger: { paddingVertical: Spacing.xl, alignItems: 'center', marginTop: Spacing.sm },
  btnTextDangerLabel: { color: C.error, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
});
