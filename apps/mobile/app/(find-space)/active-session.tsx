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
  Linking,
  Modal,
  TextInput,
  DeviceEventEmitter} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Phone, MessageSquare, AlertTriangle, ShieldCheck, Flag, X, Headphones, CheckSquare, Search, Navigation } from 'lucide-react-native';
import { api } from '../../services/api';
import { useNetworkStore, NETWORK_RECONNECTED } from '../../store/networkStore';
import PageHeader from '../../components/PageHeader';
import ReportSubmitted from '../../components/ReportSubmitted';
import SessionStepper, { type SessionStep } from '../../components/FindSpace/SessionStepper';
import UpiPayCard from '../../components/UpiPayCard';
import { useRealtime } from '../../hooks/useRealtime';
import { useSessionBarStore, computeEndsAtISO, minsUntil } from '../../store/sessionBarStore';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, ExtendedColors } from '../../theme';

export default function ActiveSessionScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bookingId = params.bookingId as string;
  const setBarForSource = useSessionBarStore((s) => s.setBarForSource);
  const clearSource = useSessionBarStore((s) => s.clearSource);
  const setBar = useCallback((b: any) => setBarForSource('parker', b), [setBarForSource]);
  const clearBar = useCallback(() => clearSource('parker'), [clearSource]);

  const [booking, setBooking] = useState<any>(null);
  const [verification, setVerification] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parkerUpiId, setParkerUpiId] = useState<string | null>(null); // Parker's saved UPI for refunds

  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [generatingOtp, setGeneratingOtp] = useState(false);

  // Report abuse modal
  const [abuseModalVisible, setAbuseModalVisible] = useState(false);
  const [abuseType, setAbuseType] = useState('OFFLINE_PAYMENT_DEMAND');
  const [abuseDesc, setAbuseDesc] = useState('');
  const [abuseSubmitting, setAbuseSubmitting] = useState(false);
  const [abuseRef, setAbuseRef] = useState<string | null>(null);
  const [abuseSubmittedAt, setAbuseSubmittedAt] = useState<string | null>(null);

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

  // Load parker's billing profile (includes saved UPI ID for refunds)
  useEffect(() => {
    (async () => {
      try {
        const profile = await api.get('/users/me/billing');
        setParkerUpiId(profile?.billing?.upiId || null);
      } catch {
        // Silent — optional billing profile
      }
    })();
  }, []);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  // Re-fetch when connectivity is restored (offline banner's "Retry" / auto-
  // reconnect) so an in-progress session screen reloads instead of going stale.
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(NETWORK_RECONNECTED, () => fetchBooking());
    return () => sub.remove();
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
    // Booking cancelled out from under the parker (e.g. server no-show release
    // while they were waiting). Refetch so the status effect below can react.
    const unsub4 = onEvent('booking:cancelled', (data: any) => {
      if (String(data.bookingId) === String(bookingId)) fetchBooking();
    });
    // App resumed from background OR socket reconnected after a network drop —
    // re-fetch immediately so we recover any state change we missed while away,
    // rather than waiting for the next 8s poll tick.
    const unsub5 = onEvent('app:resumed', () => fetchBooking());

    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
      unsub5();
    };
  }, [bookingId, fetchBooking, onEvent]);

  // ── Feed session bar from active session state ──────────────────────────
  useEffect(() => {
    if (!booking || !bookingId) return;
    const spaceName = booking.space?.name ?? '';
    const status = booking.status;

    if (status === 'ACTIVE') {
      // booking.endTime from API is a formatted string ("06:00 PM"), not ISO.
      // Must compute ISO end from sessionStartedAt + duration.
      const endsAtISO = computeEndsAtISO(
        booking.sessionStartedAt,
        booking.eta,
        booking.createdAt,
        booking.duration ?? 1,
      );
      const mins = minsUntil(endsAtISO);
      setBar({
        variant: mins !== null && mins < 15 ? 'session_ending' : 'session_active',
        bookingId: String(bookingId),
        spaceName,
        parkerName: '',
        vehiclePlate: booking.vehicle?.licensePlate ?? '',
        amount: booking.totalAmount ?? null,
        durationHours: booking.duration ?? null,
        expiresAt: null,
        endsAtISO,
        otp: generatedOtp ?? booking.sessionOtp ?? null,
        etaText: null,
      });
    } else if (status === 'APPROVED') {
      setBar({
        variant: 'arrived_otp_ready',
        bookingId: String(bookingId),
        spaceName,
        parkerName: '',
        vehiclePlate: booking.vehicle?.licensePlate ?? '',
        amount: booking.totalAmount ?? null,
        durationHours: booking.duration ?? null,
        expiresAt: null,
        endsAtISO: null,
        otp: generatedOtp ?? booking.sessionOtp ?? null,
        etaText: null,
      });
    } else if (status === 'COMPLETED' || status === 'CANCELLED' || status === 'EXPIRED') {
      clearBar();
    }
  }, [booking, bookingId, generatedOtp, setBar, clearBar]);

  // Navigate to the receipt once the session is COMPLETED — single source of
  // truth, reached by both the socket event and the polling fallback.
  useEffect(() => {
    if (booking?.status === 'COMPLETED') {
      router.replace({ pathname: '/(find-space)/session-complete', params: { bookingId } });
    }
  }, [booking?.status, bookingId, router]);

  // The booking ended without a session (cancelled/expired no-show). Don't leave
  // the parker stuck on "Waiting for owner" — tell them and send them home.
  useEffect(() => {
    if (booking?.status === 'CANCELLED' || booking?.status === 'EXPIRED') {
      Alert.alert(
        'Booking Ended',
        'This booking was cancelled because the session never started. If you arrived late, please make a new booking.',
        [{ text: 'OK', onPress: () => router.replace('/(home)') }],
      );
    }
  }, [booking?.status, router]);

  const handleAcknowledge = async () => {
    if (!useNetworkStore.getState().requireOnline()) return;
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

  const ABUSE_REASONS = [
    { value: 'OFFLINE_PAYMENT_DEMAND', label: 'Owner asking for cash payment' },
    { value: 'HARASSMENT',             label: 'Harassment or rude behavior' },
    { value: 'UNSAFE_AREA',            label: 'Unsafe or threatening behavior' },
    { value: 'OTHER',                  label: 'Other issue' },
  ];

  const handleSubmitAbuse = async () => {
    if (abuseSubmitting || abuseRef) return; // guard re-entry / double-tap
    if (abuseDesc.trim().length < 5) {
      Alert.alert('Too short', 'Please describe the issue (at least 5 characters).');
      return;
    }
    const ownerId = booking?.space?.owner?.id || booking?.space?.ownerId;
    if (!ownerId) return;
    try {
      setAbuseSubmitting(true);
      const res = await api.post('/abuse-reports', {
        reportedUserId: ownerId,
        abuseType: abuseType,
        description: abuseDesc.trim(),
      });
      const reportId = res?.report?.id;
      setAbuseRef(reportId ? `ABU-${String(reportId).padStart(5, '0')}` : 'ABU-PENDING');
      setAbuseSubmittedAt(res?.report?.createdAt || new Date().toISOString());
      setAbuseModalVisible(false);
      setAbuseDesc('');
    } catch (err: any) {
      Alert.alert('Failed', err?.message || 'Could not submit report. Try again.');
    } finally {
      setAbuseSubmitting(false);
    }
  };

  const handleArrived = async () => {
    if (!useNetworkStore.getState().requireOnline()) return;
    try {
      setActionLoading(true);
      await api.put(`/bookings/${bookingId}/arrived`);
      fetchBooking();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Parker self-declares "I've paid" after scanning the owner's UPI QR. Notifies
  // the owner; the app does NOT verify the transfer (owner confirms in their app).
  const handleMarkPaid = async () => {
    if (!useNetworkStore.getState().requireOnline()) return;
    try {
      await api.put(`/bookings/${bookingId}/mark-paid`);
      await fetchBooking();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not mark as paid.');
    }
  };

  const handleSelfComplete = async () => {
    if (!useNetworkStore.getState().requireOnline()) return;
    Alert.alert(
      'Complete without owner?',
      "The owner hasn't confirmed your exit. You can complete the session yourself — the amount will be calculated based on your reported exit time.",
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Complete Session', style: 'destructive', onPress: async () => {
          try {
            setActionLoading(true);
            await api.put(`/bookings/${bookingId}/self-complete`);
            fetchBooking();
          } catch (err: any) {
            Alert.alert('Error', err.message);
          } finally {
            setActionLoading(false);
          }
        }},
      ]
    );
  };

  const handleLeaving = async () => {
    if (!useNetworkStore.getState().requireOnline()) return;
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
  // 0. Parker hasn't tapped "I Have Arrived" yet — show booking info + action buttons
  const notYetArrived = isApproved && !booking.arrivedAt && !booking.sessionOtp;
  // 1. Owner hasn't recorded the vehicle condition yet → parker waits
  const waitingForCondition = isApproved && !notYetArrived && !verification;
  // 2. Condition recorded, parker hasn't acknowledged it yet → must read + confirm
  const requiresAcknowledgement = isApproved && verification && !verification.parkerAcknowledged;
  // 3. Acknowledged → arrival OTP (auto-generated). OTP NEVER appears before this.
  const requiresOtp = isApproved && verification && verification.parkerAcknowledged;
  const isActive = booking.status === 'ACTIVE';
  // Parker tapped "I Am Leaving" — waiting for owner to confirm exit & finalize amount
  const isLeaving = isActive && !!booking.sessionEndedAt;
  const isCompleted = booking.status === 'COMPLETED';

  // Map the sub-state to a step in the progress tracker.
  const currentStep: SessionStep =
    isCompleted ? 'done'
    : isActive ? 'active'
    : requiresOtp ? 'verify'
    : (requiresAcknowledgement || waitingForCondition) ? 'check'
    : 'arrived';

  // Compact one-line booking facts, shown on EVERY state so the parker keeps
  // context (space, vehicle, amount) even while waiting on the owner.
  const spaceName = booking.space?.name ?? '—';
  const plate = booking.vehicle?.licensePlate ?? '—';
  const amount = booking.totalAmount ?? 0;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" />
      <PageHeader title="Active Session" onBack={() => router.back()} />

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchBooking(true)} tintColor={Colors.primary} />
        }
      >
        {/* Progress tracker — always visible so the parker sees where they are. */}
        <View style={styles.stepperCard}>
          <SessionStepper current={currentStep} />
        </View>

        {/* Compact booking facts — always visible so context is never lost while
            waiting on the owner. */}
        <View style={styles.factsCard}>
          <View style={styles.factItem}>
            <Text style={styles.factLabel}>SPACE</Text>
            <Text style={styles.factValue} numberOfLines={1}>{spaceName}</Text>
          </View>
          <View style={styles.factDivider} />
          <View style={styles.factItem}>
            <Text style={styles.factLabel}>VEHICLE</Text>
            <Text style={styles.factValue} numberOfLines={1}>{plate}</Text>
          </View>
          <View style={styles.factDivider} />
          <View style={styles.factItem}>
            <Text style={styles.factLabel}>AMOUNT</Text>
            <Text style={[styles.factValue, { color: Colors.primary }]}>₹{amount}</Text>
          </View>
        </View>

        {/* SUBSTATE 0: Approved, parker hasn't arrived yet */}
        {notYetArrived && (
          <>
            {/* Status banner */}
            <View style={styles.enRouteBanner}>
              <Text style={styles.enRouteBannerEmoji}>🚗</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.enRouteBannerTitle}>Head to the Space</Text>
                <Text style={styles.enRouteBannerSub}>Your booking is approved. Tap "I Have Arrived" when you reach the location.</Text>
              </View>
            </View>

            {/* Booking details */}
            <View style={[styles.card, { marginTop: Spacing.screenH }]}>
              <Text style={styles.enRouteSection}>Booking Details</Text>
              <View style={styles.enRouteRow}>
                <Text style={styles.enRouteLabel}>Space</Text>
                <Text style={styles.enRouteValue}>{booking.space?.name || '—'}</Text>
              </View>
              {!!booking.space?.address && (
                <View style={styles.enRouteRow}>
                  <Text style={styles.enRouteLabel}>Address</Text>
                  <Text style={[styles.enRouteValue, { flex: 2 }]} numberOfLines={2}>{booking.space.address}</Text>
                </View>
              )}
              <View style={styles.enRouteRow}>
                <Text style={styles.enRouteLabel}>Vehicle</Text>
                <Text style={styles.enRouteValue}>{booking.vehicle?.licensePlate || '—'} ({booking.vehicle?.vehicleType || '—'})</Text>
              </View>
              <View style={styles.enRouteRow}>
                <Text style={styles.enRouteLabel}>Duration</Text>
                <Text style={styles.enRouteValue}>{booking.duration}h</Text>
              </View>
              <View style={[styles.enRouteRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.enRouteLabel}>Amount</Text>
                <Text style={[styles.enRouteValue, { color: Colors.primary, fontWeight: FontWeight.extrabold }]}>₹{booking.totalAmount}</Text>
              </View>
            </View>

            {/* Contact + Navigate owner */}
            <View style={[styles.card, { marginTop: Spacing.xl, flexDirection: 'row', padding: 0, overflow: 'hidden' }]}>
              <TouchableOpacity
                style={styles.contactBtn}
                onPress={() => {
                  const phone = booking.space?.owner?.phone;
                  if (!phone) { Alert.alert('Unavailable', 'Owner phone not available.'); return; }
                  const n = /^\+/.test(phone) ? phone : `+91${phone}`;
                  Linking.openURL(`tel:${n}`).catch(() => Alert.alert('Error', 'Could not open dialler.'));
                }}
              >
                <Phone size={20} color={Colors.textPrimary} />
                <Text style={styles.contactBtnText}>Call Owner</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.contactBtn, { borderRightWidth: 0 }]}
                onPress={() => {
                  if (!booking.space?.lat || !booking.space?.lng) { Alert.alert('Unavailable', 'Location not available.'); return; }
                  const url = `https://www.google.com/maps/dir/?api=1&destination=${booking.space.lat},${booking.space.lng}`;
                  Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open maps.'));
                }}
              >
                <Navigation size={20} color={Colors.textPrimary} />
                <Text style={styles.contactBtnText}>Navigate</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* SUBSTATE 1: Waiting for owner to check the vehicle condition.
            Single box — the waitOwnerBox IS the card (no outer wrapper). */}
        {waitingForCondition && (
          <View style={styles.waitOwnerBox}>
            <View style={styles.waitOwnerIcon}>
              <Search size={26} color={Colors.primary} strokeWidth={2.2} />
            </View>
            <Text style={styles.waitOwnerTitle}>Owner is checking your vehicle</Text>
            <Text style={styles.waitOwnerSub}>
              The space owner is verifying your vehicle’s condition. This usually takes a moment — you’ll be notified the instant it’s done.
            </Text>
            <View style={styles.waitOwnerStatus}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.waitOwnerStatusText}>In progress…</Text>
            </View>
          </View>
        )}

        {/* SUBSTATE 2a: Vehicle Condition Result — parker reviews & accepts */}
        {requiresAcknowledgement && (
          <View style={styles.card}>
            <Text style={styles.conditionHeading}>Vehicle Inspection</Text>
            {verification.type === 'PHOTO_VIDEO' ? (
              <>
                <View style={styles.warningHeader}>
                  <AlertTriangle size={24} color={Colors.warning} />
                  <Text style={styles.warningTitle}>Existing Damage Recorded</Text>
                </View>
                <Text style={styles.cardBody}>
                  The owner photographed existing damage before parking. Please review — the owner is not responsible for these existing marks.
                </Text>
                {verification.mediaUrls && verification.mediaUrls.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaStrip}>
                    {verification.mediaUrls.map((url: string, i: number) => (
                      <Image key={i} source={{ uri: url }} style={styles.thumb} resizeMode="cover" />
                    ))}
                  </ScrollView>
                )}
              </>
            ) : (
              <>
                <View style={styles.okBadge}>
                  <ShieldCheck size={16} color={Colors.success} strokeWidth={2.5} />
                  <Text style={styles.okBadgeText}>No Existing Damage Reported</Text>
                </View>
                <Text style={styles.cardBody}>
                  The owner inspected your vehicle and reported no existing damage.
                </Text>
              </>
            )}
            <View style={styles.reviewRow}>
              <CheckSquare size={16} color={Colors.primary} />
              <Text style={styles.reviewRowText}>
                I have reviewed the vehicle condition{verification.type === 'NO_CONCERN' ? ' and have no concerns' : ''}.
              </Text>
            </View>
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
                style={[styles.contactBtn, { borderRightWidth: 0 }]}
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

        {/* Pay the owner — UPI QR generated from the owner's UPI ID. Shown once the
            session is active (parker can pay anytime during the session). The app
            never processes the payment; it goes directly owner ↔ parker. */}
        {isActive && !isLeaving && (
          <View style={{ marginTop: Spacing.xl }}>
            <UpiPayCard
              upiId={booking.space?.owner?.upiId}
              payeeName={booking.space?.owner?.name}
              amount={booking.totalAmount ?? 0}
              alreadyPaid={!!booking.parkerMarkedPaidAt}
              onMarkPaid={handleMarkPaid}
              parkerUpiId={parkerUpiId}
              onSaveParkerUpi={async (upiId: string) => {
                await api.put('/users/me/billing', { upiId });
                setParkerUpiId(upiId);
              }}
            />
          </View>
        )}

        {/* Need Help? — support vs report are distinct paths (support ticket vs abuse report) */}
        {isActive && (
          <View style={styles.helpSection}>
            <Text style={styles.helpLabel}>Need Help?</Text>
            <View style={styles.helpCard}>
              <TouchableOpacity
                style={styles.helpRow}
                onPress={() => router.push('/(home)/support/create-ticket')}
                activeOpacity={0.7}
              >
                <View style={styles.helpRowLeft}>
                  <Headphones size={16} color={Colors.primary} strokeWidth={2} />
                  <View>
                    <Text style={styles.helpRowText}>Contact Support</Text>
                    <Text style={styles.helpRowSub}>OTP, payment or app issues</Text>
                  </View>
                </View>
                <Text style={styles.helpRowArrow}>›</Text>
              </TouchableOpacity>
              <View style={styles.helpDivider} />
              <TouchableOpacity
                style={styles.helpRow}
                onPress={() => setAbuseModalVisible(true)}
                activeOpacity={0.7}
                disabled={!!abuseRef}
              >
                <View style={styles.helpRowLeft}>
                  <Flag size={16} color={abuseRef ? Colors.textMuted : Colors.error} strokeWidth={2} />
                  <View>
                    <Text style={styles.helpRowText}>Report an Issue</Text>
                    <Text style={styles.helpRowSub}>Cash demand, harassment, unsafe</Text>
                  </View>
                </View>
                {!abuseRef && <Text style={styles.helpRowArrow}>›</Text>}
              </TouchableOpacity>
            </View>

            {/* Post-submission receipt — reference + timestamp */}
            {abuseRef && (
              <View style={{ marginTop: Spacing.md }}>
                <ReportSubmitted reference={abuseRef} submittedAt={abuseSubmittedAt || undefined} />
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Report Abuse Modal */}
      <Modal visible={abuseModalVisible} transparent animationType="slide" onRequestClose={() => setAbuseModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Report Abuse</Text>
              <TouchableOpacity onPress={() => setAbuseModalVisible(false)} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                <X size={20} color={Colors.textSecondary} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>We take these reports seriously. Our team will review and take action.</Text>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Auto-filled booking context — sent silently in the payload, shown read-only */}
              <View style={styles.contextCard}>
                <View style={styles.contextRow}>
                  <Text style={styles.contextLabel}>Booking</Text>
                  <Text style={styles.contextVal}>#{String(bookingId).slice(-6).toUpperCase()}</Text>
                </View>
                <View style={styles.contextRow}>
                  <Text style={styles.contextLabel}>Space</Text>
                  <Text style={styles.contextVal} numberOfLines={1}>{booking?.space?.name || '—'}</Text>
                </View>
                <View style={styles.contextRow}>
                  <Text style={styles.contextLabel}>Owner</Text>
                  <Text style={styles.contextVal} numberOfLines={1}>
                    {booking?.space?.owner
                      ? [booking.space.owner.firstName, booking.space.owner.lastName].filter(Boolean).join(' ') || '—'
                      : '—'}
                  </Text>
                </View>
              </View>

              <Text style={styles.fieldLabel}>Reason</Text>
              {ABUSE_REASONS.map(r => (
                <TouchableOpacity
                  key={r.value}
                  style={[styles.reasonRow, abuseType === r.value && styles.reasonRowActive]}
                  onPress={() => setAbuseType(r.value)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.radioOuter, abuseType === r.value && styles.radioOuterActive]}>
                    {abuseType === r.value && <View style={styles.radioInner} />}
                  </View>
                  <Text style={[styles.reasonText, abuseType === r.value && styles.reasonTextActive]}>{r.label}</Text>
                </TouchableOpacity>
              ))}

              <Text style={[styles.fieldLabel, { marginTop: Spacing.xl }]}>Details</Text>
              <TextInput
                style={styles.descInput}
                placeholder="Describe what happened..."
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={3}
                value={abuseDesc}
                onChangeText={setAbuseDesc}
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={[styles.submitBtn, abuseSubmitting && styles.submitBtnDisabled]}
                onPress={handleSubmitAbuse}
                disabled={abuseSubmitting}
                activeOpacity={0.8}
              >
                {abuseSubmitting
                  ? <ActivityIndicator color={Colors.white} size="small" />
                  : <Text style={styles.submitBtnText}>Submit Report</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Sticky Footer — pad the bottom by the safe-area inset (gesture bar /
          system nav) plus the base padding so the action button is never clipped
          by the device navigation. */}
      {/* Only render the footer when there's actually a button/hint for the
          current sub-state. Otherwise (e.g. "owner is checking your vehicle",
          whose content lives in the scroll body) it drew an empty white box with
          a top border at the bottom of the screen. */}
      {(notYetArrived || requiresAcknowledgement || requiresOtp || (isActive && !isLeaving) || isLeaving) && (
        <View style={[styles.footer, { paddingBottom: Spacing.screenH + Math.max(insets.bottom, Spacing.xs) }]}>
          {notYetArrived && (
            <TouchableOpacity style={styles.btnPrimary} onPress={handleArrived} disabled={actionLoading}>
              {actionLoading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.btnPrimaryText}>I Have Arrived</Text>}
            </TouchableOpacity>
          )}
          {requiresAcknowledgement && (
            <TouchableOpacity style={styles.btnPrimary} onPress={handleAcknowledge} disabled={actionLoading}>
              {actionLoading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.btnPrimaryText}>Accept & Continue</Text>}
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
            <View style={{ gap: Spacing.md }}>
              <View style={styles.waitingHint}>
                <Text style={styles.waitingHintText}>Waiting for owner to confirm your exit…</Text>
              </View>
              <TouchableOpacity
                style={[styles.btnPrimary, { backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.error }]}
                onPress={handleSelfComplete}
                disabled={actionLoading}
              >
                {actionLoading
                  ? <ActivityIndicator color={Colors.error} />
                  : <Text style={[styles.btnPrimaryText, { color: Colors.error }]}>Owner not responding? Complete session</Text>}
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: Colors.error, marginBottom: Spacing.xl },                    // 12 = xl ✓
  errorTextSmall: { color: Colors.error, marginTop: Spacing.lg, textAlign: 'center' },
  // Grey scroll area so the white cards stand out (white-on-white made them
  // blend in). The SafeAreaView/header stays white to match other screens.
  content: { flex: 1, padding: Spacing.screenH, backgroundColor: Colors.screenBg },
  stepperCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.xl,
  },
  factsCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.xl,
  },
  factItem: { flex: 1, alignItems: 'center', paddingHorizontal: Spacing.sm },
  factLabel: { fontSize: FontSize.micro, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 0.4, marginBottom: 3 },
  factValue: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  factDivider: { width: 1, backgroundColor: Colors.surfaceBg },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,                                                  // 16 = lg ✓
    padding: Spacing.screenH,
    borderWidth: 1,
    borderColor: Colors.border,                                                     // '#E2E8F0' = border ✓
  },
  warningHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.xl },  // 8=md, 12=xl ✓
  warningTitle: { color: Colors.warning, fontSize: FontSize.xl, fontWeight: FontWeight.bold },                // 16=xl ✓
  okBadge: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: Spacing.sm,
    backgroundColor: Colors.successBg, borderWidth: 1, borderColor: Colors.success,
    borderRadius: BorderRadius.circleXl, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  okBadgeText: { color: Colors.success, fontSize: FontSize.md, fontWeight: FontWeight.bold },
  cardBody: { color: Colors.textBody, fontSize: FontSize.md, lineHeight: 20, marginBottom: Spacing['3xl'] }, // 14=md, 16='3xl' ✓
  conditionHeading: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.lg },
  reviewRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.primaryBg, borderRadius: BorderRadius.md, padding: Spacing.xl, marginTop: Spacing.xs },
  reviewRowText: { flex: 1, fontSize: FontSize.base, color: Colors.textBody, fontWeight: FontWeight.medium, lineHeight: 18 },
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
  // "Owner is checking your vehicle" — single standalone card (white), no nesting.
  waitOwnerBox: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing['5xl'],
    paddingHorizontal: Spacing['4xl'],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  waitOwnerIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing['2xl'],
  },
  waitOwnerTitle: {
    fontSize: FontSize.xl,                                                           // 16 = xl ✓
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  waitOwnerSub: {
    fontSize: FontSize.base,                                                         // 13 = base ✓
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: Spacing['3xl'],
  },
  waitOwnerStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.primaryBg,
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.circleXl,
  },
  waitOwnerStatusText: {
    fontSize: FontSize.sm,                                                           // 12 = sm ✓
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
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

  // Need Help? — separate low-emphasis section (support + report)
  helpSection: { marginTop: Spacing.screenH },
  helpLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.md },
  helpCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  helpRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing['2xl'], paddingHorizontal: Spacing.screenH },
  helpDivider: { height: 1, backgroundColor: Colors.surfaceBg, marginHorizontal: Spacing.screenH },
  helpRowLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  helpRowText: { fontSize: FontSize.md, color: Colors.textPrimary, fontWeight: FontWeight.semibold },
  helpRowSub: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 1 },
  helpRowArrow: { fontSize: FontSize['3xl'], color: Colors.textMuted, fontWeight: FontWeight.normal },

  footer: { padding: Spacing.screenH, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border },  // '#E2E8F0' ✓
  btnPrimary: { backgroundColor: Colors.primary, borderRadius: BorderRadius.button, paddingVertical: Spacing['3xl'], alignItems: 'center' },  // 14=button, 16='3xl' ✓
  btnPrimaryText: { color: Colors.white, fontSize: FontSize.xl, fontWeight: FontWeight.bold },  // 16=xl ✓

  // Report abuse modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: Colors.white, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing['3xl'], paddingBottom: 36, maxHeight: '88%' },
  contextCard: { backgroundColor: Colors.screenBg, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.xl, marginBottom: Spacing['3xl'] },
  contextRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 },
  contextLabel: { fontSize: FontSize.sm, color: Colors.textMuted, fontWeight: FontWeight.medium },
  contextVal: { fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: FontWeight.semibold, flexShrink: 1, marginLeft: Spacing.lg, textAlign: 'right' },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.borderMuted, alignSelf: 'center', marginBottom: Spacing['2xl'] },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  modalTitle: { fontSize: FontSize['2xl'], fontWeight: FontWeight.bold, color: Colors.textPrimary },
  modalSub: { fontSize: FontSize.base, color: Colors.textSecondary, marginBottom: Spacing['3xl'], lineHeight: 19 },
  fieldLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textSecondary, marginBottom: Spacing.lg, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  reasonRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: Spacing.lg, paddingVertical: Spacing.lg, paddingHorizontal: Spacing.xl, borderRadius: BorderRadius.md, marginBottom: Spacing.sm, backgroundColor: Colors.screenBg, borderWidth: 1, borderColor: Colors.border },
  reasonRowActive: { backgroundColor: Colors.primaryBg, borderColor: Colors.primary },
  radioOuter: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: Colors.border, alignItems: 'center' as const, justifyContent: 'center' as const },
  radioOuterActive: { borderColor: Colors.primary },
  radioInner: { width: 9, height: 9, borderRadius: 5, backgroundColor: Colors.primary },
  reasonText: { fontSize: FontSize.base, color: Colors.textBody, fontWeight: FontWeight.medium },
  reasonTextActive: { color: Colors.primary, fontWeight: FontWeight.semibold },
  descInput: { backgroundColor: Colors.screenBg, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.lg, padding: Spacing.xl, fontSize: FontSize.base, color: Colors.textPrimary, minHeight: 80, marginBottom: Spacing['3xl'] },
  submitBtn: { backgroundColor: Colors.error, borderRadius: BorderRadius.button, paddingVertical: Spacing['3xl'], alignItems: 'center' as const },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: Colors.white, fontSize: FontSize.lg, fontWeight: FontWeight.bold },

  // ── Not-yet-arrived state ──────────────────────────────────────────────
  enRouteBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.lg,
    backgroundColor: Colors.infoBg, borderRadius: BorderRadius.lg, padding: Spacing['3xl'],
  },
  enRouteBannerEmoji: { fontSize: 28 },
  enRouteBannerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  enRouteBannerSub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2, lineHeight: 17 },
  enRouteSection: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: Spacing.xl },
  enRouteRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBg,
  },
  enRouteLabel: { fontSize: FontSize.base, color: Colors.textSecondary, flex: 1 },
  enRouteValue: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.textPrimary, textAlign: 'right' },
});
