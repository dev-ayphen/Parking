import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
  Image,
  Platform,
} from 'react-native';
import { Clock, Navigation, Phone, CheckSquare, ShieldCheck, AlertTriangle, Headphones, Flag } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, ExtendedColors } from '../../theme';
import { styles as tabStyles } from './findSpaceStyles';
import { api } from '../../services/api';
import { useSessionBarStore, computeEndsAtISO, minsUntil } from '../../store/sessionBarStore';
import { StyleSheet } from 'react-native';

interface ActiveSessionsTabProps {
  activeBooking: any;       // summary from /bookings/my (status, id, space, vehicle)
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  setActiveTab: (tab: string) => void;
  onOpenActiveSession: () => void; // kept for back-compat, unused now
}

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

const ActiveSessionsTab: React.FC<ActiveSessionsTabProps> = ({
  activeBooking,
  loading,
  error,
  onRetry,
  setActiveTab,
}) => {
  const router = useRouter();
  const setBarForSource = useSessionBarStore((s) => s.setBarForSource);
  const clearSource = useSessionBarStore((s) => s.clearSource);

  // Full booking detail (fetched separately — summary from /my doesn't have arrivedAt etc.)
  const [detail, setDetail] = useState<any>(null);
  const [verification, setVerification] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [generatingOtp, setGeneratingOtp] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const fetchDetail = useCallback(async (isRefresh = false) => {
    if (!activeBooking?.id) return;
    isRefresh ? setRefreshing(true) : setDetailLoading(true);
    try {
      const data = await api.get(`/bookings/${activeBooking.id}`);
      const b = data.booking || data.data || data;
      if (!isMounted.current) return;
      setDetail(b);
      if (b.status === 'APPROVED') {
        try {
          const vData = await api.get(`/bookings/${activeBooking.id}/verification`);
          if (vData.verification && isMounted.current) setVerification(vData.verification);
        } catch {}
      }
    } catch {}
    finally {
      if (isMounted.current) { setDetailLoading(false); setRefreshing(false); }
    }
  }, [activeBooking?.id]);

  useEffect(() => {
    setDetail(null);
    setVerification(null);
    setGeneratedOtp(null);
    fetchDetail();
  }, [fetchDetail]);

  // Poll every 8s for live state changes (arrival, OTP, session start)
  useEffect(() => {
    if (!activeBooking?.id) return;
    const FINAL = ['COMPLETED', 'CANCELLED', 'EXPIRED', 'REJECTED'];
    if (detail?.status && FINAL.includes(detail.status)) return;
    const t = setInterval(() => fetchDetail(), 8000);
    return () => clearInterval(t);
  }, [activeBooking?.id, detail?.status, fetchDetail]);

  // Navigate to receipt on COMPLETED
  useEffect(() => {
    if (detail?.status === 'COMPLETED') {
      router.replace({ pathname: '/(find-space)/session-complete', params: { bookingId: String(activeBooking.id) } });
    }
  }, [detail?.status, activeBooking?.id, router]);

  // Session bar sync
  useEffect(() => {
    if (!detail || !activeBooking?.id) return;
    const spaceName = detail.space?.name ?? '';
    const status = detail.status;
    if (status === 'ACTIVE') {
      const endsAtISO = computeEndsAtISO(detail.sessionStartedAt, detail.eta, detail.createdAt, detail.duration ?? 1);
      const mins = minsUntil(endsAtISO);
      setBarForSource('parker', [{
        variant: mins !== null && mins < 15 ? 'session_ending' : 'session_active',
        bookingId: String(activeBooking.id), spaceName,
        parkerName: '', vehiclePlate: detail.vehicle?.licensePlate ?? '',
        amount: detail.totalAmount ?? null, durationHours: detail.duration ?? null,
        expiresAt: null, endsAtISO, otp: generatedOtp ?? detail.sessionOtp ?? null, etaText: null,
      }]);
    } else if (status === 'APPROVED') {
      setBarForSource('parker', [{
        variant: 'arrived_otp_ready', bookingId: String(activeBooking.id), spaceName,
        parkerName: '', vehiclePlate: detail.vehicle?.licensePlate ?? '',
        amount: detail.totalAmount ?? null, durationHours: detail.duration ?? null,
        expiresAt: null, endsAtISO: null, otp: generatedOtp ?? detail.sessionOtp ?? null, etaText: null,
      }]);
    } else if (['COMPLETED', 'CANCELLED', 'EXPIRED'].includes(status)) {
      clearSource('parker');
    }
  }, [detail, activeBooking?.id, generatedOtp, setBarForSource, clearSource]);

  // Auto-generate OTP after parker acknowledges condition
  const handleGenerateOtp = useCallback(async () => {
    try {
      setGeneratingOtp(true);
      const data = await api.get(`/bookings/${activeBooking.id}/otp`);
      if (isMounted.current) setGeneratedOtp(data.otp);
    } catch {}
    finally { if (isMounted.current) setGeneratingOtp(false); }
  }, [activeBooking?.id]);

  useEffect(() => {
    if (!detail || detail.status !== 'APPROVED') return;
    if (!verification?.parkerAcknowledged) return;
    if (generatedOtp || generatingOtp) return;
    handleGenerateOtp();
  }, [detail, verification, generatedOtp, generatingOtp, handleGenerateOtp]);

  // ── Actions ────────────────────────────────────────────────────────────
  const callOwner = () => {
    const phone = detail?.space?.owner?.phone;
    if (!phone) { Alert.alert('Unavailable', 'Owner phone not available.'); return; }
    const n = /^\+/.test(phone) ? phone : `+91${phone}`;
    Linking.openURL(`tel:${n}`).catch(() => Alert.alert('Error', 'Could not open dialler.'));
  };

  const navigate = () => {
    const lat = detail?.space?.lat;
    const lng = detail?.space?.lng;
    if (!lat || !lng) { Alert.alert('Unavailable', 'Location not available.'); return; }
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`)
      .catch(() => Alert.alert('Error', 'Could not open maps.'));
  };

  const handleArrived = async () => {
    try {
      setActionLoading(true);
      await api.put(`/bookings/${activeBooking.id}/arrived`);
      fetchDetail();
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setActionLoading(false); }
  };

  const handleAcknowledge = async () => {
    try {
      setActionLoading(true);
      await api.put(`/bookings/${activeBooking.id}/verification/accept`);
      setVerification((v: any) => ({ ...v, parkerAcknowledged: true }));
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setActionLoading(false); }
  };

  const handleLeaving = async () => {
    Alert.alert('Leaving?', "Notify the owner you're heading out?", [
      { text: 'Cancel', style: 'cancel' },
      { text: "Yes, I'm Leaving", onPress: async () => {
        try {
          setActionLoading(true);
          await api.put(`/bookings/${activeBooking.id}/leaving`);
          fetchDetail();
        } catch (e: any) { Alert.alert('Error', e.message); }
        finally { setActionLoading(false); }
      }},
    ]);
  };

  const handleSelfComplete = async () => {
    Alert.alert(
      'Complete without owner?',
      "The owner hasn't confirmed your exit yet. You can complete the session yourself — the amount will be calculated based on your reported exit time.",
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Complete Session', style: 'destructive', onPress: async () => {
          try {
            setActionLoading(true);
            await api.put(`/bookings/${activeBooking.id}/self-complete`);
            fetchDetail();
          } catch (e: any) { Alert.alert('Error', e.message); }
          finally { setActionLoading(false); }
        }},
      ]
    );
  };

  // ── Empty / error / loading states ────────────────────────────────────
  if (loading || (activeBooking && detailLoading && !detail)) {
    return (
      <View style={tabStyles.emptyTabContent}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={tabStyles.emptyTabContent}>
        <Clock size={56} color={Colors.error} strokeWidth={1.5} />
        <Text style={tabStyles.emptyStateHeading}>Couldn't load your session</Text>
        <Text style={tabStyles.emptyStateSubtext}>{error}</Text>
        <TouchableOpacity style={tabStyles.exploreBtn} onPress={onRetry}>
          <Text style={tabStyles.exploreBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!activeBooking || !detail) {
    return (
      <View style={tabStyles.emptyTabContent}>
        <Clock size={56} color={Colors.borderMedium} strokeWidth={1.5} />
        <Text style={tabStyles.emptyStateHeading}>No Active Sessions</Text>
        <Text style={tabStyles.emptyStateSubtext}>
          You don't have any ongoing or pending bookings at the moment.
        </Text>
        <TouchableOpacity style={tabStyles.exploreBtn} onPress={() => setActiveTab('map')}>
          <Text style={tabStyles.exploreBtnText}>Find Parking Space</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Sub-states ─────────────────────────────────────────────────────────
  const isApproved = detail.status === 'APPROVED';
  const notYetArrived = isApproved && !detail.arrivedAt && !detail.sessionOtp;
  const waitingForCondition = isApproved && !notYetArrived && !verification;
  const requiresAcknowledgement = isApproved && verification && !verification.parkerAcknowledged;
  const requiresOtp = isApproved && verification && verification.parkerAcknowledged;
  const isActive = detail.status === 'ACTIVE';
  const isLeaving = isActive && !!detail.sessionEndedAt;
  const isPending = detail.status === 'PENDING_APPROVAL';

  return (
    <View style={s.flex}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchDetail(true)} tintColor={Colors.primary} />}
      >
        {/* ── PENDING ─────────────────────────────────────────────────── */}
        {isPending && (
          <View style={s.banner}>
            <Text style={s.bannerEmoji}>⏳</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.bannerTitle}>Waiting for approval</Text>
              <Text style={s.bannerSub}>The owner will accept or reject your request within 2 minutes.</Text>
            </View>
          </View>
        )}

        {/* ── NOT YET ARRIVED ─────────────────────────────────────────── */}
        {notYetArrived && (
          <View style={[s.banner, { backgroundColor: Colors.infoBg }]}>
            <Text style={s.bannerEmoji}>🚗</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.bannerTitle}>Head to the Space</Text>
              <Text style={s.bannerSub}>Tap "I Have Arrived" once you reach the location.</Text>
            </View>
          </View>
        )}

        {/* ── WAITING FOR OWNER CONDITION CHECK ───────────────────────── */}
        {waitingForCondition && (
          <View style={[s.banner, { backgroundColor: Colors.warningBgAlt }]}>
            <ActivityIndicator size="small" color={Colors.warning} style={{ marginRight: 4 }} />
            <View style={{ flex: 1 }}>
              <Text style={s.bannerTitle}>Owner is checking your vehicle</Text>
              <Text style={s.bannerSub}>You'll be notified once the inspection is done.</Text>
            </View>
          </View>
        )}

        {/* ── CONDITION ACKNOWLEDGEMENT ────────────────────────────────── */}
        {requiresAcknowledgement && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Vehicle Inspection</Text>
            {verification.type === 'PHOTO_VIDEO' ? (
              <>
                <View style={s.warningRow}>
                  <AlertTriangle size={20} color={Colors.warning} />
                  <Text style={s.warningText}>Existing Damage Recorded</Text>
                </View>
                <Text style={s.cardBody}>The owner photographed existing damage. Please review — they are not responsible for these marks.</Text>
                {verification.mediaUrls?.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                    {verification.mediaUrls.map((url: string, i: number) => (
                      <Image key={i} source={{ uri: url }} style={s.thumb} resizeMode="cover" />
                    ))}
                  </ScrollView>
                )}
              </>
            ) : (
              <>
                <View style={s.okBadge}>
                  <ShieldCheck size={14} color={Colors.success} />
                  <Text style={s.okBadgeText}>No Existing Damage</Text>
                </View>
                <Text style={s.cardBody}>The owner inspected your vehicle and found no existing damage.</Text>
              </>
            )}
            <View style={s.reviewRow}>
              <CheckSquare size={14} color={Colors.primary} />
              <Text style={s.reviewRowText}>I have reviewed the vehicle condition.</Text>
            </View>
          </View>
        )}

        {/* ── OTP ─────────────────────────────────────────────────────── */}
        {requiresOtp && (
          <View style={s.otpCard}>
            <Text style={s.otpTitle}>Arrival OTP</Text>
            <Text style={s.otpSub}>Show this code to the owner to start your session.</Text>
            {generatedOtp ? (
              <Text style={s.otpCode}>{generatedOtp}</Text>
            ) : (
              <ActivityIndicator color={Colors.primary} style={{ marginTop: 12 }} />
            )}
          </View>
        )}

        {/* ── ACTIVE SESSION ───────────────────────────────────────────── */}
        {isActive && (
          <>
            <View style={[s.statusBanner, isLeaving ? s.statusBannerLeaving : s.statusBannerActive]}>
              <View style={[s.dot, isLeaving && s.dotLeaving]} />
              <Text style={[s.statusText, isLeaving && s.statusTextLeaving]}>
                {isLeaving ? 'LEAVING — AWAITING EXIT' : 'SESSION ACTIVE'}
              </Text>
            </View>
            {isLeaving && (
              <View style={s.leavingBanner}>
                <Text style={s.leavingText}>
                  You've notified the owner you're leaving. They'll confirm your exit and finalize the amount.
                </Text>
              </View>
            )}
          </>
        )}

        {/* ── BOOKING DETAILS card (shown for all non-empty states) ────── */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Booking Details</Text>
          <View style={s.detailRow}>
            <Text style={s.detailLabel}>Space</Text>
            <Text style={s.detailValue}>{detail.space?.name || '—'}</Text>
          </View>
          {!!detail.space?.address && (
            <View style={s.detailRow}>
              <Text style={s.detailLabel}>Address</Text>
              <Text style={[s.detailValue, { flex: 2 }]} numberOfLines={2}>{detail.space.address}</Text>
            </View>
          )}
          <View style={s.detailRow}>
            <Text style={s.detailLabel}>Vehicle</Text>
            <Text style={s.detailValue}>{detail.vehicle?.licensePlate || '—'} ({detail.vehicle?.vehicleType || '—'})</Text>
          </View>
          {isActive && !!detail.sessionStartedAt && (
            <View style={s.detailRow}>
              <Text style={s.detailLabel}>Entry Time</Text>
              <Text style={s.detailValue}>{fmtTime(detail.sessionStartedAt)}</Text>
            </View>
          )}
          <View style={s.detailRow}>
            <Text style={s.detailLabel}>Duration</Text>
            <Text style={s.detailValue}>{detail.duration}h</Text>
          </View>
          <View style={[s.detailRow, { borderBottomWidth: 0 }]}>
            <Text style={s.detailLabel}>Amount</Text>
            <Text style={[s.detailValue, { color: Colors.primary, fontWeight: FontWeight.extrabold }]}>₹{detail.totalAmount}</Text>
          </View>
        </View>

        {/* ── CONTACT + NAVIGATE ──────────────────────────────────────── */}
        {(notYetArrived || isActive) && (
          <View style={s.actionRow}>
            <TouchableOpacity style={s.actionBtn} onPress={callOwner}>
              <Phone size={20} color={Colors.textPrimary} />
              <Text style={s.actionBtnText}>Call Owner</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.actionBtn, { borderLeftWidth: 1, borderLeftColor: Colors.surfaceBg }]} onPress={navigate}>
              <Navigation size={20} color={Colors.textPrimary} />
              <Text style={s.actionBtnText}>Navigate</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── INLINE STATUS HINTS ───────────────────────────────────────── */}
        {(requiresOtp || isPending) && (
          <View style={s.hintBox}>
            <Text style={s.hintText}>
              {requiresOtp
                ? (generatedOtp ? 'Waiting for owner to verify your OTP…' : 'Preparing your arrival code…')
                : 'Waiting for owner to accept your request…'}
            </Text>
          </View>
        )}

        {/* ── NEED HELP? ────────────────────────────────────────────────── */}
        {(isActive || isLeaving) && (
          <View>
            <Text style={s.helpLabel}>NEED HELP?</Text>
            <View style={s.helpCard}>
              <TouchableOpacity style={s.helpRow} onPress={() => router.push('/(home)/support/create-ticket')} activeOpacity={0.7}>
                <View style={s.helpRowLeft}>
                  <Headphones size={16} color={Colors.primary} strokeWidth={2} />
                  <View>
                    <Text style={s.helpRowText}>Contact Support</Text>
                    <Text style={s.helpRowSub}>OTP, payment or app issues</Text>
                  </View>
                </View>
                <Text style={s.helpArrow}>›</Text>
              </TouchableOpacity>
              <View style={s.helpDivider} />
              <TouchableOpacity style={s.helpRow} activeOpacity={0.7}
                onPress={() => Alert.alert('Report an Issue', 'Open the full session screen to report an issue.')}>
                <View style={s.helpRowLeft}>
                  <Flag size={16} color={Colors.error} strokeWidth={2} />
                  <View>
                    <Text style={s.helpRowText}>Report an Issue</Text>
                    <Text style={s.helpRowSub}>Cash demand, harassment, unsafe</Text>
                  </View>
                </View>
                <Text style={s.helpArrow}>›</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Owner hasn't confirmed exit — parker can self-complete after waiting */}
        {isLeaving && (
          <View style={s.leavingHintBox}>
            <Text style={s.hintText}>Waiting for owner to confirm your exit…</Text>
            <TouchableOpacity style={s.selfCompleteBtn} onPress={handleSelfComplete} disabled={actionLoading}>
              <Text style={s.selfCompleteBtnText}>Owner not responding? Complete session</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* ── STICKY FOOTER ───────────────────────────────────────────────── */}
      {/* Only render the footer when there's actually a button for the current
          state. Otherwise (e.g. the "waiting for owner to confirm exit" state,
          whose actions live in the scroll body) the absolute footer would show
          as an empty white strip above the bottom nav. */}
      {(notYetArrived || requiresAcknowledgement || (isActive && !isLeaving)) && (
        <View style={s.footer}>
          {notYetArrived && (
            <TouchableOpacity style={s.primaryBtn} onPress={handleArrived} disabled={actionLoading}>
              {actionLoading ? <ActivityIndicator color={Colors.white} /> : <Text style={s.primaryBtnText}>I Have Arrived</Text>}
            </TouchableOpacity>
          )}
          {requiresAcknowledgement && (
            <TouchableOpacity style={s.primaryBtn} onPress={handleAcknowledge} disabled={actionLoading}>
              {actionLoading ? <ActivityIndicator color={Colors.white} /> : <Text style={s.primaryBtnText}>Accept & Continue</Text>}
            </TouchableOpacity>
          )}
          {isActive && !isLeaving && (
            <TouchableOpacity style={s.primaryBtn} onPress={handleLeaving} disabled={actionLoading}>
              {actionLoading ? <ActivityIndicator color={Colors.white} /> : <Text style={s.primaryBtnText}>I Am Leaving</Text>}
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

// This tab renders ABOVE the find-space bottom nav bar, which is absolutely
// positioned at the bottom (height 76 on iOS / 58 on Android). The sticky footer
// must clear that bar, and the scroll content must clear the footer + bar.
const BOTTOM_NAV_H = Platform.OS === 'ios' ? 76 : 58;

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.screenBg },
  scroll: { flex: 1 },
  content: { padding: Spacing.screenH, gap: Spacing['2xl'], paddingBottom: BOTTOM_NAV_H + 120 },

  banner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.lg,
    backgroundColor: Colors.warningBgAlt, borderRadius: BorderRadius.lg, padding: Spacing['3xl'],
  },
  bannerEmoji: { fontSize: 26 },
  bannerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  bannerSub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2, lineHeight: 17 },

  statusBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.md, backgroundColor: Colors.successBg,
    borderRadius: BorderRadius.lg, padding: Spacing['2xl'],
  },
  statusBannerActive: { backgroundColor: Colors.successBg },
  statusBannerLeaving: { backgroundColor: Colors.warningBgAlt },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.success },
  dotLeaving: { backgroundColor: Colors.warning },
  statusText: { fontSize: FontSize.md, fontWeight: FontWeight.extrabold, color: Colors.success, letterSpacing: 0.5 },
  statusTextLeaving: { color: Colors.warning },

  leavingBanner: {
    backgroundColor: Colors.warningBgAlt, borderRadius: BorderRadius.md,
    padding: Spacing['2xl'], borderLeftWidth: 3, borderLeftColor: Colors.warning,
  },
  leavingText: { fontSize: FontSize.base, color: ExtendedColors.warningAmber, lineHeight: 19 },

  card: {
    backgroundColor: Colors.white, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.screenH,
  },
  cardTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: Spacing.lg },
  cardBody: { fontSize: FontSize.md, color: Colors.textBody, lineHeight: 20, marginBottom: Spacing['2xl'] },

  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBg,
  },
  detailLabel: { fontSize: FontSize.base, color: Colors.textSecondary, flex: 1 },
  detailValue: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.textPrimary, textAlign: 'right' },

  actionRow: {
    flexDirection: 'row', backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.md, padding: Spacing['3xl'],
  },
  actionBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary },

  // Condition acknowledgement
  warningRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.lg },
  warningText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.warning },
  okBadge: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, alignSelf: 'flex-start',
    backgroundColor: Colors.successBg, borderWidth: 1, borderColor: Colors.success,
    borderRadius: BorderRadius.circleXl, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm, marginBottom: Spacing.lg,
  },
  okBadgeText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.success },
  reviewRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.primaryBg, borderRadius: BorderRadius.md, padding: Spacing.xl, marginTop: Spacing.xs,
  },
  reviewRowText: { flex: 1, fontSize: FontSize.base, color: Colors.textBody, fontWeight: FontWeight.medium },
  thumb: { width: 90, height: 90, borderRadius: BorderRadius.sm, marginRight: Spacing.lg, backgroundColor: Colors.surfaceBg },

  // OTP
  otpCard: {
    backgroundColor: Colors.primaryBg, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: ExtendedColors.primaryBorder,
    padding: Spacing['4xl'], alignItems: 'center',
  },
  otpTitle: { fontSize: FontSize['3xl'], fontWeight: FontWeight.extrabold, color: Colors.textPrimary },
  otpSub: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.sm },
  otpCode: { fontSize: 44, fontWeight: FontWeight.extrabold, color: Colors.primary, letterSpacing: 12, marginTop: Spacing['2xl'] },

  footer: {
    // Sit ABOVE the find-space bottom nav: absolute-position the footer and lift
    // it by the nav height so the action button is never hidden behind the bar.
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: BOTTOM_NAV_H,
    padding: Spacing.screenH,
    backgroundColor: Colors.white,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  primaryBtn: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.button,
    paddingVertical: Spacing['3xl'], alignItems: 'center',
  },
  primaryBtnText: { color: Colors.white, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  hintBox: {
    paddingVertical: Spacing['2xl'], alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.screenBg, borderRadius: BorderRadius.button,
  },
  hintText: { fontSize: FontSize.md, color: Colors.textSecondary, fontWeight: FontWeight.medium, textAlign: 'center' },
  leavingHintBox: {
    backgroundColor: Colors.screenBg, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing['3xl'], gap: Spacing.xl,
    alignItems: 'center',
  },
  selfCompleteBtn: {
    borderWidth: 1.5, borderColor: Colors.error, borderRadius: BorderRadius.button,
    paddingVertical: Spacing.lg, paddingHorizontal: Spacing['3xl'],
  },
  selfCompleteBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.error },

  helpLabel: {
    fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textSecondary,
    letterSpacing: 1, marginTop: Spacing['3xl'], marginBottom: Spacing.md, marginLeft: Spacing.xs,
  },
  helpCard: {
    backgroundColor: Colors.white, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  helpRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: Spacing['2xl'], paddingHorizontal: Spacing['3xl'],
  },
  helpRowLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, flex: 1 },
  helpRowText: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  helpRowSub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  helpArrow: { fontSize: 20, color: Colors.textSecondary, marginLeft: Spacing.md },
  helpDivider: { height: 1, backgroundColor: Colors.border, marginHorizontal: Spacing['3xl'] },
});

export default ActiveSessionsTab;
