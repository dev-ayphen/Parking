import React, { useState, useEffect, useCallback } from 'react';
import {View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ScrollView,
  RefreshControl,
  Alert,
  Linking} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Phone, MessageSquare, AlertTriangle, ShieldCheck } from 'lucide-react-native';
import { api } from '../../services/api';
import PageHeader from '../../components/PageHeader';
import { useRealtime } from '../../hooks/useRealtime';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, ExtendedColors } from '../../theme';

export default function ActiveSessionScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const bookingId = params.bookingId as string;

  const [booking, setBooking] = useState<any>(null);
  const [verification, setVerification] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [generatingOtp, setGeneratingOtp] = useState(false);

  // isRefresh=true → pull-to-refresh spinner; silent=true → background poll (no spinners)
  const fetchBooking = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const data = await api.get(`/bookings/${bookingId}`);
      const bData = data.booking || data.data || data;
      setBooking(bData);

      // Fetch verification if approved
      if (bData.status === 'APPROVED') {
        try {
          const vData = await api.get(`/bookings/${bookingId}/verification`);
          if (vData.verification) {
            setVerification(vData.verification);
          }
        } catch {}
      }
      setError(null);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [bookingId]);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  // Polling fallback — Socket.IO is primary, but if an event is missed (flaky
  // network, socket reconnecting, app resumed from background) we still self-heal.
  // Polls every 8s while the booking is in a non-final state; stops when terminal.
  useEffect(() => {
    const FINAL = ['COMPLETED', 'CANCELLED', 'EXPIRED', 'REJECTED'];
    const status = booking?.status;
    if (!status || FINAL.includes(status)) return; // stop polling when terminal
    const t = setInterval(() => { fetchBooking(); }, 8000);
    return () => clearInterval(t);
  }, [booking?.status, fetchBooking]);

  const { onEvent } = useRealtime();

  useEffect(() => {
    if (!bookingId) return;
    const unsub1 = onEvent('verification:ready', (data: any) => {
      if (String(data.bookingId) === String(bookingId)) fetchBooking();
    });
    const unsub2 = onEvent('session:started', (data: any) => {
      if (String(data.bookingId) === String(bookingId)) fetchBooking();
    });
    // Just re-fetch; navigation is driven by the status effect below so it
    // works whether COMPLETED arrives via socket OR the polling fallback.
    const unsub3 = onEvent('session:completed', (data: any) => {
      if (String(data.bookingId) === String(bookingId)) fetchBooking();
    });

    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, [bookingId, fetchBooking, onEvent]);

  // Navigate to the receipt once the session is COMPLETED — single source of
  // truth, reached by both the socket event and the polling fallback.
  useEffect(() => {
    if (booking?.status === 'COMPLETED') {
      router.replace({ pathname: '/(find-space)/session-complete', params: { bookingId } });
    }
  }, [booking?.status, bookingId, router]);

  const handleAcknowledge = async () => {
    try {
      setActionLoading(true);
      await api.put(`/bookings/${bookingId}/verification/accept`);
      // Update local state to proceed to OTP
      setVerification({ ...verification, parkerAcknowledged: true });
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Parker's arrival OTP is generated AUTOMATICALLY (no button) and shown to the owner.
  const handleGenerateOtp = useCallback(async () => {
    try {
      setGeneratingOtp(true);
      const data = await api.get(`/bookings/${bookingId}/otp`);
      setGeneratedOtp(data.otp);
    } catch (err: any) {
      if (__DEV__) console.log('[ARRIVAL_OTP] generate error', err.message);
    } finally {
      setGeneratingOtp(false);
    }
  }, [bookingId]);

  // Auto-generate the arrival OTP — ONLY after the parker has acknowledged the
  // recorded condition. The OTP must never appear before "I Understand & Continue".
  useEffect(() => {
    if (!booking || booking.status !== 'APPROVED') return;
    if (!verification || !verification.parkerAcknowledged) return; // must acknowledge first
    if (generatedOtp || generatingOtp) return;
    handleGenerateOtp();
  }, [booking, verification, generatedOtp, generatingOtp, handleGenerateOtp]);

  const handleLeaving = async () => {
    try {
      setActionLoading(true);
      await api.put(`/bookings/${bookingId}/leaving`);
      Alert.alert('Owner Notified', "They'll confirm your exit shortly.");
      fetchBooking();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      </SafeAreaView>
    );
  }

  if (error || !booking) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.errorText}>{error || 'Booking not found'}</Text>
          <TouchableOpacity style={styles.btnPrimary} onPress={() => fetchBooking(true)}>
            <Text style={styles.btnPrimaryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Determine Sub-state (strict ordering — OTP only AFTER the parker acknowledges)
  const isApproved = booking.status === 'APPROVED';
  // 1. Owner hasn't recorded the vehicle condition yet → parker waits
  const waitingForCondition = isApproved && !verification;
  // 2. Condition recorded, parker hasn't acknowledged it yet → must read + confirm
  const requiresAcknowledgement = isApproved && verification && !verification.parkerAcknowledged;
  // 3. Acknowledged → arrival OTP (auto-generated). OTP NEVER appears before this.
  const requiresOtp = isApproved && verification && verification.parkerAcknowledged;
  const isActive = booking.status === 'ACTIVE';
  // Parker tapped "I Am Leaving" — waiting for owner to confirm exit & finalize amount
  const isLeaving = isActive && !!booking.sessionEndedAt;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <PageHeader title="Active Session" onBack={() => router.back()} />

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchBooking(true)} tintColor={Colors.primary} />
        }
      >
        {/* SUBSTATE 1: Waiting for owner to check the vehicle condition */}
        {waitingForCondition && (
          <View style={styles.card}>
            <View style={styles.otpLoadingBox}>
              <ActivityIndicator color={Colors.primary} />
              <Text style={styles.otpLoadingText}>Waiting for the owner to check your vehicle…</Text>
            </View>
          </View>
        )}

        {/* SUBSTATE 2a: Vehicle Condition Result — parker acknowledges */}
        {requiresAcknowledgement && (
          <View style={styles.card}>
            {verification.type === 'PHOTO_VIDEO' ? (
              <>
                <View style={styles.warningHeader}>
                  <AlertTriangle size={24} color={Colors.warning} />
                  <Text style={styles.warningTitle}>Damage Photos Uploaded</Text>
                </View>
                <Text style={styles.cardBody}>
                  The space owner recorded the vehicle's condition before parking. Please review the photos — the owner is not responsible for these existing marks.
                </Text>
                {verification.mediaUrls && verification.mediaUrls.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaStrip}>
                    {verification.mediaUrls.map((url: string, i: number) => (
                      <Image key={i} source={{ uri: url }} style={styles.thumb} />
                    ))}
                  </ScrollView>
                )}
              </>
            ) : (
              <>
                <View style={styles.okHeader}>
                  <ShieldCheck size={24} color={Colors.success} />
                  <Text style={styles.okTitle}>No Concerns Recorded</Text>
                </View>
                <Text style={styles.cardBody}>
                  The space owner checked your vehicle and recorded no concerns about its condition. You're good to start your session.
                </Text>
              </>
            )}
          </View>
        )}

        {/* SUBSTATE 2b: Arrival OTP — auto-generated, parker shows it to the owner */}
        {requiresOtp && (
          <View style={styles.card}>
            <Text style={styles.otpTitle}>Arrival OTP</Text>
            <Text style={styles.otpSub}>
              Show this code to the space owner. They enter it in their app to start your session.
            </Text>

            {generatedOtp ? (
              <View style={styles.otpDisplayBox}>
                <Text style={styles.otpDisplayLabel}>Show this code to the owner</Text>
                <Text style={styles.otpDisplayCode}>{generatedOtp}</Text>
              </View>
            ) : (
              <View style={styles.otpLoadingBox}>
                <ActivityIndicator color={Colors.primary} />
                <Text style={styles.otpLoadingText}>Generating your code…</Text>
              </View>
            )}
          </View>
        )}

        {/* SUBSTATE 2c: Running Session */}
        {isActive && (
          <View style={styles.activeCard}>
            <View style={styles.activeHeader}>
              <View style={[styles.dot, isLeaving && styles.dotLeaving]} />
              <Text style={styles.activeTitle}>{isLeaving ? 'LEAVING — AWAITING EXIT' : 'ACTIVE PARKING SESSION'}</Text>
            </View>
            {isLeaving && (
              <View style={styles.leavingBanner}>
                <Text style={styles.leavingBannerText}>
                  You've notified the owner you're leaving. They'll confirm your exit time and finalize the amount. Your receipt appears once they complete it.
                </Text>
              </View>
            )}
            <View style={styles.activeBody}>
              <Text style={styles.activeLabel}>Space</Text>
              <Text style={styles.activeVal}>{booking.space?.name}</Text>
              
              <Text style={[styles.activeLabel, { marginTop: Spacing.xl }]}>Vehicle</Text>
              <Text style={styles.activeVal}>{booking.vehicle?.licensePlate}</Text>

              <Text style={[styles.activeLabel, { marginTop: Spacing.xl }]}>Entry Time</Text>
              <Text style={styles.activeVal}>
                {booking.sessionStartedAt
                  ? new Date(booking.sessionStartedAt).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', hour12:true })
                  : 'N/A'}
              </Text>

              <Text style={[styles.activeLabel, { marginTop: Spacing.xl }]}>Rate</Text>
              <Text style={styles.activeVal}>₹{booking.space?.hourlyRate}/hour</Text>
            </View>

            <View style={styles.contactRow}>
              <TouchableOpacity
                style={styles.contactBtn}
                onPress={() => {
                  const num = booking.space?.owner?.phoneNumber;
                  if (num) Linking.openURL(`tel:${num}`);
                  else Alert.alert('Unavailable', 'Phone number not provided.');
                }}
              >
                <Phone size={20} color={Colors.textPrimary} />
                <Text style={styles.contactBtnText}>Call</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.contactBtn}
                onPress={() => {
                  const num = booking.space?.owner?.phoneNumber;
                  if (num) Linking.openURL(`sms:${num}`);
                  else Alert.alert('Unavailable', 'Phone number not provided.');
                }}
              >
                <MessageSquare size={20} color={Colors.textPrimary} />
                <Text style={styles.contactBtnText}>Message</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Sticky Footer */}
      <View style={styles.footer}>
        {requiresAcknowledgement && (
          <TouchableOpacity style={styles.btnPrimary} onPress={handleAcknowledge} disabled={actionLoading}>
            {actionLoading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.btnPrimaryText}>I Understand & Continue</Text>}
          </TouchableOpacity>
        )}
        {requiresOtp && (
          <View style={styles.waitingHint}>
            <Text style={styles.waitingHintText}>
              {generatedOtp ? 'Waiting for owner to verify your OTP…' : 'Preparing your arrival code…'}
            </Text>
          </View>
        )}
        {isActive && !isLeaving && (
          <TouchableOpacity style={styles.btnPrimary} onPress={handleLeaving} disabled={actionLoading}>
            {actionLoading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.btnPrimaryText}>I Am Leaving</Text>}
          </TouchableOpacity>
        )}
        {isLeaving && (
          <View style={styles.waitingHint}>
            <Text style={styles.waitingHintText}>Waiting for owner to confirm your exit…</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: Colors.error, marginBottom: Spacing.xl },                    // 12 = xl ✓
  errorTextSmall: { color: Colors.error, marginTop: Spacing.lg, textAlign: 'center' },
  content: { flex: 1, padding: Spacing.screenH },                                  // 20 = screenH ✓
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,                                                  // 16 = lg ✓
    padding: Spacing.screenH,
    borderWidth: 1,
    borderColor: Colors.border,                                                     // '#E2E8F0' = border ✓
  },
  warningHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.xl },  // 8=md, 12=xl ✓
  warningTitle: { color: Colors.warning, fontSize: FontSize.xl, fontWeight: FontWeight.bold },                // 16=xl ✓
  okHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.xl },
  okTitle: { color: Colors.success, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  cardBody: { color: Colors.textBody, fontSize: FontSize.md, lineHeight: 20, marginBottom: Spacing['3xl'] }, // 14=md, 16='3xl' ✓
  mediaStrip: { flexDirection: 'row', marginTop: Spacing.lg },                     // 10 = lg ✓
  thumb: { width: 100, height: 100, borderRadius: BorderRadius.sm, marginRight: Spacing.lg, backgroundColor: Colors.surfaceBg }, // 8=sm, 10=lg ✓

  otpTitle: { fontSize: FontSize['3xl'], fontWeight: FontWeight.extrabold, color: Colors.textPrimary, textAlign: 'center', marginBottom: Spacing.md },  // 20='3xl', 8=md ✓
  otpSub: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing['4xl'], paddingHorizontal: Spacing.screenH }, // 14=md, 24='4xl', 20=screenH ✓
  otpDisplayBox: {
    backgroundColor: Colors.primaryBg,                                             // '#FFF1F2' ✓
    borderRadius: BorderRadius.lg,                                                  // 16=lg ✓
    padding: Spacing['4xl'],                                                        // 24='4xl' ✓
    alignItems: 'center',
    borderWidth: 1,
    borderColor: ExtendedColors.primaryBorder,                                      // '#FECDD3' ✓
  },
  otpDisplayLabel: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: ExtendedColors.primaryTextDeep, marginBottom: Spacing.lg },  // 13=base, 10=lg ✓
  otpDisplayCode: { fontSize: FontSize['12xl'], fontWeight: FontWeight.extrabold, color: Colors.primary, letterSpacing: 12 },  // 44='12xl' ✓
  otpLoadingBox: {
    backgroundColor: Colors.screenBg,                                              // '#F8FAFC' ✓
    borderRadius: BorderRadius.lg,                                                  // 16=lg ✓
    padding: Spacing['4xl'],                                                        // 24='4xl' ✓
    alignItems: 'center',
    gap: Spacing.lg,                                                                // 10=lg ✓
    borderWidth: 1,
    borderColor: Colors.border,                                                     // '#E2E8F0' ✓
  },
  otpLoadingText: { fontSize: FontSize.base, color: Colors.textSecondary, fontWeight: FontWeight.medium },  // 13=base ✓
  waitingHint: { paddingVertical: Spacing['2xl'], alignItems: 'center' },           // 14='2xl' ✓
  waitingHintText: { fontSize: FontSize.md, color: Colors.textSecondary, fontWeight: FontWeight.medium },   // 14=md ✓

  activeCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,                                                  // 16=lg ✓
    borderWidth: 1,
    borderColor: Colors.border,                                                     // '#E2E8F0' ✓
    overflow: 'hidden',
  },
  activeHeader: {
    backgroundColor: Colors.successBg,                                             // '#F0FDF4' ✓
    padding: Spacing['3xl'],                                                        // 16='3xl' ✓
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,                                                                // 8=md ✓
  },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.success },
  dotLeaving: { backgroundColor: Colors.warning },
  leavingBanner: {
    backgroundColor: Colors.warningBgAlt,                                          // '#FEF3C7' ✓
    borderRadius: BorderRadius.md,                                                  // 12=md ✓
    padding: Spacing['2xl'],                                                        // 14='2xl' ✓
    marginBottom: Spacing.xs,
    borderLeftWidth: 3,
    borderLeftColor: Colors.warning,
  },
  leavingBannerText: { fontSize: FontSize.base, color: ExtendedColors.warningAmber, lineHeight: 19 },  // 13=base, '#92400E' ✓
  activeTitle: { color: Colors.success, fontWeight: FontWeight.extrabold, fontSize: FontSize.md, letterSpacing: 0.5 },  // 14=md ✓
  activeBody: { padding: Spacing.screenH },                                        // 20=screenH ✓
  activeLabel: { fontSize: FontSize.sm, color: Colors.textMuted, fontWeight: FontWeight.bold },         // 12=sm ✓
  activeVal: { fontSize: FontSize.xl, color: Colors.textPrimary, fontWeight: FontWeight.semibold, marginTop: Spacing.xs },  // 16=xl, 4=xs ✓

  contactRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBg,                                              // '#F1F5F9' ✓
  },
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing['3xl'],                                                        // 16='3xl' ✓
    gap: Spacing.md,                                                                // 8=md ✓
    borderRightWidth: 1,
    borderRightColor: Colors.surfaceBg,                                            // '#F1F5F9' ✓
  },
  contactBtnText: { color: Colors.textPrimary, fontWeight: FontWeight.semibold, fontSize: FontSize.md },  // 14=md ✓

  footer: { padding: Spacing.screenH, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border },  // '#E2E8F0' ✓
  btnPrimary: { backgroundColor: Colors.primary, borderRadius: BorderRadius.button, paddingVertical: Spacing['3xl'], alignItems: 'center' },  // 14=button, 16='3xl' ✓
  btnPrimaryText: { color: Colors.white, fontSize: FontSize.xl, fontWeight: FontWeight.bold },  // 16=xl ✓
});
