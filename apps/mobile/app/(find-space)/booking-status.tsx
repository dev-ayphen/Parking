import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Linking,
  Alert} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Phone,
  MessageSquare,
  Navigation,
} from 'lucide-react-native';
import { api } from '../../services/api';
import { useNetworkStore } from '../../store/networkStore';
import PageHeader from '../../components/PageHeader';
import { useRealtime } from '../../hooks/useRealtime';
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

  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ETA update
  const [selectedEtaMin, setSelectedEtaMin] = useState<number | null>(null);
  const [etaUpdating, setEtaUpdating] = useState(false);

  // 2-minute approval countdown (ticks while waiting)
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

  // Realtime updates
  const { onEvent } = useRealtime();

  useEffect(() => {
    if (!bookingId) return;
    const unsub1 = onEvent('booking:approved', (data: any) => {
      if (String(data.bookingId) === String(bookingId)) fetchBooking();
    });
    const unsub2 = onEvent('booking:rejected', (data: any) => {
      if (String(data.bookingId) === String(bookingId)) fetchBooking();
    });
    const unsub3 = onEvent('session:started', (data: any) => {
      if (String(data.bookingId) === String(bookingId)) fetchBooking();
    });
    const unsub4 = onEvent('verification:ready', (data: any) => {
      if (String(data.bookingId) === String(bookingId)) fetchBooking();
    });
    const unsub5 = onEvent('booking:expired', (data: any) => {
      if (String(data.bookingId) === String(bookingId)) fetchBooking();
    });
    // Auto-cancellation (e.g. parker no-show released by the server).
    const unsub6 = onEvent('booking:cancelled', (data: any) => {
      if (String(data.bookingId) === String(bookingId)) fetchBooking();
    });

    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
      unsub5();
      unsub6();
    };
  }, [bookingId, fetchBooking, onEvent]);

  // Navigate forward when ACTIVE
  useEffect(() => {
    if (booking?.status === 'ACTIVE') {
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

  // Remaining seconds in the 2-minute approval window (null when not waiting)
  const countdownSec =
    booking?.status === 'PENDING_APPROVAL' && booking?.createdAt
      ? Math.max(0, 120 - Math.floor((nowTs - new Date(booking.createdAt).getTime()) / 1000))
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
        <PageHeader title="Booking Status" onBack={() => router.back()} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !booking) {
    return (
      <SafeAreaView style={styles.container}>
        <PageHeader title="Booking Status" onBack={() => router.back()} />
        <View style={styles.center}>
          <Text style={styles.errorText}>{error || 'Booking not found'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchBooking}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Derived UI variables based on status
  let heroColor: string = C.warningBgAlt; // Default amber
  let heroIcon = <Clock size={40} color={C.warning} />;
  let heroTitle = 'Waiting for Approval';
  let heroSub = 'The owner has been notified.';

  if (booking.status === 'APPROVED') {
    heroColor = C.successBg;
    heroIcon = <CheckCircle2 size={40} color={C.success} />;
    heroTitle = 'Booking Approved 🎉';
    heroSub = 'Head to the space.';
  } else if (booking.status === 'REJECTED' || booking.status === 'CANCELLED') {
    heroColor = C.errorBg;
    heroIcon = <XCircle size={40} color={C.error} />;
    heroTitle = booking.status === 'REJECTED' ? 'Booking Rejected' : 'Booking Cancelled';
    heroSub = 'The owner declined this booking.'; // Or extract from reason if provided
  } else if (booking.status === 'ACTIVE') {
    heroColor = ExtendedColors.activeBlueBg;
    heroIcon = <CheckCircle2 size={40} color={ExtendedColors.activeBlueText} />;
    heroTitle = 'Session Active';
    heroSub = '';
  } else if (booking.status === 'EXPIRED') {
    heroColor = C.surfaceBg;
    heroIcon = <Clock size={40} color={C.textSecondary} />;
    heroTitle = 'Request Expired';
    heroSub = 'Owner did not respond within 2 minutes.';
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <PageHeader title="Booking Status" onBack={() => router.back()} />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} showsVerticalScrollIndicator={false}>
        {/* Status Hero */}
        <View style={[styles.heroCard, { backgroundColor: heroColor }]}>
          <View style={styles.heroIconWrap}>{heroIcon}</View>
          <Text style={[styles.heroTitle, { color: C.textPrimary }]}>{heroTitle}</Text>
          {heroSub ? <Text style={styles.heroSub}>{heroSub}</Text> : null}
          {booking.status === 'PENDING_APPROVAL' && countdownSec != null && (
            <View style={styles.countdownPill}>
              <Clock size={14} color={ExtendedColors.warningText} />
              <Text style={styles.countdownText}>
                {countdownSec > 0 ? `${fmtCountdown(countdownSec)} remaining` : 'Taking longer than expected…'}
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
        </View>

        {/* Contact Owner (Only if approved) */}
        {booking.status === 'APPROVED' && (
          <View style={styles.contactCard}>
            <Text style={styles.cardTitle}>Contact Owner</Text>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.actionCircleBtn}
                onPress={() => {
                  const num = booking.space?.owner?.phoneNumber;
                  if (num) Linking.openURL(`tel:${num}`);
                  else Alert.alert('Unavailable', 'Phone number not provided.');
                }}
              >
                <Phone size={24} color={C.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionCircleBtn}
                onPress={() => {
                  const num = booking.space?.owner?.phoneNumber;
                  if (num) Linking.openURL(`sms:${num}`);
                  else Alert.alert('Unavailable', 'Phone number not provided.');
                }}
              >
                <MessageSquare size={24} color={C.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionCircleBtn}
                onPress={() => {
                  const { lat, lng } = booking.space;
                  Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
                }}
              >
                <Navigation size={24} color={C.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>
        )}

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
              style={[styles.etaUpdateBtn, (selectedEtaMin == null || etaUpdating) && styles.etaUpdateBtnDisabled]}
              onPress={handleUpdateEta}
              disabled={selectedEtaMin == null || etaUpdating}
              activeOpacity={0.8}
            >
              {etaUpdating ? (
                <ActivityIndicator color={C.primary} size="small" />
              ) : (
                <Text style={styles.etaUpdateBtnText}>
                  {selectedEtaMin ? `Notify owner — arriving in ${selectedEtaMin} min` : 'Select a new arrival time'}
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
  container: { flex: 1, backgroundColor: C.white },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: C.error, marginBottom: Spacing.xl },           // 12 = xl ✓
  retryBtn: { padding: Spacing.xl, backgroundColor: C.errorBg, borderRadius: BorderRadius.sm },  // 12 = xl ✓
  retryBtnText: { color: C.error, fontWeight: FontWeight.semibold },
  content: { flex: 1 },
  contentInner: { padding: Spacing.screenH, gap: Spacing['3xl'], paddingBottom: 28 },
  heroCard: {
    padding: Spacing['4xl'],
    borderRadius: BorderRadius.lg,                    // 16 = lg ✓
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIconWrap: { marginBottom: Spacing.xl },          // 12 = xl ✓
  heroTitle: { fontSize: FontSize['3xl'], fontWeight: FontWeight.extrabold, marginBottom: Spacing.xs },  // 20 = 3xl ✓
  heroSub: { fontSize: FontSize.md, color: C.textDark },              // 14 = md ✓
  countdownPill: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.xl,  // 12 = xl ✓
    backgroundColor: 'rgba(255,255,255,0.7)', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm, borderRadius: 20,
  },
  countdownText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: ExtendedColors.warningDeep },  // 13 = base ✓
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
  actionRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
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
    borderWidth: 1.5,
    borderColor: C.primary,
    borderRadius: BorderRadius.md,                    // 12 = md ✓
    paddingVertical: Spacing['2xl'],
    alignItems: 'center',
    backgroundColor: C.white,
  },
  etaUpdateBtnDisabled: { opacity: 0.5 },
  etaUpdateBtnText: { color: C.primary, fontSize: FontSize.md, fontWeight: FontWeight.bold },  // 14 = md ✓
  actionCircleBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.screenBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,                       // '#E2E8F0' = border ✓
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
