import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, StatusBar, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Clock, User, Car, MapPin, CheckCircle2, XCircle } from 'lucide-react-native';
import PageHeader from '../../components/PageHeader';
import { api } from '../../services/api';
import { useRealtime } from '../../hooks/useRealtime';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing } from '../../theme';

const APPROVAL_WINDOW_SEC = 120; // 2 minutes

const fmt = (sec: number) =>
  `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

export default function BookingRequestScreen() {
  const router = useRouter();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const { onEvent } = useRealtime();

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

  // Tick every second to keep countdown live
  useEffect(() => {
    const t = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Real-time: if parker cancels while we're looking at it
  useEffect(() => {
    const unsub = onEvent('booking:cancelled', (d: any) => {
      if (String(d.bookingId) === String(bookingId)) fetchBooking();
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
    const label = action === 'accept' ? 'Accept' : 'Reject';
    Alert.alert(`${label} Booking?`, `Are you sure you want to ${label.toLowerCase()} this booking request?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: label,
        style: action === 'decline' ? 'destructive' : 'default',
        onPress: async () => {
          try {
            setActioning(true);
            await api.put(`/bookings/${bookingId}/${action}`);
            await fetchBooking();
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Action failed');
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
        <PageHeader title="Booking Request" onBack={() => router.back()} />
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView style={styles.container}>
        <PageHeader title="Booking Request" onBack={() => router.back()} />
        <View style={styles.center}><Text style={styles.errText}>Booking not found</Text></View>
      </SafeAreaView>
    );
  }

  const parkerName = [booking.parker?.firstName, booking.parker?.lastName].filter(Boolean).join(' ') || 'Parker';
  const spaceName = booking.space?.name || 'Your Space';
  const duration = booking.duration ? `${booking.duration}h` : '-';
  const etaStr = booking.eta ? fmtTime(booking.eta) : '-';

  // --- Already actioned (accepted/rejected/expired by backend) ---
  if (!isPending) {
    const isAccepted = booking.status === 'APPROVED';
    const isRejected = booking.status === 'REJECTED';
    const wasExpired = booking.status === 'EXPIRED';
    const color = isAccepted ? Colors.success : Colors.error;
    const bg = isAccepted ? Colors.successBg : Colors.errorBg;
    const Icon = isAccepted ? CheckCircle2 : XCircle;
    const title = isAccepted ? 'You Accepted this Request' : isRejected ? 'You Rejected this Request' : 'Request Expired';
    const sub = isAccepted ? 'Parker has been notified and is on the way.' :
      isRejected ? 'Parker has been notified.' :
        'This request expired before any action was taken.';

    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <PageHeader title="Booking Request" onBack={() => router.back()} />
        <View style={styles.center}>
          <View style={[styles.resultHero, { backgroundColor: bg }]}>
            <Icon size={48} color={color} />
            <Text style={[styles.resultTitle, { color }]}>{title}</Text>
            <Text style={styles.resultSub}>{sub}</Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
            <Text style={styles.closeBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // --- Active pending request ---
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <PageHeader title="Booking Request" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Countdown pill */}
        {!isExpired ? (
          <View style={[styles.countdownBanner, remainingSec < 30 && styles.countdownBannerUrgent]}>
            <Clock size={16} color={remainingSec < 30 ? Colors.error : Colors.warning} />
            <Text style={[styles.countdownText, remainingSec < 30 && styles.countdownTextUrgent]}>
              Respond within {fmt(remainingSec)}
            </Text>
          </View>
        ) : (
          <View style={styles.expiredBanner}>
            <Clock size={16} color={Colors.textSecondary} />
            <Text style={styles.expiredBannerText}>This request has expired</Text>
          </View>
        )}

        {/* Parker info */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{parkerName.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.parkerName}>{parkerName}</Text>
              <Text style={styles.parkerSub}>wants to park at your space</Text>
            </View>
          </View>
        </View>

        {/* Booking details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Booking Details</Text>
          <View style={styles.detailRow}>
            <MapPin size={16} color={Colors.textSecondary} />
            <Text style={styles.detailLabel}>Space</Text>
            <Text style={styles.detailValue}>{spaceName}</Text>
          </View>
          <View style={styles.detailRow}>
            <Car size={16} color={Colors.textSecondary} />
            <Text style={styles.detailLabel}>Vehicle</Text>
            <Text style={styles.detailValue}>
              {booking.vehicle?.licensePlate || '-'} ({booking.vehicle?.vehicleType || '-'})
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Clock size={16} color={Colors.textSecondary} />
            <Text style={styles.detailLabel}>Duration</Text>
            <Text style={styles.detailValue}>{duration}</Text>
          </View>
          <View style={styles.detailRow}>
            <User size={16} color={Colors.textSecondary} />
            <Text style={styles.detailLabel}>Arrival ETA</Text>
            <Text style={styles.detailValue}>{etaStr}</Text>
          </View>
          <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.detailLabel}>Amount</Text>
            <Text style={[styles.detailValue, { color: Colors.primary, fontWeight: FontWeight.extrabold, fontSize: FontSize.xl }]}>
              ₹{booking.totalAmount}
            </Text>
          </View>
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
            {actioning ? <ActivityIndicator color={Colors.error} /> : <Text style={styles.rejectBtnText}>Reject</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.acceptBtn}
            onPress={() => handleAction('accept')}
            disabled={actioning}
          >
            {actioning ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.acceptBtnText}>Accept</Text>}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing['4xl'] },
  errText: { color: Colors.textSecondary, fontSize: FontSize.lg },   // 15 = lg ✓

  content: { padding: Spacing.screenH, gap: Spacing['2xl'], paddingBottom: 120 },

  countdownBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.warningBgAlt, borderRadius: BorderRadius.md, padding: Spacing['2xl'],  // 12 = md ✓
    borderLeftWidth: 4, borderLeftColor: Colors.warning,
  },
  countdownBannerUrgent: { backgroundColor: Colors.errorBg, borderLeftColor: Colors.error },
  countdownText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.warning, flex: 1 },  // 14 = md ✓
  countdownTextUrgent: { color: Colors.error },
  expiredBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.surfaceBg, borderRadius: BorderRadius.md, padding: Spacing['2xl'],  // 12 = md ✓
    borderLeftWidth: 4, borderLeftColor: Colors.textMuted,
  },
  expiredBannerText: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textSecondary },  // 14 = md ✓

  card: {
    backgroundColor: Colors.white, borderRadius: BorderRadius.button, padding: Spacing['3xl'],  // 14 = button ✓
    borderWidth: 1, borderColor: Colors.border,
  },
  cardTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: Spacing.xl },  // 14 = md ✓
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xl },
  avatarCircle: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: FontSize['3xl'], fontWeight: FontWeight.extrabold, color: Colors.primary },  // 20 = 3xl ✓
  parkerName: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },  // 16 = xl ✓
  parkerSub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: Spacing.micro },  // 12 = sm ✓

  detailRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.lg,
    paddingVertical: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBg,
  },
  detailLabel: { fontSize: FontSize.base, color: Colors.textSecondary, fontWeight: FontWeight.medium, flex: 1 },  // 13 = base ✓
  detailValue: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.textPrimary, textAlign: 'right', flex: 2 },  // 13 = base ✓

  footer: {
    flexDirection: 'row', gap: Spacing.xl, paddingHorizontal: Spacing.screenH, paddingTop: Spacing['3xl'],
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
    backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  rejectBtn: {
    flex: 1, paddingVertical: Spacing['2xl'], borderRadius: BorderRadius.md,  // 12 = md ✓
    borderWidth: 1.5, borderColor: Colors.error, alignItems: 'center',
  },
  rejectBtnText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.error },  // 15 = lg ✓
  acceptBtn: {
    flex: 1, paddingVertical: Spacing['2xl'], borderRadius: BorderRadius.md,  // 12 = md ✓
    backgroundColor: Colors.success, alignItems: 'center',
  },
  acceptBtnText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.white },  // 15 = lg ✓

  resultHero: {
    width: '100%', borderRadius: BorderRadius.lg, padding: Spacing['6xl'],  // 16 = lg ✓
    alignItems: 'center', gap: Spacing.xl, marginBottom: Spacing['4xl'],
  },
  resultTitle: { fontSize: FontSize['3xl'], fontWeight: FontWeight.extrabold, textAlign: 'center' },  // 20 = 3xl ✓
  resultSub: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },  // 14 = md ✓
  closeBtn: {
    backgroundColor: Colors.primary, paddingHorizontal: Spacing['6xl'], paddingVertical: Spacing['2xl'],
    borderRadius: BorderRadius.md, width: '100%', alignItems: 'center',  // 12 = md ✓
  },
  closeBtnText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.white },  // 15 = lg ✓
});
