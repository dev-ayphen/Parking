import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {View,
  Text,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
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
import { useRealtime } from '../../hooks/useRealtime';
import { useSessionBarStore, computeEndsAtISO, minsUntil } from '../../store/sessionBarStore';
import { useTheme } from '../../hooks/useTheme';
import { Spacing, FontWeight } from '../../theme';
import { makeActiveSessionStyles } from './active-session.styles';

export default function ActiveSessionScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bookingId = params.bookingId as string;
  const setBarForSource = useSessionBarStore((s) => s.setBarForSource);
  const clearSource = useSessionBarStore((s) => s.clearSource);
  const setBar = useCallback((b: any) => setBarForSource('parker', b), [setBarForSource]);
  const clearBar = useCallback(() => clearSource('parker'), [clearSource]);

  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeActiveSessionStyles(colors), [colors]);

  const isMounted = useRef(true);
  useEffect(() => { return () => { isMounted.current = false; }; }, []);

  const [booking, setBooking] = useState<any>(null);
  const [verification, setVerification] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [generatingOtp, setGeneratingOtp] = useState(false);

  // Pulsing animation for sub-state 1 waiting screen
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

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
      // Sub-state: arrivedAt set but owner hasn't done vehicle check yet → waiting
      const isWaitingForCheck = !!booking.arrivedAt && !verification;
      setBar({
        variant: isWaitingForCheck ? 'waiting_condition_check' : 'arrived_otp_ready',
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
  }, [booking, verification, bookingId, generatedOtp, setBar, clearBar]);

  // Navigate to the receipt once the session is COMPLETED — single source of
  // truth, reached by both the socket event and the polling fallback.
  useEffect(() => {
    if (booking?.status === 'COMPLETED') {
      if (!isMounted.current) return;
      router.replace({ pathname: '/(find-space)/session-complete', params: { bookingId } });
    }
  }, [booking?.status, bookingId, router]);

  // The booking ended without a session (cancelled/expired no-show). Don't leave
  // the parker stuck on "Waiting for owner" — tell them and send them home.
  useEffect(() => {
    if (booking?.status === 'CANCELLED' || booking?.status === 'EXPIRED') {
      if (!isMounted.current) return;
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

  // Parker → Report Owner. Payments happen directly between the two users, so a
  // payment problem is a dispute the parker can raise against the owner.
  const ABUSE_REASONS = [
    { value: 'OFFLINE_PAYMENT_DEMAND', label: 'Asked for extra money' },
    { value: 'UPI_NOT_WORKING',        label: 'QR / UPI not working' },
    { value: 'HARASSMENT',             label: 'Harassment or rude behavior' },
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

  // Open a UPI app pre-filled with the owner's UPI ID + amount, so the parker pays
  // directly. ParkSwift never handles the money — UPI moves it owner ↔ parker.
  // `scheme` jumps STRAIGHT into a specific app (GPay/PhonePe/Paytm); these
  // app-specific schemes are unofficial and can change, so we fall back to the
  // generic upi:// chooser if the direct open fails. BHIM uses the generic scheme.
  const handlePayViaUpi = async (scheme?: string, appName?: string) => {
    const upiId = booking?.space?.owner?.upiId;
    const ownerName = booking?.space?.owner?.name || 'ParkSwift Owner';
    const amount = booking?.totalAmount ?? 0;
    if (!upiId) {
      Alert.alert('No UPI ID', 'The owner has not added a UPI ID. Please pay them in cash, or scan their QR at exit.');
      return;
    }
    const pn = ownerName.replace(/[^a-zA-Z0-9\s\-._]/g, '').substring(0, 60);
    const query = `pa=${upiId}&pn=${pn}&am=${amount}&cu=INR&tn=Parking fee`;
    const generic = `upi://pay?${query}`;
    const primary = scheme ? `${scheme}${query}` : generic;
    try {
      await Linking.openURL(primary);
    } catch {
      // App-specific scheme not available → fall back to the generic UPI chooser.
      if (scheme) {
        try {
          await Linking.openURL(generic);
          return;
        } catch {}
      }
      Alert.alert(
        appName ? `${appName} not found` : 'No UPI app found',
        'Install a UPI app (GPay, PhonePe, Paytm or BHIM) to pay, or pay the owner in cash.',
      );
    }
  };

  // UPI apps shown as tappable icons. `scheme` is the app-specific deep-link prefix
  // (falls back to the generic chooser if unavailable). `logo` is the official app
  // logo; when null we render a brand-colored letter badge instead. To use real
  // logos: drop the PNGs in assets/upi/ (see that folder's README) and replace the
  // matching `logo: null` with `logo: require('../../assets/upi/<file>.png')`.
  const UPI_APPS = [
    { key: 'gpay',  name: 'GPay',  letter: 'G', color: '#1A73E8', scheme: 'tez://upi/pay?', logo: require('../../assets/upi/gpay.png') as number | null },
    { key: 'paytm', name: 'Paytm', letter: 'P', color: '#00BAF2', scheme: 'paytmmp://pay?', logo: require('../../assets/upi/paytm.png') as number | null },
    { key: 'bhim',  name: 'BHIM',  letter: 'B', color: '#00718F', scheme: undefined,        logo: require('../../assets/upi/bhim.png') as number | null },
  ];

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
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
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
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <PageHeader title="Active Session" onBack={() => router.replace('/(home)')} />

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchBooking(true)} tintColor={colors.primary} />
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
            <Text style={[styles.factValue, { color: colors.primary }]}>₹{amount}</Text>
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
                <Text style={[styles.enRouteValue, { color: colors.primary, fontWeight: FontWeight.extrabold }]}>₹{booking.totalAmount}</Text>
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
                <Phone size={20} color={colors.textPrimary} />
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
                <Navigation size={20} color={colors.textPrimary} />
                <Text style={styles.contactBtnText}>Navigate</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* SUBSTATE 1: Waiting for owner to check the vehicle condition. */}
        {waitingForCondition && (() => {
          const ownerRaw = booking.space?.owner;
          const ownerName = ownerRaw?.name
            || [ownerRaw?.firstName, ownerRaw?.lastName].filter(Boolean).join(' ')
            || 'the owner';
          const ownerPhone = ownerRaw?.phoneNumber || ownerRaw?.phone || null;
          return (
            <View style={styles.waitOwnerBox}>
              <Animated.View style={[styles.waitOwnerIcon, { transform: [{ scale: pulseAnim }] }]}>
                <Search size={26} color={colors.primary} strokeWidth={2.2} />
              </Animated.View>
              <Text style={styles.waitOwnerTitle}>Waiting for {ownerName}</Text>
              <Text style={styles.waitOwnerSub}>
                {ownerName} is inspecting your vehicle's condition. You'll be notified the moment it's done.
              </Text>
              {ownerPhone && (
                <TouchableOpacity
                  style={styles.waitOwnerCallBtn}
                  activeOpacity={0.75}
                  onPress={() => {
                    const n = /^\+/.test(ownerPhone) ? ownerPhone : `+91${ownerPhone}`;
                    Linking.openURL(`tel:${n}`).catch(() => Alert.alert('Error', 'Could not open dialler.'));
                  }}
                >
                  <Phone size={15} color={colors.primary} strokeWidth={2} />
                  <Text style={styles.waitOwnerCallText}>Call {ownerName}</Text>
                </TouchableOpacity>
              )}
              <View style={styles.waitOwnerStatus}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.waitOwnerStatusText}>Inspection in progress…</Text>
              </View>
            </View>
          );
        })()}

        {/* SUBSTATE 2a: Vehicle Condition Result — parker reviews & accepts */}
        {requiresAcknowledgement && (
          <View style={styles.card}>
            <Text style={styles.conditionHeading}>Vehicle Inspection</Text>
            {verification.type === 'PHOTO_VIDEO' ? (
              <>
                <View style={styles.warningHeader}>
                  <AlertTriangle size={24} color={colors.warning} />
                  <Text style={styles.warningTitle}>Existing Damage Recorded</Text>
                </View>
                <Text style={styles.cardBody}>
                  The owner photographed existing damage before parking. Please review — the owner is not responsible for these existing marks.
                </Text>
                {verification.mediaUrls && verification.mediaUrls.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaStrip}>
                    {verification.mediaUrls.map((url: string, i: number) => (
                      <Image key={i} source={{ uri: url }} style={styles.thumb} resizeMode="cover" onError={() => {}} />
                    ))}
                  </ScrollView>
                )}
              </>
            ) : (
              <>
                <View style={styles.okBadge}>
                  <ShieldCheck size={16} color={colors.success} strokeWidth={2.5} />
                  <Text style={styles.okBadgeText}>No Existing Damage Reported</Text>
                </View>
                <Text style={styles.cardBody}>
                  The owner inspected your vehicle and reported no existing damage.
                </Text>
              </>
            )}
            <View style={styles.reviewRow}>
              <CheckSquare size={16} color={colors.primary} />
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
                <ActivityIndicator color={colors.primary} />
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
                <Phone size={20} color={colors.textPrimary} />
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
                <MessageSquare size={20} color={colors.textPrimary} />
                <Text style={styles.contactBtnText}>Message</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Payment — ParkSwift never collects, verifies or holds money. If the owner
            has a UPI ID, the parker can tap a UPI app icon to pay them directly
            (pre-filled amount). Otherwise they pay cash / scan the QR at exit. */}
        {isActive && (() => {
          const ownerUpi = booking?.space?.owner?.upiId;
          return (
            <View style={[styles.payInfoCard, { marginTop: Spacing.xl }]}>
              <View style={styles.payInfoRow}>
                <Text style={styles.payInfoLabel}>Amount due</Text>
                <Text style={styles.payInfoAmount}>₹{booking.totalAmount ?? 0}</Text>
              </View>

              {ownerUpi ? (
                <>
                  <Text style={styles.payNowLabel}>Pay now with</Text>
                  <View style={styles.upiAppsRow}>
                    {UPI_APPS.map((app) => (
                      <TouchableOpacity
                        key={app.key}
                        style={styles.upiAppBtn}
                        onPress={() => handlePayViaUpi(app.scheme, app.name)}
                        activeOpacity={0.8}
                      >
                        {app.logo ? (
                          // Official app logo (added to assets/upi/).
                          <Image source={app.logo} style={styles.upiAppLogo} resizeMode="contain" />
                        ) : (
                          // Fallback: brand-colored letter badge until a logo is added.
                          <View style={[styles.upiAppIcon, { backgroundColor: app.color }]}>
                            <Text style={styles.upiAppIconText}>{app.letter}</Text>
                          </View>
                        )}
                        <Text style={styles.upiAppName}>{app.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              ) : null}

              <View style={styles.payInfoDivider} />
              <Text style={styles.payInfoDisclaimer}>
                {ownerUpi
                  ? 'Pay the owner directly via any UPI app, or pay cash. Payments are made directly between you and the space owner. ParkSwift does not collect, verify, or hold any payments.'
                  : 'Pay the owner directly — cash, or by scanning their UPI QR at exit. Payments are made directly between you and the space owner. ParkSwift does not collect, verify, or hold any payments.'}
              </Text>
            </View>
          );
        })()}

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
                  <Headphones size={16} color={colors.primary} strokeWidth={2} />
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
                  <Flag size={16} color={abuseRef ? colors.textMuted : colors.error} strokeWidth={2} />
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
                <X size={20} color={colors.textSecondary} strokeWidth={2} />
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
                placeholderTextColor={colors.textMuted}
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
                  ? <ActivityIndicator color={colors.white} size="small" />
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
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.screenH) }]}>
          {notYetArrived && (
            <TouchableOpacity style={styles.btnPrimary} onPress={handleArrived} disabled={actionLoading}>
              {actionLoading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.btnPrimaryText}>I Have Arrived</Text>}
            </TouchableOpacity>
          )}
          {requiresAcknowledgement && (
            <TouchableOpacity style={styles.btnPrimary} onPress={handleAcknowledge} disabled={actionLoading}>
              {actionLoading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.btnPrimaryText}>Accept & Continue</Text>}
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
              {actionLoading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.btnPrimaryText}>I Am Leaving</Text>}
            </TouchableOpacity>
          )}
          {isLeaving && (
            <View style={{ gap: Spacing.md }}>
              <View style={styles.waitingHint}>
                <Text style={styles.waitingHintText}>Waiting for owner to confirm your exit…</Text>
              </View>
              <TouchableOpacity
                style={[styles.btnPrimary, { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.error }]}
                onPress={handleSelfComplete}
                disabled={actionLoading}
              >
                {actionLoading
                  ? <ActivityIndicator color={colors.error} />
                  : <Text style={[styles.btnPrimaryText, { color: colors.error }]}>Owner not responding? Complete session</Text>}
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}
