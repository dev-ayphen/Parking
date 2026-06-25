import React, { useState, useEffect, useCallback } from 'react';
import {View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  StatusBar,
  Modal,
  ActivityIndicator,
  RefreshControl,
  DeviceEventEmitter,
  Linking} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'react-native';
import { Check, X, Camera, Phone, ShieldCheck, CheckCircle, Car, MapPin, Plus, Navigation, Clock } from 'lucide-react-native';
import { pickMedia } from '../../utils/pickMedia';
import { useFocusEffect, useRouter } from 'expo-router';
import { PageHeader } from '../../components';
import { api } from '../../services/api';
import { useNetworkStore } from '../../store/networkStore';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, ExtendedColors } from '../../theme';
import { useSessionBarStore } from '../../store/sessionBarStore';

interface OwnerRequest {
  id: string;
  status: string;
  arrivedAt: string | null;
  sessionOtp: string | null;
  parkerName: string;
  parkerPhotoUrl: string | null;
  phone: string;
  spaceName: string;
  durationHours: number;
  etaText: string;
  // Raw ETA + whether the parker updated it (so the card can flag the new time).
  etaUpdatedAt: string | null;
  vehicle: string;
  amount: number;
}

const formatEta = (eta: string | null | undefined) => {
  if (!eta) return '—';
  const d = new Date(eta);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
};

export default function VerifyScreen() {
  const router = useRouter();
  const setBarForSource = useSessionBarStore((s) => s.setBarForSource);
  const clearSource = useSessionBarStore((s) => s.clearSource);
  const setBar = useCallback((b: any) => setBarForSource('owner', b), [setBarForSource]);
  const clearBar = useCallback(() => clearSource('owner'), [clearSource]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pending, setPending] = useState<OwnerRequest[]>([]);
  const [enRoute, setEnRoute] = useState<OwnerRequest[]>([]);   // APPROVED, not yet arrived
  const [approved, setApproved] = useState<OwnerRequest[]>([]);  // APPROVED + arrived/OTP

  // Reject flow
  const [rejectTarget, setRejectTarget] = useState<OwnerRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  // Arrival verification flow
  const [verifyTarget, setVerifyTarget] = useState<OwnerRequest | null>(null);
  const [verifyStep, setVerifyStep] = useState<'DAMAGE' | 'PHOTOS' | 'OTP'>('DAMAGE');
  const [submittingVerify, setSubmittingVerify] = useState(false);
  const [damagePhotos, setDamagePhotos] = useState<string[]>([]); // local URIs before upload
  const [enteredOtp, setEnteredOtp] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  // `mode`:
  //   'initial' → show the full-screen loader (first load only)
  //   'refresh' → show the pull-to-refresh spinner
  //   'silent'  → background poll / socket refresh — NO loader toggles, so it
  //               never unmounts the screen (which was making the open OTP modal
  //               flicker closed-then-open every 8s).
  const fetchRequests = useCallback(async (mode: 'initial' | 'refresh' | 'silent' = 'initial') => {
    try {
      if (mode === 'initial') setLoading(true);
      else if (mode === 'refresh') setRefreshing(true);
      const json = await api.get('/bookings/owner-requests');
      if (!json.success) return;

      const mapped: OwnerRequest[] = (json.bookings || []).map((b: any) => ({
        id: String(b.id),
        status: b.status,
        arrivedAt: b.arrivedAt || null,
        sessionOtp: b.sessionOtp || null,
        parkerName: b.parkerName || 'Unknown',
        parkerPhotoUrl: b.parkerPhotoUrl || null,
        phone: b.parker?.phone || '',
        spaceName: b.spaceName || '—',
        durationHours: b.duration || 1,
        etaText: formatEta(b.eta),
        etaUpdatedAt: b.etaUpdatedAt || null,
        vehicle: b.vehicle
          ? `${b.vehicle.brandModel || b.vehicle.vehicleType || 'Vehicle'} (${b.vehicle.licensePlate || '—'})`
          : '—',
        amount: b.totalAmount || 0,
      }));

      setPending(mapped.filter((m) => m.status === 'PENDING_APPROVAL'));
      // APPROVED but parker hasn't tapped "I Have Arrived" yet → en-route info card
      setEnRoute(mapped.filter((m) => m.status === 'APPROVED' && !m.arrivedAt && !m.sessionOtp));
      // APPROVED + arrived or OTP ready → needs verification action
      setApproved(mapped.filter((m) => m.status === 'APPROVED' && (!!m.arrivedAt || !!m.sessionOtp)));
    } catch (e) {
      if (__DEV__) console.log('[VERIFY] error', e);
    } finally {
      if (mode === 'initial') setLoading(false);
      else if (mode === 'refresh') setRefreshing(false);
      // 'silent' touches neither flag → no re-render that could close the modal.
    }
  }, []);

  // Fetch on focus + poll every 8s while focused — self-healing fallback for
  // missed socket events (the owner must not miss an arrival or cancellation).
  useFocusEffect(useCallback(() => {
    fetchRequests('initial');
    const poll = setInterval(() => fetchRequests('silent'), 8000);
    // This screen IS the verification UI — hide the floating session bar while
    // it's focused (it would cover the action buttons / duplicate the status).
    DeviceEventEmitter.emit('sessionbar:suppress', true);
    return () => {
      clearInterval(poll);
      DeviceEventEmitter.emit('sessionbar:suppress', false);
    };
  }, [fetchRequests]));

  // Live refresh on new booking / arrival / when the parker generates their OTP
  useEffect(() => {
    const events = ['booking:new', 'parker:arrived', 'parker:eta-update', 'verification:ready', 'session:started', 'booking:cancelled', 'booking:expired', 'notification:new'];
    const subs = events.map((evt) => DeviceEventEmitter.addListener(evt, () => fetchRequests('silent')));
    return () => subs.forEach((s) => s.remove());
  }, [fetchRequests]);

  // ── Feed session bar from verify screen state ────────────────────────
  // "parker at gate" = APPROVED bookings waiting for OTP verification
  useEffect(() => {
    if (approved.length > 0) {
      const req = approved[0];
      setBar({
        variant: 'parker_at_gate',
        bookingId: String(req.id),
        spaceName: req.spaceName,
        parkerName: req.parkerName,
        vehiclePlate: req.vehicle,
        amount: req.amount ?? null,
        durationHours: req.durationHours ?? null,
        expiresAt: null,
        endsAtISO: null,
        otp: null,
        etaText: null,
      });
    } else if (pending.length > 0) {
      // Fallback: parker en route (approved, not yet arrived)
      const req = pending[0];
      setBar({
        variant: 'parker_en_route',
        bookingId: String(req.id),
        spaceName: req.spaceName,
        parkerName: req.parkerName,
        vehiclePlate: req.vehicle,
        amount: req.amount ?? null,
        durationHours: req.durationHours ?? null,
        expiresAt: null,
        endsAtISO: null,
        otp: null,
        etaText: req.etaText ?? null,
      });
    } else {
      clearBar();
    }
  }, [approved, pending, setBar, clearBar]);

  const handleAccept = async (booking: OwnerRequest) => {
    try {
      setAcceptingId(booking.id);
      await api.put(`/bookings/${booking.id}/accept`);
      fetchRequests('silent');
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setAcceptingId(null);
    }
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    if (!useNetworkStore.getState().requireOnline()) return;
    if (rejectReason.trim().length < 3) {
      Alert.alert('Reason Required', 'Please enter a brief reason (at least 3 characters).');
      return;
    }
    try {
      setRejecting(true);
      await api.put(`/bookings/${rejectTarget.id}/decline`, { reason: rejectReason.trim() });
      setRejectTarget(null);
      setRejectReason('');
      fetchRequests('silent');
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setRejecting(false);
    }
  };

  // Owner cancels an already-APPROVED booking (accidental accept, emergency,
  // spot turned out to be occupied). Confirms first — this is destructive.
  const cancelApproved = (booking: OwnerRequest) => {
    Alert.alert(
      'Cancel This Booking?',
      `This will cancel ${booking.parkerName}'s approved booking and free up your space. They'll be notified.`,
      [
        { text: 'Keep It', style: 'cancel' },
        {
          text: 'Cancel Booking',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.put(`/bookings/${booking.id}/cancel`, { reason: 'Cancelled by space owner' });
              fetchRequests('silent');
            } catch (e) {
              Alert.alert('Error', (e as Error).message);
            }
          },
        },
      ],
    );
  };

  const openVerify = (booking: OwnerRequest) => {
    setVerifyTarget(booking);
    setVerifyStep('DAMAGE');
    setEnteredOtp('');
  };

  const closeVerify = () => {
    setVerifyTarget(null);
    setVerifyStep('DAMAGE');
    setDamagePhotos([]);
    setEnteredOtp('');
  };

  // "No Visible Damage" → record immediately and move to OTP.
  const submitNoConcern = async () => {
    if (!verifyTarget) return;
    if (!useNetworkStore.getState().requireOnline()) return;
    try {
      setSubmittingVerify(true);
      await api.post(`/bookings/${verifyTarget.id}/verification`, {
        verificationType: 'NO_CONCERN',
        mediaUrls: [],
      });
      setVerifyStep('OTP');
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setSubmittingVerify(false);
    }
  };

  const pickDamagePhoto = async () => {
    try {
      // Let the owner snap the damage on the spot OR pick an existing photo.
      const asset = await pickMedia({ allowsEditing: false, quality: 0.6 });
      if (!asset) return;
      setDamagePhotos((prev) => [...prev, asset.uri].slice(0, 6));
    } catch {
      Alert.alert('Error', 'Could not capture photo.');
    }
  };

  const removeDamagePhoto = (uri: string) =>
    setDamagePhotos((prev) => prev.filter((u) => u !== uri));

  // "Damage Found" → upload the captured photos to Supabase, then record the
  // verification with their URLs and move to OTP.
  const submitDamagePhotos = async () => {
    if (!verifyTarget) return;
    if (!useNetworkStore.getState().requireOnline()) return;
    if (damagePhotos.length === 0) {
      Alert.alert('Add a Photo', 'Please capture at least one photo of the existing damage.');
      return;
    }
    try {
      setSubmittingVerify(true);
      const files = damagePhotos.map((uri, i) => {
        const ext = (uri.split('.').pop() || 'jpg').toLowerCase();
        const type = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
        return { field: 'files', uri, name: `condition_${i}.${ext}`, type };
      });
      const up = await api.upload('/uploads/evidence', files);
      const mediaUrls: string[] = up.urls || [];

      await api.post(`/bookings/${verifyTarget.id}/verification`, {
        verificationType: 'PHOTO_VIDEO',
        mediaUrls,
      });
      setVerifyStep('OTP');
    } catch (e) {
      Alert.alert('Upload Failed', (e as Error)?.message || 'Could not upload photos. Try again.');
    } finally {
      setSubmittingVerify(false);
    }
  };

  // Owner enters the OTP the parker shows them, to start the session
  const verifyOtp = async () => {
    if (!verifyTarget) return;
    if (!useNetworkStore.getState().requireOnline()) return;
    if (enteredOtp.length !== 4) {
      Alert.alert('Invalid OTP', 'Please enter the 4-digit code shown by the parker.');
      return;
    }
    try {
      setVerifyingOtp(true);
      await api.post(`/bookings/${verifyTarget.id}/verify-otp`, { otp: enteredOtp });
      closeVerify();
      fetchRequests('silent');
      // Ask the owner what to do next instead of silently moving them. They can
      // jump to the live session, or stay on this screen to verify another parker.
      Alert.alert(
        'Session Started ✅',
        'OTP verified — the parking session is now active.',
        [
          { text: 'Stay Here', style: 'cancel' },
          { text: 'View Live Session', onPress: () => router.push('/(my-spaces)/active') },
        ],
      );
    } catch (e) {
      Alert.alert('Verification Failed', (e as Error).message);
    } finally {
      setVerifyingOtp(false);
    }
  };

  const callParker = (phone: string) => {
    if (!phone) return Alert.alert('No phone number', 'This parker has no phone number on file.');
    // Normalise: if stored without country code (10 digits), prepend +91
    const normalised = /^\+/.test(phone) ? phone : `+91${phone}`;
    Linking.openURL(`tel:${normalised}`).catch(() =>
      Alert.alert('Error', 'Could not open the dialler. Please call manually: ' + phone)
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        <PageHeader title="Verify Session"  onBack={() => router.replace('/(my-spaces)')} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const isEmpty = pending.length === 0 && enRoute.length === 0 && approved.length === 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <PageHeader title="Verify Session"  onBack={() => router.replace('/(my-spaces)')} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 120, paddingTop: Spacing['3xl'] }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchRequests('refresh')} tintColor={Colors.primary} colors={[Colors.primary]} />}
      >
        {isEmpty && (
          <View style={styles.emptyState}>
            <ShieldCheck size={64} color={Colors.borderMuted} strokeWidth={1} style={{ marginBottom: 16 }} />
            <Text style={styles.emptyTitle}>Nothing to Verify</Text>
            <Text style={styles.emptySubtitle}>
              If you have an approved booking, this screen will update automatically when the parker taps "I Have Arrived".
            </Text>
          </View>
        )}

        {/* New Booking Requests */}
        {pending.length > 0 && (
          <>
            <Text style={styles.sectionHeader}>New Requests ({pending.length})</Text>
            {pending.map((req) => (
              <View key={req.id} style={styles.card}>
                <View style={styles.alertHeader}>
                  <Text style={styles.alertTitle}>🔔 New Booking Request</Text>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>PARKER</Text>
                  <Text style={styles.boldText}>{req.parkerName}</Text>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>VEHICLE</Text>
                  <Text style={styles.boldText}>{req.vehicle}</Text>
                </View>

                <View style={styles.section}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Space</Text>
                    <Text style={styles.detailValue}>{req.spaceName}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Duration</Text>
                    <Text style={styles.detailValue}>{req.durationHours} hour{req.durationHours > 1 ? 's' : ''}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Arrival by</Text>
                    <Text style={styles.detailValue}>{req.etaText}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Amount</Text>
                    <Text style={styles.detailValue}>₹{req.amount}</Text>
                  </View>
                </View>

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.declineBtn}
                    onPress={() => { setRejectTarget(req); setRejectReason(''); }}
                    disabled={acceptingId === req.id}
                  >
                    <X size={20} color={Colors.error} />
                    <Text style={styles.declineText}>Decline</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.acceptBtn}
                    onPress={() => handleAccept(req)}
                    disabled={acceptingId === req.id}
                  >
                    {acceptingId === req.id ? (
                      <ActivityIndicator size="small" color={Colors.white} />
                    ) : (
                      <>
                        <Check size={20} color={Colors.white} />
                        <Text style={styles.acceptText}>Accept Booking</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}

        {/* En-route — approved but parker hasn't arrived yet */}
        {enRoute.length > 0 && (
          <>
            <Text style={[styles.sectionHeader, { marginTop: pending.length > 0 ? 24 : 0 }]}>
              Parker on the Way ({enRoute.length})
            </Text>
            {enRoute.map((req) => (
              <View key={req.id} style={styles.enRouteCard}>
                <View style={styles.enRouteBanner}>
                  <View style={styles.enRouteBannerIcon}>
                    <Navigation size={20} color={Colors.info} strokeWidth={2.4} fill={Colors.info} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.enRouteBannerTitle}>Parker is on the way</Text>
                    <Text style={styles.enRouteBannerSub}>This card will update automatically when they arrive.</Text>
                  </View>
                </View>
                <View style={styles.enRouteDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Parker</Text>
                    <Text style={styles.detailValue}>{req.parkerName}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Vehicle</Text>
                    <Text style={styles.detailValue}>{req.vehicle}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Space</Text>
                    <Text style={styles.detailValue}>{req.spaceName}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Expected Arrival</Text>
                    <View style={styles.etaValueWrap}>
                      <Text style={styles.detailValue}>{req.etaText}</Text>
                      {req.etaUpdatedAt && (
                        <View style={styles.etaUpdatedBadge}>
                          <Clock size={10} color={Colors.warningAlt} strokeWidth={2.5} />
                          <Text style={styles.etaUpdatedBadgeText}>Updated</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  {/* When the parker changed their ETA, call it out clearly so the
                      owner notices the parker is running late / earlier. */}
                  {req.etaUpdatedAt && (
                    <View style={styles.etaUpdatedNote}>
                      <Text style={styles.etaUpdatedNoteText}>
                        The parker updated their arrival time to {req.etaText}.
                      </Text>
                    </View>
                  )}
                  <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                    <Text style={styles.detailLabel}>Amount</Text>
                    <Text style={[styles.detailValue, { color: Colors.primary, fontWeight: FontWeight.extrabold }]}>₹{req.amount}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.enRouteContactBtn} onPress={() => callParker(req.phone)}>
                  <Phone size={16} color={Colors.primary} />
                  <Text style={styles.enRouteContactText}>Contact Parker</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}

        {/* Approved — awaiting arrival verification */}
        {approved.length > 0 && (
          <>
            <Text style={[styles.sectionHeader, { marginTop: pending.length > 0 ? 24 : 0 }]}>
              Awaiting Verification ({approved.length})
            </Text>
            {approved.map((req) => (
              <View key={req.id} style={styles.card}>
                <View style={styles.approvedRow}>
                  <View style={styles.approvedIcon}>
                    {req.parkerPhotoUrl ? (
                      <Image source={{ uri: req.parkerPhotoUrl }} style={styles.approvedAvatarImg} resizeMode="cover" />
                    ) : (
                      <CheckCircle size={18} color={Colors.success} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.boldText}>{req.parkerName}</Text>
                    <View style={styles.metaRow}>
                      <Car size={13} color={Colors.textSecondary} />
                      <Text style={styles.subText}>{req.vehicle}</Text>
                    </View>
                    <View style={styles.metaRow}>
                      <MapPin size={13} color={Colors.textSecondary} />
                      <Text style={styles.subText}>{req.spaceName}</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.callIconBtn} onPress={() => callParker(req.phone)}>
                    <Phone size={18} color={Colors.textDark} />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.verifyBtn} onPress={() => openVerify(req)}>
                  <ShieldCheck size={18} color={Colors.white} style={{ marginRight: 8 }} />
                  <Text style={styles.verifyBtnText}>Verify Arrival & Start</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelApprovedBtn} onPress={() => cancelApproved(req)}>
                  <Text style={styles.cancelApprovedText}>Cancel Booking</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* Reject reason modal */}
      <Modal visible={!!rejectTarget} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Decline Booking</Text>
            <Text style={styles.modalSubtitle}>Let the parker know why you're declining. They'll see this reason.</Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="e.g. Space no longer available"
              placeholderTextColor={Colors.textMuted}
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              maxLength={300}
            />
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setRejectTarget(null)} disabled={rejecting}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dangerBtn} onPress={confirmReject} disabled={rejecting}>
                {rejecting ? <ActivityIndicator size="small" color={Colors.white} /> : <Text style={styles.confirmBtnText}>Decline</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Arrival verification modal (damage → OTP) */}
      <Modal visible={!!verifyTarget} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {verifyStep === 'DAMAGE' && (
              <>
                <Text style={styles.modalTitle}>Vehicle Condition Check</Text>
                <Text style={styles.modalSubtitle}>
                  Record the vehicle's condition before starting. This protects both you and the parker.
                </Text>

                <TouchableOpacity
                  style={styles.damageOption}
                  onPress={submitNoConcern}
                  disabled={submittingVerify}
                >
                  <CheckCircle size={22} color={Colors.success} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.damageOptionTitle}>No Visible Damage</Text>
                    <Text style={styles.damageOptionDesc}>Start the session right away.</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.damageOption}
                  onPress={() => setVerifyStep('PHOTOS')}
                  disabled={submittingVerify}
                >
                  <Camera size={22} color={Colors.warning} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.damageOptionTitle}>Damage Found</Text>
                    <Text style={styles.damageOptionDesc}>Photograph the existing damage first.</Text>
                  </View>
                </TouchableOpacity>

                {submittingVerify && (
                  <ActivityIndicator size="small" color={Colors.primary} style={{ marginTop: 16 }} />
                )}

                <TouchableOpacity style={styles.cancelLink} onPress={closeVerify} disabled={submittingVerify}>
                  <Text style={styles.cancelLinkText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}

            {verifyStep === 'PHOTOS' && (
              <>
                <Text style={styles.modalTitle}>Photograph the Damage</Text>
                <Text style={styles.modalSubtitle}>
                  Capture each damaged area before the session starts. The parker reviews these and they're kept on record.
                </Text>

                <View style={styles.photoGrid}>
                  {damagePhotos.map((uri) => (
                    <View key={uri} style={styles.photoThumb}>
                      <Image source={{ uri }} style={styles.photoImg} />
                      <TouchableOpacity style={styles.photoRemove} onPress={() => removeDamagePhoto(uri)}>
                        <X size={12} color={Colors.white} strokeWidth={3} />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {damagePhotos.length < 6 && (
                    <TouchableOpacity style={styles.photoAdd} onPress={pickDamagePhoto} disabled={submittingVerify}>
                      <Plus size={20} color={Colors.textMuted} />
                      <Text style={styles.photoAddText}>Add</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <TouchableOpacity
                  style={[styles.verifyBtn, (submittingVerify || damagePhotos.length === 0) && { opacity: 0.6 }]}
                  onPress={submitDamagePhotos}
                  disabled={submittingVerify || damagePhotos.length === 0}
                >
                  {submittingVerify
                    ? <ActivityIndicator color={Colors.white} />
                    : <Text style={styles.verifyBtnText}>Save & Continue</Text>}
                </TouchableOpacity>

                <TouchableOpacity style={styles.cancelLink} onPress={() => setVerifyStep('DAMAGE')} disabled={submittingVerify}>
                  <Text style={styles.cancelLinkText}>Back</Text>
                </TouchableOpacity>
              </>
            )}

            {verifyStep === 'OTP' && (
              <>
                <View style={styles.successBanner}>
                  <CheckCircle size={20} color={Colors.success} />
                  <Text style={styles.successText}>Condition recorded</Text>
                </View>
                <Text style={styles.modalTitle}>Enter Parker's OTP</Text>
                <Text style={styles.modalSubtitle}>
                  Ask the parker for the 4-digit code shown in their app, then enter it here to start the session.
                </Text>

                <View style={styles.otpInputBox}>
                  <TextInput
                    style={styles.otpInput}
                    value={enteredOtp}
                    onChangeText={(t) => setEnteredOtp(t.replace(/[^0-9]/g, '').slice(0, 4))}
                    keyboardType="number-pad"
                    maxLength={4}
                    placeholder="0000"
                    placeholderTextColor={Colors.borderMuted}
                    autoFocus
                    editable={!verifyingOtp}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.primaryBtn, (enteredOtp.length !== 4 || verifyingOtp) && styles.primaryBtnDisabled]}
                  onPress={verifyOtp}
                  disabled={enteredOtp.length !== 4 || verifyingOtp}
                >
                  {verifyingOtp ? <ActivityIndicator size="small" color={Colors.white} /> : <Text style={styles.primaryBtnText}>Verify & Start Session</Text>}
                </TouchableOpacity>

                <TouchableOpacity style={styles.cancelLink} onPress={closeVerify} disabled={verifyingOtp}>
                  <Text style={styles.cancelLinkText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // White SafeAreaView so the header + top inset match every other screen; the
  // scroll content below stays grey so the white cards stand out.
  safeArea: { flex: 1, backgroundColor: Colors.white },
  container: { flex: 1, backgroundColor: Colors.screenBg },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.screenBg },
  sectionHeader: { fontSize: FontSize.md, fontWeight: FontWeight.extrabold, color: Colors.textPrimary, marginBottom: Spacing.xl, paddingHorizontal: Spacing.screenH, paddingTop: Spacing['3xl'] },  // 14 = md ✓
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: Spacing['7xl'], paddingTop: 80 },
  emptyTitle: { fontSize: FontSize['3xl'], fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: Spacing.md },  // 20 = 3xl ✓
  emptySubtitle: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center', paddingHorizontal: Spacing.screenH, lineHeight: 20 },  // 14 = md ✓
  card: {
    backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.screenH, marginBottom: Spacing['3xl'], marginHorizontal: Spacing.screenH,  // 16 = lg ✓
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3,
  },
  alertHeader: {
    backgroundColor: Colors.infoBg, margin: -20, padding: Spacing['3xl'],
    borderTopLeftRadius: BorderRadius.lg, borderTopRightRadius: BorderRadius.lg, marginBottom: Spacing.screenH,  // 16 = lg ✓
  },
  alertTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: ExtendedColors.blueDeep },  // 16 = xl ✓, '#1D4ED8' ✓
  section: { marginBottom: Spacing['3xl'] },
  sectionLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, marginBottom: Spacing.sm, letterSpacing: 1 },  // 11 = xs ✓
  boldText: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: Spacing.micro },  // 16 = xl ✓
  subText: { fontSize: FontSize.base, color: Colors.textSecondary },  // 13 = base ✓
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.micro },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.md, alignItems: 'center' },
  detailLabel: { fontSize: FontSize.md, color: Colors.textSecondary },  // 14 = md ✓
  detailValue: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary },  // 14 = md ✓
  // "Updated ETA" — value + amber badge on the right, and a callout note below.
  etaValueWrap: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  etaUpdatedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.warningBgAlt,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.badge,
  },
  etaUpdatedBadgeText: { fontSize: FontSize.micro, fontWeight: FontWeight.extrabold, color: Colors.warningAlt },
  etaUpdatedNote: {
    backgroundColor: Colors.warningBgAlt,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.md,
  },
  etaUpdatedNoteText: { fontSize: FontSize.sm, color: ExtendedColors.warningMid, fontWeight: FontWeight.medium },
  actionRow: { flexDirection: 'row', gap: Spacing.xl, marginTop: Spacing.md },
  declineBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing['2xl'],
    backgroundColor: Colors.errorBg, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: ExtendedColors.redBorder,  // 12 = md ✓, '#FECACA' ✓
  },
  declineText: { color: Colors.error, fontWeight: FontWeight.bold, marginLeft: Spacing.sm },
  acceptBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: Spacing['2xl'], backgroundColor: Colors.success, borderRadius: BorderRadius.md,  // 12 = md ✓
  },
  acceptText: { color: Colors.white, fontWeight: FontWeight.bold, marginLeft: Spacing.sm },
  approvedRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing['3xl'] },
  approvedIcon: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.successBg,
    alignItems: 'center', justifyContent: 'center', marginRight: Spacing.xl, overflow: 'hidden',
  },
  approvedAvatarImg: { width: '100%', height: '100%', borderRadius: 20 },
  callIconBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surfaceBg,
    alignItems: 'center', justifyContent: 'center', marginLeft: Spacing.md,
  },
  verifyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, paddingVertical: Spacing['2xl'], borderRadius: BorderRadius.md,  // 12 = md ✓
  },
  verifyBtnText: { color: Colors.white, fontWeight: FontWeight.bold, fontSize: FontSize.lg },  // 15 = lg ✓
  cancelApprovedBtn: { alignItems: 'center', paddingVertical: Spacing.lg, marginTop: Spacing.xs },
  cancelApprovedText: { color: Colors.error, fontWeight: FontWeight.semibold, fontSize: FontSize.md },
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },   // 'rgba(0,0,0,0.5)' ✓
  modalContent: {
    backgroundColor: Colors.white, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing['4xl'], paddingBottom: Spacing['7xl'],  // 24 = xl ✓
  },
  modalTitle: { fontSize: FontSize['2xl'], fontWeight: FontWeight.extrabold, color: Colors.textPrimary, marginBottom: Spacing.md },  // 18 = 2xl ✓
  modalSubtitle: { fontSize: FontSize.md, color: Colors.textSecondary, marginBottom: Spacing.screenH, lineHeight: 20 },  // 14 = md ✓
  reasonInput: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: Spacing['2xl'],  // 12 = md ✓
    fontSize: FontSize.lg, color: Colors.textPrimary, minHeight: 90, textAlignVertical: 'top', marginBottom: Spacing.screenH,  // 15 = lg ✓
  },
  modalFooter: { flexDirection: 'row', gap: Spacing.xl },
  cancelBtn: { flex: 1, paddingVertical: Spacing['2xl'], borderRadius: BorderRadius.input, backgroundColor: Colors.surfaceBg, alignItems: 'center' },  // 10 = input ✓
  cancelBtnText: { fontWeight: FontWeight.bold, color: Colors.textBody },
  dangerBtn: { flex: 2, paddingVertical: Spacing['2xl'], borderRadius: BorderRadius.input, backgroundColor: Colors.error, alignItems: 'center' },  // 10 = input ✓
  confirmBtnText: { fontWeight: FontWeight.bold, color: Colors.white },
  damageOption: {
    flexDirection: 'row', alignItems: 'center', padding: Spacing['3xl'], borderRadius: BorderRadius.md,  // 12 = md ✓
    borderWidth: 1.5, borderColor: Colors.border, marginBottom: Spacing.xl,
  },
  damageOptionTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },  // 15 = lg ✓
  damageOptionDesc: { fontSize: FontSize.base, color: Colors.textSecondary, marginTop: Spacing.micro },  // 13 = base ✓
  cancelLink: { alignItems: 'center', paddingVertical: Spacing['2xl'], marginTop: Spacing.xs },
  cancelLinkText: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, color: Colors.textSecondary },  // 15 = lg ✓
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginVertical: Spacing.xl },
  photoThumb: { width: 72, height: 72, borderRadius: BorderRadius.md, overflow: 'hidden', position: 'relative' },
  photoImg: { width: '100%', height: '100%', backgroundColor: Colors.surfaceBg },
  photoRemove: { position: 'absolute', top: 3, right: 3, width: 18, height: 18, borderRadius: 9, backgroundColor: ExtendedColors.darkOverlay, alignItems: 'center', justifyContent: 'center' },
  photoAdd: { width: 72, height: 72, borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.screenBg, gap: 2 },
  photoAddText: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: FontWeight.medium },
  successBanner: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.successBg,
    padding: Spacing.xl, borderRadius: BorderRadius.sm, marginBottom: Spacing.screenH,  // 8 = sm ✓
  },
  successText: { marginLeft: Spacing.md, color: Colors.success, fontWeight: FontWeight.semibold, fontSize: FontSize.base },  // 13 = base ✓
  primaryBtn: { backgroundColor: Colors.primary, paddingVertical: Spacing['3xl'], borderRadius: BorderRadius.md, alignItems: 'center' },  // 12 = md ✓
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: Colors.white, fontWeight: FontWeight.bold, fontSize: FontSize.lg },  // 15 = lg ✓
  otpInputBox: {
    backgroundColor: Colors.screenBg, borderRadius: BorderRadius.lg, paddingVertical: Spacing['3xl'], alignItems: 'center',  // 16 = lg ✓
    borderWidth: 1.5, borderColor: Colors.border, marginBottom: Spacing['3xl'],
  },
  otpInput: {
    fontSize: FontSize['11xl'], fontWeight: FontWeight.extrabold, color: Colors.primary, letterSpacing: 16,  // 40 = 11xl ✓
    textAlign: 'center', minWidth: 200, paddingLeft: Spacing['3xl'],
  },

  // ── En-route card (parker approved, not yet arrived) ──────────────────
  enRouteCard: {
    backgroundColor: Colors.white, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.border, marginHorizontal: Spacing.screenH,
    marginBottom: Spacing['2xl'], overflow: 'hidden',
  },
  enRouteBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.lg,
    backgroundColor: Colors.infoBg, padding: Spacing['3xl'],
  },
  // Clean circular icon badge (replaces the out-of-place 🚗 emoji) — matches the
  // app's icon-in-circle pattern used across cards.
  enRouteBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enRouteBannerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  enRouteBannerSub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  enRouteDetails: { paddingHorizontal: Spacing['3xl'], paddingTop: Spacing.xl },
  enRouteContactBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.md, margin: Spacing['3xl'], marginTop: Spacing.xl,
    paddingVertical: Spacing.xl, borderRadius: BorderRadius.md,
    borderWidth: 1.5, borderColor: Colors.primary,
  },
  enRouteContactText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.primary },
});
