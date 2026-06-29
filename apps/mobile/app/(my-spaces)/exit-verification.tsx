import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  ScrollView,
  Pressable,
  Modal,
  DeviceEventEmitter} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { User, Car, Clock, Star, CheckCircle2, Flag, X, Smartphone, Info } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import PageHeader from '../../components/PageHeader';
import { api } from '../../services/api';
import { useNetworkStore } from '../../store/networkStore';
import { useRealtime } from '../../hooks/useRealtime';
import { useTheme } from '../../hooks/useTheme';
import { FontSize, FontWeight, BorderRadius, Spacing } from '../../theme';
import type { ColorsType } from '../../theme';

export default function ExitVerificationScreen() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const params = useLocalSearchParams();
  const router = useRouter();
  const bookingId = params.bookingId as string;

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [useCurrentTime, setUseCurrentTime] = useState(true);
  const [manualTime, setManualTime] = useState(''); // HH:MM

  // Rate-parker step — shown after a session is completed (owner → parker rating).
  const [rateModalVisible, setRateModalVisible] = useState(false);
  const [stars, setStars] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);

  // Report-parker step — payment is between the two users, so if it goes wrong the
  // owner can report the parker. ParkSwift never verifies payment; admin reviews.
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportType, setReportType] = useState('PAYMENT_NOT_RECEIVED');
  const [reportDesc, setReportDesc] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportRef, setReportRef] = useState<string | null>(null);

  // Owner → Report Parker reasons (maps to backend ABUSE_TYPES).
  const REPORT_REASONS = [
    { value: 'PAYMENT_NOT_RECEIVED', label: 'Payment not received' },
    { value: 'LEFT_WITHOUT_PAYING',  label: 'Left without paying' },
    { value: 'OTHER',                label: 'Other' },
  ];

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

  // If the PARKER force-completes the session ("Owner not responding? Complete
  // session") while the owner is on this screen entering an exit time, the booking
  // is already finalized — the owner's exit form is now stale. React in realtime:
  // tell the owner and close the screen so they don't submit a duplicate exit.
  const { onEvent } = useRealtime();
  useEffect(() => {
    if (!bookingId) return;
    const handledRef = { done: false };
    const unsub = onEvent('session:completed', (data: any) => {
      if (handledRef.done) return;
      if (String(data?.bookingId) !== String(bookingId)) return;
      handledRef.done = true;
      Alert.alert(
        'Session Completed',
        'The parker has already completed this session, so no exit confirmation is needed.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    });
    return () => unsub();
  }, [bookingId, onEvent, router]);

  useFocusEffect(useCallback(() => {
    DeviceEventEmitter.emit('sessionbar:suppress', true);
    return () => { DeviceEventEmitter.emit('sessionbar:suppress', false); };
  }, []));

  const getExitDate = () => {
    if (useCurrentTime) return new Date();

    if (!manualTime.match(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)) return null;

    // Parse manual time. It has NO date, so anchor it to the entry day. For a
    // session that ran past midnight, a manual exit time earlier than the entry
    // time means "next day" — roll it forward 24h so the duration is positive
    // instead of negative (e.g. entry 11:30 PM, exit 12:30 AM → +1h, not -23h).
    const [h, m] = manualTime.split(':').map(Number);
    const base = booking?.sessionStartedAt ? new Date(booking.sessionStartedAt) : new Date();
    const date = new Date(base);
    date.setHours(h, m, 0, 0);
    if (booking?.sessionStartedAt && date.getTime() < new Date(booking.sessionStartedAt).getTime()) {
      date.setDate(date.getDate() + 1);
    }
    return date;
  };

  const getDurationStats = () => {
    if (!booking?.sessionStartedAt) return { hours: 0, amount: 0, durationStr: '—', isMinCharge: false };
    const exitDate = getExitDate();
    if (!exitDate) return { hours: 0, amount: 0, durationStr: 'Invalid Time', isMinCharge: false };

    const entryDate = new Date(booking.sessionStartedAt);
    let diffMs = exitDate.getTime() - entryDate.getTime();
    if (diffMs < 0) diffMs = 0;

    const diffMins = Math.floor(diffMs / 60000);
    const h = Math.floor(diffMins / 60);
    const m = diffMins % 60;
    const actualStr = diffMins === 0 ? '< 1 min' : `${h > 0 ? `${h}h ` : ''}${m}m`;

    const hoursDecimal = diffMins / 60;
    const isMinCharge = hoursDecimal < 0.5; // minimum 30-min billing
    const billableHours = Math.max(0.5, hoursDecimal);
    const rate = booking.space?.hourlyRate || 0;
    const amount = Math.round(billableHours * rate); // matches backend Math.round in releaseSpace
    const durationStr = isMinCharge ? `${actualStr} (min 30 min)` : actualStr;

    return { hours: billableHours, amount, durationStr, isMinCharge };
  };

  const handleCompleteSession = async () => {
    if (!useNetworkStore.getState().requireOnline()) return;
    const exitDate = getExitDate();
    if (!exitDate) {
      Alert.alert('Invalid Time', 'Please enter a valid exit time (HH:MM in 24hr format).');
      return;
    }

    if (booking?.sessionStartedAt && exitDate.getTime() < new Date(booking.sessionStartedAt).getTime()) {
      Alert.alert('Invalid Time', 'Exit time cannot be before entry time.');
      return;
    }

    // ParkSwift never collects, verifies or holds payment — the owner is paid
    // directly by the parker (cash or the UPI QR shown below). So there's no
    // payment check here; the owner completes once they've settled in person.
    await doRelease(exitDate);
  };

  const doRelease = async (exitDate: Date) => {
    try {
      setActionLoading(true);
      const data = await api.put(`/bookings/${bookingId}/release`, { exitTime: exitDate.toISOString() });
      const summary = data.summary || { totalAmount: getDurationStats().amount };
      // Session done — offer to rate the parker before leaving. We keep actionLoading
      // off so the modal's own controls are interactive.
      setActionLoading(false);
      Alert.alert('Session Completed', `Successfully collected ₹${summary.totalAmount}.`, [
        { text: 'OK', onPress: () => setRateModalVisible(true) }
      ]);
    } catch (err: any) {
      setActionLoading(false);
      // Race: the parker may have force-completed the session a moment before the
      // owner tapped Complete. The release then fails with "not active" — treat it
      // as already-done rather than a scary error, and close the screen.
      const msg = String(err?.message || '');
      if (/not active|already|completed/i.test(msg)) {
        Alert.alert(
          'Session Completed',
          'This session was already completed. No exit confirmation is needed.',
          [{ text: 'OK', onPress: () => router.back() }],
        );
      } else {
        Alert.alert('Error', err.message);
      }
    }
  };

  // Owner → parker rating. Backend auto-detects direction from the caller, so we hit
  // the same POST /ratings endpoint the parker uses.
  const handleSubmitRating = async () => {
    if (stars === 0) return;
    if (!useNetworkStore.getState().requireOnline()) return;
    try {
      setSubmittingRating(true);
      await api.post('/ratings', {
        bookingId,
        rating: stars,
        review: ratingComment.trim() || undefined,
      });
      setRateModalVisible(false);
      Alert.alert('Rating Submitted', 'Thanks for rating this parker.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message);
      setSubmittingRating(false);
    }
  };

  const handleSkipRating = () => {
    setRateModalVisible(false);
    router.back();
  };

  // Owner → Report Parker. Files an abuse report against the parker (payment
  // disputes etc.); the admin reviews. The app does not adjudicate payment itself.
  const handleSubmitReport = async () => {
    if (!useNetworkStore.getState().requireOnline()) return;
    const parkerId = booking?.parker?.id ?? booking?.parkerId;
    if (!parkerId) { Alert.alert('Error', 'Parker not identified for this booking.'); return; }
    if (reportDesc.trim().length < 5) {
      Alert.alert('Add a few words', 'Please describe what happened (at least 5 characters).');
      return;
    }
    setSubmittingReport(true);
    try {
      const res = await api.post('/abuse-reports', {
        reportedUserId: parkerId,
        abuseType: reportType,
        description: reportDesc.trim(),
      });
      const ref = res?.report?.id ? `ABU-${String(res.report.id).padStart(5, '0')}` : 'Submitted';
      setReportRef(ref);
      setReportModalVisible(false);
      Alert.alert('Report submitted', `Reference ${ref}. Our team will review it.`);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not submit the report.');
    } finally {
      setSubmittingReport(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <PageHeader title="Exit Verification" onBack={() => router.replace('/(my-spaces)')} />
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  if (error || !booking) {
    return (
      <SafeAreaView style={styles.container}>
        <PageHeader title="Exit Verification" onBack={() => router.replace('/(my-spaces)')} />
        <View style={styles.center}>
          <Text style={styles.errorText}>{error || 'Booking not found'}</Text>
          <TouchableOpacity style={styles.btnPrimary} onPress={fetchBooking}>
            <Text style={styles.btnPrimaryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const stats = getDurationStats();

  // Owner's own UPI ID — when set, we render the OWNER's QR here so the parker can
  // scan it and pay them directly. ParkSwift never holds the money; the QR is just
  // a convenience built from upi://pay. If the owner hasn't added a UPI ID, they
  // collect cash (or share UPI out-of-band) instead.
  const ownerUpiId: string | null = booking?.space?.owner?.upiId || null;
  const ownerName: string = booking?.space?.owner?.name
    || [booking?.space?.owner?.firstName, booking?.space?.owner?.lastName].filter(Boolean).join(' ')
    || 'ParkSwift Owner';
  // QR carries NO amount (one QR per session; the parker enters the final amount).
  const upiPayString = ownerUpiId
    ? `upi://pay?pa=${ownerUpiId}&pn=${ownerName.replace(/[^a-zA-Z0-9\s\-._]/g, '').substring(0, 60)}&cu=INR&tn=Parking fee`
    : null;

  // If the owner already confirmed payment on the Live Sessions screen, the exit
  // screen just shows ✅ Received — no QR, no re-collection (per the agreed flow).
  const alreadyPaid = booking?.paymentStatus === 'PAID';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <PageHeader title="Exit Verification" onBack={() => router.replace('/(my-spaces)')} />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Session Details Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Session Details</Text>
          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <View style={styles.iconCircleSmall}><User size={16} color={colors.textPrimary} /></View>
              <View>
                <Text style={styles.infoLabel}>Parker</Text>
                <Text style={styles.infoValue} numberOfLines={1}>{[booking.parker?.firstName, booking.parker?.lastName].filter(Boolean).join(' ') || 'Unknown'}</Text>
              </View>
            </View>
            <View style={styles.detailItem}>
              <View style={styles.iconCircleSmall}><Car size={16} color={colors.textPrimary} /></View>
              <View>
                <Text style={styles.infoLabel}>Vehicle</Text>
                <Text style={styles.infoValue} numberOfLines={1}>{booking.vehicle?.licensePlate || 'N/A'}</Text>
              </View>
            </View>
          </View>
          <View style={[styles.detailItem, { marginTop: Spacing.lg }]}>
            <View style={styles.iconCircleSmall}><Clock size={16} color={colors.textPrimary} /></View>
            <View>
              <Text style={styles.infoLabel}>Entry Time</Text>
              <Text style={styles.infoValue}>
                {booking.sessionStartedAt 
                  ? new Date(booking.sessionStartedAt).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', hour12:true })
                  : 'N/A'}
              </Text>
            </View>
          </View>
        </View>

        {/* Exit Time Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Exit Time</Text>
          
          <View style={styles.radioRow}>
            <TouchableOpacity 
              style={[styles.radioCardCompact, useCurrentTime && styles.radioCardActive]}
              onPress={() => setUseCurrentTime(true)}
              activeOpacity={0.7}
            >
              <View style={[styles.radioOuter, useCurrentTime && styles.radioOuterActive]}>
                {useCurrentTime && <View style={styles.radioInner} />}
              </View>
              <View>
                <Text style={[styles.radioTitle, useCurrentTime && styles.radioTitleActive]}>Current Time</Text>
                <Text style={styles.radioSub}>{new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', hour12:true })}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.radioCardCompact, !useCurrentTime && styles.radioCardActive]}
              onPress={() => {
                setUseCurrentTime(false);
                if (!manualTime) {
                  const d = new Date();
                  setManualTime(`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`);
                }
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.radioOuter, !useCurrentTime && styles.radioOuterActive]}>
                {!useCurrentTime && <View style={styles.radioInner} />}
              </View>
              <View>
                <Text style={[styles.radioTitle, !useCurrentTime && styles.radioTitleActive]}>Manual Time</Text>
                {!useCurrentTime ? (
                  <TextInput
                    style={styles.timeInputCompact}
                    value={manualTime}
                    onChangeText={setManualTime}
                    placeholder="HH:MM"
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                  />
                ) : (
                  <Text style={styles.radioSub}>Enter Custom</Text>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Calculation Card */}
        <View style={styles.calcCard}>
          <Text style={styles.cardTitle}>Summary</Text>
          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>Duration</Text>
            <Text style={[styles.calcVal, stats.isMinCharge && { color: colors.amberWarning }]}>{stats.durationStr}</Text>
          </View>
          {stats.isMinCharge && (
            <Text style={styles.minChargeNote}>Minimum 30-min charge applies</Text>
          )}
          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>Hourly Rate</Text>
            <Text style={styles.calcVal}>₹{booking.space?.hourlyRate || 0}/hour</Text>
          </View>
          <View style={styles.calcTotalRow}>
            <Text style={styles.calcTotalLabel}>Parking Fee</Text>
            <Text style={styles.calcTotalVal}>₹{stats.amount}</Text>
          </View>
        </View>

        {/* Payment. If the owner already confirmed receipt on Live Sessions, just
            show ✅ Received — no QR. Otherwise show the QR (no amount) so the parker
            can still pay at exit. ParkSwift never collects/verifies/holds money. */}
        {alreadyPaid ? (
          <View style={styles.payCard}>
            <View style={styles.paidRow}>
              <CheckCircle2 size={20} color={colors.success} strokeWidth={2.4} />
              <Text style={styles.paidText}>Payment received</Text>
            </View>
            <Text style={styles.payCardSub}>You confirmed payment for this session.</Text>
          </View>
        ) : (
          <View style={styles.payCard}>
            <Text style={styles.cardTitle}>Collect ₹{stats.amount}</Text>
            {upiPayString ? (
              <>
                <Text style={styles.payCardSub}>Have the parker scan your UPI QR and pay ₹{stats.amount}.</Text>
                <View style={styles.qrWrap}>
                  <QRCode value={upiPayString} size={180} backgroundColor="#fff" />
                </View>
                <View style={styles.upiPill}>
                  <Text style={styles.upiPillText}>{ownerUpiId}</Text>
                </View>
              </>
            ) : (
              <View style={styles.cashRow}>
                <Smartphone size={16} color={colors.textSecondary} strokeWidth={2.2} />
                <Text style={styles.cashNote}>
                  Collect ₹{stats.amount} in cash, or share your UPI ID with the parker. Add a UPI ID in Manage Billing to show a scan-to-pay QR here.
                </Text>
              </View>
            )}
            <View style={styles.disclaimerRow}>
              <Info size={13} color={colors.textMuted} strokeWidth={2.2} />
              <Text style={styles.disclaimerText}>
                Payment goes directly to you — ParkSwift does not process, hold, or verify money. Confirm receipt in your own UPI app before completing the session.
              </Text>
            </View>
          </View>
        )}

        {/* Report the parker — payment is between the two users, so a non-payment is
            a dispute the owner can raise. Admin reviews it. */}
        <TouchableOpacity
          style={styles.reportRow}
          onPress={() => setReportModalVisible(true)}
          disabled={!!reportRef}
          activeOpacity={0.7}
        >
          <Flag size={16} color={reportRef ? colors.textMuted : colors.error} strokeWidth={2} />
          <View style={{ flex: 1 }}>
            <Text style={styles.reportRowText}>{reportRef ? 'Report submitted' : 'Report Parker'}</Text>
            <Text style={styles.reportRowSub}>{reportRef ? reportRef : 'Payment not received, left without paying'}</Text>
          </View>
          {!reportRef && <Text style={styles.reportRowArrow}>›</Text>}
        </TouchableOpacity>
      </ScrollView>

      {/* Sticky Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.btnPrimary} onPress={handleCompleteSession} disabled={actionLoading}>
          {actionLoading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.btnPrimaryText}>Complete Session</Text>}
        </TouchableOpacity>
      </View>

      {/* Rate Parker Modal — offered after a session is completed */}
      <Modal visible={rateModalVisible} transparent animationType="fade" statusBarTranslucent onRequestClose={handleSkipRating}>
        {/* Tap the dimmed backdrop to dismiss (like Uber/Swiggy); tapping the card
            itself does NOT close it. animationType="fade" eases the dim in. */}
        <Pressable style={styles.modalOverlay} onPress={handleSkipRating}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <View style={styles.rateHeader}>
              <View style={styles.rateBadge}>
                <CheckCircle2 size={28} color={colors.success} strokeWidth={2} />
              </View>
              <Text style={styles.rateTitle}>Rate this Parker</Text>
              <Text style={styles.rateSub}>
                How was your experience with {[booking.parker?.firstName, booking.parker?.lastName].filter(Boolean).join(' ') || 'this parker'}?
              </Text>
            </View>

            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setStars(star)} activeOpacity={0.7}>
                  <Star
                    size={40}
                    color={star <= stars ? colors.starYellow : colors.borderLight}
                    fill={star <= stars ? colors.starYellow : 'transparent'}
                    strokeWidth={1.5}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.reviewInput}
              placeholder="Add a note about this parker (optional)"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              value={ratingComment}
              onChangeText={setRatingComment}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.btnPrimary, (stars === 0 || submittingRating) && styles.btnDisabled]}
              onPress={handleSubmitRating}
              disabled={stars === 0 || submittingRating}
            >
              {submittingRating
                ? <ActivityIndicator color={colors.white} />
                : <Text style={styles.btnPrimaryText}>Submit Rating</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnSkip} onPress={handleSkipRating} disabled={submittingRating}>
              <Text style={styles.btnSkipText}>Skip</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Report Parker Modal — owner files an abuse report (payment disputes etc.). */}
      <Modal visible={reportModalVisible} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setReportModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setReportModalVisible(false)}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <View style={styles.reportHeader}>
              <View style={styles.reportHeaderLeft}>
                <Flag size={20} color={colors.error} strokeWidth={2.2} />
                <Text style={styles.reportTitle}>Report Parker</Text>
              </View>
              <TouchableOpacity onPress={() => setReportModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <X size={20} color={colors.textSecondary} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <Text style={styles.reportSub}>Our team reviews reports. ParkSwift does not verify payments — this is a dispute between you and the parker.</Text>

            {REPORT_REASONS.map((r) => (
              <TouchableOpacity
                key={r.value}
                style={[styles.reasonRow, reportType === r.value && styles.reasonRowActive]}
                onPress={() => setReportType(r.value)}
                activeOpacity={0.8}
              >
                <View style={[styles.radioOuter, reportType === r.value && styles.radioOuterActive]}>
                  {reportType === r.value && <View style={styles.radioInner} />}
                </View>
                <Text style={[styles.reasonText, reportType === r.value && styles.reasonTextActive]}>{r.label}</Text>
              </TouchableOpacity>
            ))}

            <TextInput
              style={styles.reportInput}
              placeholder="Describe what happened…"
              placeholderTextColor={colors.textMuted}
              value={reportDesc}
              onChangeText={setReportDesc}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.btnPrimary, submittingReport && { opacity: 0.6 }]}
              onPress={handleSubmitReport}
              disabled={submittingReport}
              activeOpacity={0.85}
            >
              {submittingReport ? <ActivityIndicator color={colors.white} /> : <Text style={styles.btnPrimaryText}>Submit Report</Text>}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ColorsType) => StyleSheet.create({
  // Grey screen background so the white cards (Session Details, Exit Time,
  // Summary) stand out, matching the rest of the app. Previously white-on-white
  // made the cards nearly invisible.
  container: { flex: 1, backgroundColor: colors.screenBg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: colors.error, marginBottom: Spacing.lg },

  contentContainer: { padding: Spacing['3xl'], gap: Spacing.xl, paddingBottom: Spacing['7xl'] },

  card: { backgroundColor: colors.white, borderRadius: BorderRadius.lg, padding: Spacing['3xl'], borderWidth: 1, borderColor: colors.borderLight },
  cardTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: colors.textPrimary, marginBottom: Spacing.lg },

  detailsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, flex: 1 },
  iconCircleSmall: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.borderLighter, alignItems: 'center', justifyContent: 'center' },
  infoLabel: { fontSize: FontSize.xs, color: colors.textSecondary, fontWeight: FontWeight.medium },
  infoValue: { fontSize: FontSize.sm, color: colors.textPrimary, fontWeight: FontWeight.semibold },

  radioRow: { flexDirection: 'row', gap: Spacing.lg },
  radioCardCompact: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', padding: Spacing.lg, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.screenBg },
  // Light tint (not the saturated primaryLight) so the primary-colored title/time
  // stays readable on it — the bright pink fill made pink text unreadable.
  radioCardActive: { borderColor: colors.primary, backgroundColor: colors.primaryBg },
  radioOuter: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: colors.borderMedium, marginRight: Spacing.md, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.micro },
  radioOuterActive: { borderColor: colors.primary },
  radioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  radioTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: colors.textDark, marginBottom: Spacing.micro },
  radioTitleActive: { color: colors.primary },
  radioSub: { fontSize: FontSize.xs, color: colors.textSecondary },
  timeInputCompact: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderLight, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, fontSize: FontSize.sm, color: colors.textPrimary, marginTop: Spacing.xs, width: 70, textAlign: 'center' },

  calcCard: { backgroundColor: colors.white, borderRadius: BorderRadius.lg, padding: Spacing['3xl'], borderWidth: 1, borderColor: colors.borderLight },
  calcRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.md },
  calcLabel: { fontSize: FontSize.sm, color: colors.textSecondary, fontWeight: FontWeight.medium },
  calcVal: { fontSize: FontSize.sm, color: colors.textPrimary, fontWeight: FontWeight.semibold },
  calcTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.md, paddingTop: Spacing.lg, borderTopWidth: 1, borderTopColor: colors.borderLighter, borderStyle: 'dashed' },
  calcTotalLabel: { fontSize: FontSize.base, color: colors.textPrimary, fontWeight: FontWeight.bold },
  calcTotalVal: { fontSize: FontSize['3xl'], color: colors.primary, fontWeight: FontWeight.extrabold },
  minChargeNote: { fontSize: FontSize.xs, color: colors.warningAlt, fontWeight: FontWeight.semibold, marginTop: -6, marginBottom: Spacing.lg },

  // Payment status block inside the Summary card
  // Collect-payment card — owner's QR (or cash note) + disclaimer.
  payCard: { backgroundColor: colors.white, borderRadius: BorderRadius.lg, padding: Spacing['3xl'], borderWidth: 1, borderColor: colors.borderLight, marginTop: Spacing.lg, alignItems: 'center' },
  payCardSub: { fontSize: FontSize.sm, color: colors.textSecondary, textAlign: 'center', marginBottom: Spacing.lg },
  paidRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, marginBottom: Spacing.xs },
  paidText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: colors.success },
  qrWrap: { padding: Spacing.xl, backgroundColor: colors.white, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: colors.borderLight, marginBottom: Spacing.lg },
  upiPill: { backgroundColor: colors.screenBg, borderRadius: BorderRadius.circleXl, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm },
  upiPillText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: colors.textBody },
  cashRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, alignSelf: 'stretch' },
  cashNote: { flex: 1, fontSize: FontSize.sm, color: colors.textSecondary, lineHeight: 20 },
  disclaimerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginTop: Spacing.lg, alignSelf: 'stretch' },
  disclaimerText: { flex: 1, fontSize: FontSize.xs, color: colors.textMuted, lineHeight: 16 },

  // Report Parker entry row + modal.
  reportRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: colors.white, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: colors.borderLight, padding: Spacing['3xl'], marginTop: Spacing.lg },
  reportRowText: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: colors.textPrimary },
  reportRowSub: { fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 },
  reportRowArrow: { fontSize: FontSize.xl, color: colors.textMuted },
  reportHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  reportHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  reportTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: colors.textPrimary },
  reportSub: { fontSize: FontSize.sm, color: colors.textSecondary, marginBottom: Spacing.lg, lineHeight: 18 },
  reasonRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: colors.borderLight, marginBottom: Spacing.sm },
  reasonRowActive: { borderColor: colors.primary, backgroundColor: colors.primaryBg },
  reasonText: { fontSize: FontSize.base, color: colors.textBody },
  reasonTextActive: { fontWeight: FontWeight.semibold, color: colors.textPrimary },
  reportInput: { borderWidth: 1, borderColor: colors.borderLight, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, fontSize: FontSize.base, color: colors.textPrimary, backgroundColor: colors.screenBg, minHeight: 72, marginTop: Spacing.sm, marginBottom: Spacing.lg },

  footer: { padding: Spacing['3xl'], backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.borderLight },
  btnPrimary: { backgroundColor: colors.primary, borderRadius: BorderRadius.lg, paddingVertical: Spacing['2xl'], alignItems: 'center' },
  btnPrimaryText: { color: colors.white, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  btnDisabled: { opacity: 0.5 },

  // Rate Parker modal
  // Centered card (fades in) — not a bottom sheet, so no dark sweep up from below.
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', paddingHorizontal: Spacing['3xl'] },
  modalSheet: { backgroundColor: colors.white, borderRadius: BorderRadius.xl, padding: Spacing['3xl'] },
  modalHandle: { height: 0 }, // hidden — drag handle only makes sense for a bottom sheet
  rateHeader: { alignItems: 'center', marginBottom: Spacing['2xl'] },
  rateBadge: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.borderLighter, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg },
  rateTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: colors.textPrimary, marginBottom: Spacing.xs },
  rateSub: { fontSize: FontSize.sm, color: colors.textSecondary, textAlign: 'center' },
  starsContainer: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.lg, marginBottom: Spacing['2xl'] },
  reviewInput: { backgroundColor: colors.screenBg, borderWidth: 1, borderColor: colors.borderLight, borderRadius: BorderRadius.lg, padding: Spacing.lg, fontSize: FontSize.sm, color: colors.textPrimary, minHeight: 80, textAlignVertical: 'top', marginBottom: Spacing.xl },
  btnSkip: { paddingVertical: Spacing.lg, alignItems: 'center', marginTop: Spacing.sm },
  btnSkipText: { color: colors.textSecondary, fontSize: FontSize.base, fontWeight: FontWeight.semibold },
});

