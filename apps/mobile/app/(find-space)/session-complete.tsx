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
  Modal,
  Image} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle2, Star, AlertTriangle, X, Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../../services/api';
import { useNetworkStore } from '../../store/networkStore';
import { toast } from '../../utils/toast';
import PageHeader from '../../components/PageHeader';
import ReportSubmitted from '../../components/ReportSubmitted';
import { useSessionBarStore } from '../../store/sessionBarStore';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, ExtendedColors } from '../../theme';

export default function SessionCompleteScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const bookingId = params.bookingId as string;
  const setBarForSource = useSessionBarStore((s) => s.setBarForSource);
  const clearSource = useSessionBarStore((s) => s.clearSource);
  const setBar = useCallback((b: any) => setBarForSource('parker', b), [setBarForSource]);
  const clearBar = useCallback(() => clearSource('parker'), [clearSource]);

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  // Report incident modal
  const [incidentModalVisible, setIncidentModalVisible] = useState(false);
  const [incidentType, setIncidentType] = useState('VEHICLE_DAMAGE');
  const [incidentDesc, setIncidentDesc] = useState('');
  const [incidentPhotos, setIncidentPhotos] = useState<string[]>([]);
  const [incidentSubmitting, setIncidentSubmitting] = useState(false);
  const [incidentSubmitted, setIncidentSubmitted] = useState(false);
  const [incidentRef, setIncidentRef] = useState<string | null>(null);
  const [incidentSubmittedAt, setIncidentSubmittedAt] = useState<string | null>(null);

  const fetchBooking = useCallback(async () => {
    try {
      const data = await api.get(`/bookings/${bookingId}`);
      const booking = data.booking || data.data || data;
      setBooking(booking);
      // Pre-fill rating if it already exists
      if (booking?.rating) {
        setRating(booking.rating.rating || 0);
        setReview(booking.rating.review || '');
        setRatingSubmitted(true);
      }
      // Pre-fill the incident receipt if one was already filed for this booking —
      // survives app restart so the user can't re-report the same booking.
      const existingIncident = booking?.incidents?.[0];
      if (existingIncident) {
        setIncidentRef(`INC-${String(existingIncident.id).padStart(5, '0')}`);
        setIncidentSubmittedAt(existingIncident.createdAt || null);
        setIncidentSubmitted(true);
      }
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

  // Show rating_pending bar until booking has a rating from the API; clear once rated.
  // We check booking.rating (from API) rather than ratingSubmitted local state so the
  // bar stays correct if the user reopens this screen after already submitting.
  useEffect(() => {
    if (!booking || !bookingId) return;
    const alreadyRated = !!booking.rating || ratingSubmitted;
    if (!alreadyRated) {
      setBar({
        variant: 'rating_pending',
        bookingId: String(bookingId),
        spaceName: booking.space?.name ?? '',
        parkerName: '',
        vehiclePlate: '',
        amount: booking.totalAmount ?? null,
        durationHours: null,
        expiresAt: null,
        endsAtISO: null,
        otp: null,
        etaText: null,
      });
    } else {
      clearBar();
    }
  }, [booking, bookingId, ratingSubmitted, setBar, clearBar]);

  // Single "Done" footer button. If the user picked stars, save the rating first,
  // then leave. If they didn't rate, just leave (Skip). No separate submit button.
  const handleDone = async () => {
    // Already rated, or user chose to skip (no stars) → just go home.
    if (ratingSubmitted || rating === 0) {
      router.replace('/(home)');
      return;
    }
    if (!useNetworkStore.getState().requireOnline()) return;
    try {
      setSubmittingRating(true);
      await api.post('/ratings', {
        bookingId,
        rating,
        review: review.trim() || undefined,
      });
      setRatingSubmitted(true);
      // Clear the rating_pending bar immediately, then leave.
      clearBar();
      router.replace('/(home)');
    } catch (err: any) {
      Alert.alert('Error', err.message);
      setSubmittingRating(false);
    }
  };

  const INCIDENT_TYPES = [
    { value: 'VEHICLE_DAMAGE',  label: 'Vehicle scratched or damaged' },
    { value: 'TOWING',          label: 'Vehicle was towed' },
    { value: 'DISPUTE',         label: 'Dispute with owner' },
    { value: 'THEFT',           label: 'Theft or break-in' },
    { value: 'OTHER',           label: 'Other incident' },
  ];

  const handlePickIncidentPhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        toast.info('Allow photo access to attach evidence.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]) return;
      setIncidentPhotos((prev) => [...prev, result.assets[0].uri].slice(0, 5));
    } catch {
      toast.error('Failed to pick photo');
    }
  };

  const removeIncidentPhoto = (uri: string) =>
    setIncidentPhotos((prev) => prev.filter((u) => u !== uri));

  const handleSubmitIncident = async () => {
    if (incidentSubmitting || incidentSubmitted) return; // guard re-entry / double-tap
    if (!useNetworkStore.getState().requireOnline()) return;
    if (incidentDesc.trim().length < 5) {
      Alert.alert('Too short', 'Please describe the incident (at least 5 characters).');
      return;
    }
    try {
      setIncidentSubmitting(true);

      // Upload evidence photos first → get public URLs for the admin to verify.
      let evidenceUrls: string[] = [];
      if (incidentPhotos.length > 0) {
        const files = incidentPhotos.map((uri, i) => {
          const ext = (uri.split('.').pop() || 'jpg').toLowerCase();
          const type = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
          return { field: 'files', uri, name: `incident_${i}.${ext}`, type };
        });
        const up = await api.upload('/uploads/evidence', files);
        evidenceUrls = up.urls || [];
      }

      const res = await api.post('/incidents', {
        bookingId,
        reportType: incidentType,
        description: incidentDesc.trim(),
        evidenceUrls,
      });
      const reportId = res?.report?.id;
      setIncidentRef(reportId ? `INC-${String(reportId).padStart(5, '0')}` : 'INC-PENDING');
      setIncidentSubmittedAt(res?.report?.createdAt || new Date().toISOString());
      setIncidentModalVisible(false);
      setIncidentDesc('');
      setIncidentPhotos([]);
      setIncidentSubmitted(true);
    } catch (err: any) {
      Alert.alert('Failed', err?.message || 'Could not submit report. Try again.');
    } finally {
      setIncidentSubmitting(false);
    }
  };

  const formatTime = (iso: string) => {
    if (!iso) return 'N/A';
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
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
          <TouchableOpacity style={styles.retryBtn} onPress={fetchBooking}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <PageHeader title="Session Complete" />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.contentInner}>
        {/* Success Header */}
        <View style={styles.successHeader}>
          <CheckCircle2 size={64} color={Colors.success} strokeWidth={1.5} />
          <Text style={styles.successTitle}>Session Completed</Text>
          <Text style={styles.successSub}>Thanks for parking with ParkSwift.</Text>
        </View>

        {/* Receipt Card */}
        <View style={styles.receiptCard}>
          <Text style={styles.receiptSpaceName}>{booking.space?.name}</Text>
          <Text style={styles.receiptAddress}>{booking.space?.address}</Text>

          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Vehicle</Text>
            <Text style={styles.receiptVal}>{booking.vehicle?.licensePlate}</Text>
          </View>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Entry Time</Text>
            <Text style={styles.receiptVal}>{formatTime(booking.sessionStartedAt)}</Text>
          </View>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Exit Time</Text>
            <Text style={styles.receiptVal}>{formatTime(booking.exitTime || booking.sessionEndedAt)}</Text>
          </View>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Duration</Text>
            <Text style={styles.receiptVal}>{booking.duration} hr(s)</Text>
          </View>

          <View style={styles.receiptTotalRow}>
            <Text style={styles.receiptTotalLabel}>Total Amount</Text>
            <Text style={styles.receiptTotalVal}>₹{booking.totalAmount}</Text>
          </View>
        </View>

        {/* Incident Report Card */}
        {incidentSubmitted ? (
          <View style={{ marginBottom: Spacing.screenH }}>
            <ReportSubmitted
              title="Incident Reported"
              reference={incidentRef || 'INC-PENDING'}
              submittedAt={incidentSubmittedAt || undefined}
            />
          </View>
        ) : (
          <View style={styles.incidentCard}>
            <TouchableOpacity style={styles.incidentTrigger} onPress={() => setIncidentModalVisible(true)} activeOpacity={0.7}>
              <View style={styles.incidentTriggerLeft}>
                <AlertTriangle size={18} color={Colors.warning} strokeWidth={2} />
                <View>
                  <Text style={styles.incidentTriggerTitle}>Report a Vehicle Incident</Text>
                  <Text style={styles.incidentTriggerSub}>Damage, towing, dispute, theft</Text>
                </View>
              </View>
              <Text style={styles.incidentTriggerArrow}>›</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Rating Card */}
        <View style={styles.ratingCard}>
          {ratingSubmitted ? (
            <View style={styles.ratingSuccess}>
              <CheckCircle2 size={24} color={Colors.success} />
              <View>
                <Text style={styles.ratingSuccessText}>Thanks for your feedback!</Text>
                {booking?.rating && (
                  <>
                    <View style={styles.submittedStarsContainer}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={24}
                          color={star <= booking.rating.rating ? Colors.amber : Colors.borderLight}
                          fill={star <= booking.rating.rating ? Colors.starYellow : 'transparent'}
                          strokeWidth={1.5}
                        />
                      ))}
                    </View>
                    {booking.rating.review && (
                      <Text style={styles.submittedReviewText}>"{booking.rating.review}"</Text>
                    )}
                  </>
                )}
              </View>
            </View>
          ) : (
            <>
              <Text style={styles.ratingTitle}>Rate your experience</Text>
              <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity key={star} onPress={() => setRating(star)} activeOpacity={0.7}>
                    <Star
                      size={36}
                      color={star <= rating ? Colors.starYellow : Colors.borderLight}
                      fill={star <= rating ? Colors.starYellow : 'transparent'}
                      strokeWidth={1.5}
                    />
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={styles.reviewInput}
                placeholder="Add a comment..."
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={3}
                value={review}
                onChangeText={setReview}
              />
              {/* No separate submit button — tapping "Done" in the footer auto-saves
                  the rating when stars are selected. One clear action. */}
              <Text style={styles.ratingHint}>
                {rating > 0 ? 'Tap "Done" below to save your rating' : 'Select stars, then tap "Done"'}
              </Text>
            </>
          )}
        </View>
      </ScrollView>

      {/* Report Incident Modal */}
      <Modal visible={incidentModalVisible} transparent animationType="slide" onRequestClose={() => setIncidentModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Report an Incident</Text>
              <TouchableOpacity onPress={() => setIncidentModalVisible(false)} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                <X size={20} color={Colors.textSecondary} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>Let us know what happened. Our team will investigate and follow up.</Text>

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

              <Text style={styles.fieldLabel}>Incident Type</Text>
              {INCIDENT_TYPES.map(r => (
                <TouchableOpacity
                  key={r.value}
                  style={[styles.reasonRow, incidentType === r.value && styles.reasonRowActive]}
                  onPress={() => setIncidentType(r.value)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.radioOuter, incidentType === r.value && styles.radioOuterActive]}>
                    {incidentType === r.value && <View style={styles.radioInner} />}
                  </View>
                  <Text style={[styles.reasonText, incidentType === r.value && styles.reasonTextActive]}>{r.label}</Text>
                </TouchableOpacity>
              ))}

              <Text style={[styles.fieldLabel, { marginTop: Spacing.xl }]}>Details</Text>
              <TextInput
                style={styles.descInput}
                placeholder="Describe what happened..."
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={3}
                value={incidentDesc}
                onChangeText={setIncidentDesc}
                textAlignVertical="top"
              />

              {/* Photo evidence — critical for the admin to verify the claim */}
              <Text style={styles.fieldLabel}>Photos <Text style={styles.fieldLabelHint}>(optional, up to 5)</Text></Text>
              <View style={styles.photoGrid}>
                {incidentPhotos.map((uri) => (
                  <View key={uri} style={styles.photoThumb}>
                    <Image source={{ uri }} style={styles.photoImg} />
                    <TouchableOpacity style={styles.photoRemove} onPress={() => removeIncidentPhoto(uri)} hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}>
                      <X size={12} color={Colors.white} strokeWidth={3} />
                    </TouchableOpacity>
                  </View>
                ))}
                {incidentPhotos.length < 5 && (
                  <TouchableOpacity style={styles.photoAdd} onPress={handlePickIncidentPhoto} activeOpacity={0.7}>
                    <Camera size={20} color={Colors.textMuted} strokeWidth={2} />
                    <Text style={styles.photoAddText}>Add</Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, incidentSubmitting && styles.submitBtnDisabled]}
                onPress={handleSubmitIncident}
                disabled={incidentSubmitting}
                activeOpacity={0.8}
              >
                {incidentSubmitting
                  ? <ActivityIndicator color={Colors.white} size="small" />
                  : <Text style={styles.submitBtnText}>Submit Report</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Sticky Footer — single action. "Done" saves the rating (if stars chosen)
          then leaves; "Skip for now" when no stars are selected. No second
          submit button — the footer is the only action. */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={rating > 0 || ratingSubmitted ? styles.btnPrimary : styles.btnGhost}
          onPress={handleDone}
          disabled={submittingRating}
        >
          {submittingRating ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={rating > 0 || ratingSubmitted ? styles.btnPrimaryText : styles.btnGhostText}>
              {rating > 0 || ratingSubmitted ? 'Done' : 'Skip for now'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: Colors.error, marginBottom: Spacing.lg },
  retryBtn: { padding: Spacing.lg, backgroundColor: Colors.errorLight, borderRadius: BorderRadius.sm },
  retryBtnText: { color: Colors.error, fontWeight: FontWeight.semibold },
  content: { flex: 1 },
  contentInner: { padding: Spacing.screenH, paddingBottom: Spacing.lg },

  successHeader: { alignItems: 'center', marginTop: Spacing.screenH, marginBottom: Spacing['5xl'] },
  successTitle: { fontSize: FontSize['4xl'], fontWeight: FontWeight.black, color: Colors.textPrimary, marginTop: Spacing['3xl'], marginBottom: Spacing.md },
  successSub: { fontSize: FontSize.base, color: Colors.textSecondary },

  receiptCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing['4xl'],
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: Spacing.screenH,
  },
  receiptSpaceName: { fontSize: FontSize['2xl'], fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: Spacing.xs },
  receiptAddress: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.screenH },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.lg },
  receiptLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  receiptVal: { fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: FontWeight.semibold },
  receiptTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing['3xl'],
    paddingTop: Spacing['3xl'],
    borderTopWidth: 1,
    borderTopColor: Colors.borderLighter,
    borderStyle: 'dashed',
  },
  receiptTotalLabel: { fontSize: FontSize.lg, color: Colors.textPrimary, fontWeight: FontWeight.bold },
  receiptTotalVal: { fontSize: FontSize['4xl'], color: Colors.primary, fontWeight: FontWeight.black },

  ratingCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.screenH,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  ratingTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary, textAlign: 'center', marginBottom: Spacing['3xl'] },
  starsContainer: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.lg, marginBottom: Spacing.screenH },
  reviewInput: {
    backgroundColor: Colors.screenBg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: Spacing['3xl'],
  },
  ratingHint: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', fontWeight: FontWeight.medium },

  ratingSuccess: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.lg, paddingVertical: Spacing.screenH },
  ratingSuccessText: { color: Colors.success, fontSize: FontSize.lg, fontWeight: FontWeight.bold, marginBottom: Spacing.md },
  submittedStarsContainer: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  submittedReviewText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontStyle: 'italic', marginTop: Spacing.md },

  footer: { padding: Spacing.screenH, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  btnPrimary: { backgroundColor: Colors.primary, borderRadius: BorderRadius.xl, paddingVertical: Spacing['3xl'], alignItems: 'center' },
  btnPrimaryText: { color: Colors.white, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  btnGhost: { backgroundColor: Colors.white, borderRadius: BorderRadius.xl, paddingVertical: Spacing['3xl'], alignItems: 'center', borderWidth: 1, borderColor: Colors.borderLight },
  btnGhostText: { color: Colors.textSecondary, fontSize: FontSize.lg, fontWeight: FontWeight.semibold },

  // Incident card
  incidentCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: Colors.borderLight, marginBottom: Spacing.screenH, overflow: 'hidden' },
  incidentTrigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.screenH },
  incidentTriggerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  incidentTriggerTitle: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  incidentTriggerSub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  incidentTriggerArrow: { fontSize: FontSize['3xl'], color: Colors.textMuted, fontWeight: FontWeight.normal },

  // Report modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: Colors.white, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing['3xl'], paddingBottom: 36, maxHeight: '90%' },
  contextCard: { backgroundColor: Colors.screenBg, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.xl, marginBottom: Spacing['3xl'] },
  contextRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 },
  contextLabel: { fontSize: FontSize.sm, color: Colors.textMuted, fontWeight: FontWeight.medium },
  contextVal: { fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: FontWeight.semibold, flexShrink: 1, marginLeft: Spacing.lg, textAlign: 'right' },
  fieldLabelHint: { fontWeight: FontWeight.normal, color: Colors.textMuted, textTransform: 'none' },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginBottom: Spacing['3xl'] },
  photoThumb: { width: 64, height: 64, borderRadius: BorderRadius.md, overflow: 'hidden', position: 'relative' },
  photoImg: { width: '100%', height: '100%', backgroundColor: Colors.surfaceBg },
  photoRemove: { position: 'absolute', top: 3, right: 3, width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  photoAdd: { width: 64, height: 64, borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.screenBg, gap: 2 },
  photoAddText: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: FontWeight.medium },
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
});
