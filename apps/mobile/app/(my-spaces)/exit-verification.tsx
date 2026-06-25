import React, { useState, useEffect, useCallback } from 'react';
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
import { User, Car, Clock, Star, CheckCircle2, BadgeCheck, AlertCircle } from 'lucide-react-native';
import PageHeader from '../../components/PageHeader';
import { api } from '../../services/api';
import { useNetworkStore } from '../../store/networkStore';
import { useRealtime } from '../../hooks/useRealtime';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, ExtendedColors } from '../../theme';

export default function ExitVerificationScreen() {
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

    // Guard: if the parker never tapped "I've paid" via the UPI QR, warn the owner
    // before closing the session so they don't accidentally finish before collecting.
    // (The app never verifies the actual transfer — this is just a self-declared
    // marker, so the owner may still complete after collecting cash.)
    if (!booking?.parkerMarkedPaidAt) {
      Alert.alert(
        'Parker hasn’t marked as paid',
        `The parker has not confirmed payment of ₹${getDurationStats().amount}. Make sure you’ve received the amount before completing.`,
        [
          { text: 'Go back', style: 'cancel' },
          { text: 'Complete anyway', style: 'destructive', onPress: () => doRelease(exitDate) },
        ],
      );
      return;
    }

    await doRelease(exitDate);
  };

  // The actual release call (extracted so the unpaid-guard dialog can defer to it).
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <PageHeader title="Exit Verification" onBack={() => router.replace('/(my-spaces)')} />
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
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

  // Payment reconciliation. The parker pays the booking ESTIMATE (totalAmount) via
  // the UPI QR during the session; the FINAL fee is the duration-based amount we
  // compute here. They can differ if the parker overstayed or left early, so we
  // surface the gap to the owner. This is purely informational — the owner's
  // "Complete Session" still records `stats.amount` as the amount of record.
  const markedPaid = !!booking?.parkerMarkedPaidAt;
  const paidEstimate = Math.round(Number(booking?.totalAmount) || 0);
  const balance = stats.amount - paidEstimate; // >0 collect more, <0 overpaid, 0 settled

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <PageHeader title="Exit Verification" onBack={() => router.replace('/(my-spaces)')} />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Session Details Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Session Details</Text>
          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <View style={styles.iconCircleSmall}><User size={16} color={Colors.textPrimary} /></View>
              <View>
                <Text style={styles.infoLabel}>Parker</Text>
                <Text style={styles.infoValue} numberOfLines={1}>{[booking.parker?.firstName, booking.parker?.lastName].filter(Boolean).join(' ') || 'Unknown'}</Text>
              </View>
            </View>
            <View style={styles.detailItem}>
              <View style={styles.iconCircleSmall}><Car size={16} color={Colors.textPrimary} /></View>
              <View>
                <Text style={styles.infoLabel}>Vehicle</Text>
                <Text style={styles.infoValue} numberOfLines={1}>{booking.vehicle?.licensePlate || 'N/A'}</Text>
              </View>
            </View>
          </View>
          <View style={[styles.detailItem, { marginTop: Spacing.lg }]}>
            <View style={styles.iconCircleSmall}><Clock size={16} color={Colors.textPrimary} /></View>
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
            <Text style={[styles.calcVal, stats.isMinCharge && { color: Colors.amberWarning }]}>{stats.durationStr}</Text>
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

          {/* Payment status — whether the parker self-declared payment via the UPI
              QR, and (if so) whether the estimate they paid covers the final fee. */}
          <View style={styles.payDivider} />
          {markedPaid ? (
            <>
              <View style={styles.payStatusRow}>
                <View style={styles.payStatusLeft}>
                  <BadgeCheck size={18} color={Colors.success} strokeWidth={2.2} />
                  <Text style={styles.payStatusPaid}>Parker marked as paid</Text>
                </View>
                <Text style={styles.payPaidAmt}>₹{paidEstimate}</Text>
              </View>
              {balance > 0 ? (
                <View style={[styles.payNote, styles.payNoteWarn]}>
                  <AlertCircle size={14} color={Colors.warningAlt} strokeWidth={2.2} />
                  <Text style={styles.payNoteWarnText}>
                    Collect ₹{balance} more — they parked longer than the estimate.
                  </Text>
                </View>
              ) : balance < 0 ? (
                <View style={[styles.payNote, styles.payNoteInfo]}>
                  <AlertCircle size={14} color={Colors.textSecondary} strokeWidth={2.2} />
                  <Text style={styles.payNoteInfoText}>
                    Parker paid ₹{-balance} more than the final fee.
                  </Text>
                </View>
              ) : (
                <View style={[styles.payNote, styles.payNoteOk]}>
                  <CheckCircle2 size={14} color={Colors.success} strokeWidth={2.2} />
                  <Text style={styles.payNoteOkText}>Fully paid — no balance to collect.</Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.payStatusRow}>
              <View style={styles.payStatusLeft}>
                <AlertCircle size={18} color={Colors.textMuted} strokeWidth={2.2} />
                <Text style={styles.payStatusUnpaid}>Not marked paid yet</Text>
              </View>
              <Text style={styles.payCollectAmt}>Collect ₹{stats.amount}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sticky Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.btnPrimary} onPress={handleCompleteSession} disabled={actionLoading}>
          {actionLoading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.btnPrimaryText}>Complete Session</Text>}
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
                <CheckCircle2 size={28} color={Colors.success} strokeWidth={2} />
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
                    color={star <= stars ? Colors.starYellow : Colors.borderLight}
                    fill={star <= stars ? Colors.starYellow : 'transparent'}
                    strokeWidth={1.5}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.reviewInput}
              placeholder="Add a note about this parker (optional)"
              placeholderTextColor={Colors.textMuted}
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
                ? <ActivityIndicator color={Colors.white} />
                : <Text style={styles.btnPrimaryText}>Submit Rating</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnSkip} onPress={handleSkipRating} disabled={submittingRating}>
              <Text style={styles.btnSkipText}>Skip</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Grey screen background so the white cards (Session Details, Exit Time,
  // Summary) stand out, matching the rest of the app. Previously white-on-white
  // made the cards nearly invisible.
  container: { flex: 1, backgroundColor: Colors.screenBg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: Colors.error, marginBottom: Spacing.lg },

  contentContainer: { padding: Spacing['3xl'], gap: Spacing.xl, paddingBottom: Spacing['7xl'] },

  card: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing['3xl'], borderWidth: 1, borderColor: Colors.borderLight },
  cardTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: Spacing.lg },

  detailsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, flex: 1 },
  iconCircleSmall: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.borderLighter, alignItems: 'center', justifyContent: 'center' },
  infoLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  infoValue: { fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: FontWeight.semibold },

  radioRow: { flexDirection: 'row', gap: Spacing.lg },
  radioCardCompact: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', padding: Spacing.lg, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.borderLight, backgroundColor: Colors.screenBg },
  // Light tint (not the saturated primaryLight) so the primary-colored title/time
  // stays readable on it — the bright pink fill made pink text unreadable.
  radioCardActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryBg },
  radioOuter: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: Colors.borderMedium, marginRight: Spacing.md, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.micro },
  radioOuterActive: { borderColor: Colors.primary },
  radioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },
  radioTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textDark, marginBottom: Spacing.micro },
  radioTitleActive: { color: Colors.primary },
  radioSub: { fontSize: FontSize.xs, color: Colors.textSecondary },
  timeInputCompact: { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.borderLight, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, fontSize: FontSize.sm, color: Colors.textPrimary, marginTop: Spacing.xs, width: 70, textAlign: 'center' },

  calcCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing['3xl'], borderWidth: 1, borderColor: Colors.borderLight },
  calcRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.md },
  calcLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  calcVal: { fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: FontWeight.semibold },
  calcTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.md, paddingTop: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.borderLighter, borderStyle: 'dashed' },
  calcTotalLabel: { fontSize: FontSize.base, color: Colors.textPrimary, fontWeight: FontWeight.bold },
  calcTotalVal: { fontSize: FontSize['3xl'], color: Colors.primary, fontWeight: FontWeight.extrabold },
  minChargeNote: { fontSize: FontSize.xs, color: Colors.warningAlt, fontWeight: FontWeight.semibold, marginTop: -6, marginBottom: Spacing.lg },

  // Payment status block inside the Summary card
  payDivider: { height: 1, backgroundColor: Colors.borderLighter, marginTop: Spacing.lg, marginBottom: Spacing.lg },
  payStatusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  payStatusLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  payStatusPaid: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.success },
  payStatusUnpaid: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textSecondary },
  payPaidAmt: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  payCollectAmt: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.warningAlt },
  payNote: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.md, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.sm },
  payNoteWarn: { backgroundColor: Colors.warningBgAlt },
  payNoteWarnText: { flex: 1, fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.warningAlt },
  payNoteOk: { backgroundColor: Colors.successBg },
  payNoteOkText: { flex: 1, fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.success },
  payNoteInfo: { backgroundColor: Colors.screenBg },
  payNoteInfoText: { flex: 1, fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.textSecondary },

  footer: { padding: Spacing['3xl'], backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  btnPrimary: { backgroundColor: Colors.primary, borderRadius: BorderRadius.lg, paddingVertical: Spacing['2xl'], alignItems: 'center' },
  btnPrimaryText: { color: Colors.white, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  btnDisabled: { opacity: 0.5 },

  // Rate Parker modal
  // Centered card (fades in) — not a bottom sheet, so no dark sweep up from below.
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', paddingHorizontal: Spacing['3xl'] },
  modalSheet: { backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: Spacing['3xl'] },
  modalHandle: { height: 0 }, // hidden — drag handle only makes sense for a bottom sheet
  rateHeader: { alignItems: 'center', marginBottom: Spacing['2xl'] },
  rateBadge: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.borderLighter, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg },
  rateTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: Spacing.xs },
  rateSub: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center' },
  starsContainer: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.lg, marginBottom: Spacing['2xl'] },
  reviewInput: { backgroundColor: Colors.screenBg, borderWidth: 1, borderColor: Colors.borderLight, borderRadius: BorderRadius.lg, padding: Spacing.lg, fontSize: FontSize.sm, color: Colors.textPrimary, minHeight: 80, textAlignVertical: 'top', marginBottom: Spacing.xl },
  btnSkip: { paddingVertical: Spacing.lg, alignItems: 'center', marginTop: Spacing.sm },
  btnSkipText: { color: Colors.textSecondary, fontSize: FontSize.base, fontWeight: FontWeight.semibold },
});

