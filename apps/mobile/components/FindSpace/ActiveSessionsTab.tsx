import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
import { FontSize, FontWeight, BorderRadius, Spacing, ExtendedColors } from '../../theme';
import type { ColorsType } from '../../theme';
import { useTheme } from '../../hooks/useTheme';
import { makeFindSpaceStyles } from './findSpaceStyles';
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
  const { colors, isDark } = useTheme();
  const tabStyles = useMemo(() => makeFindSpaceStyles(colors), [colors]);
  const styles = useMemo(() => makeStyles(colors), [colors]);
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
      setBarForSource('parker', {
        variant: mins !== null && mins < 15 ? 'session_ending' : 'session_active',
        bookingId: String(activeBooking.id), spaceName,
        parkerName: '', vehiclePlate: detail.vehicle?.licensePlate ?? '',
        amount: detail.totalAmount ?? null, durationHours: detail.duration ?? null,
        expiresAt: null, endsAtISO, otp: generatedOtp ?? detail.sessionOtp ?? null, etaText: null,
      });
    } else if (status === 'APPROVED') {
      setBarForSource('parker', {
        variant: 'arrived_otp_ready', bookingId: String(activeBooking.id), spaceName,
        parkerName: '', vehiclePlate: detail.vehicle?.licensePlate ?? '',
        amount: detail.totalAmount ?? null, durationHours: detail.duration ?? null,
        expiresAt: null, endsAtISO: null, otp: generatedOtp ?? detail.sessionOtp ?? null, etaText: null,
      });
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
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={tabStyles.emptyTabContent}>
        <Clock size={56} color={colors.error} strokeWidth={1.5} />
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
        <Clock size={56} color={colors.borderMedium} strokeWidth={1.5} />
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
    <View style={styles.flex}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchDetail(true)} tintColor={colors.primary} />}
      >
        {/* ── PENDING ─────────────────────────────────────────────────── */}
        {isPending && (
          <View style={styles.banner}>
            <Text style={styles.bannerEmoji}>⏳</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>Waiting for approval</Text>
              <Text style={styles.bannerSub}>The owner will accept or reject your request within 2 minutes.</Text>
            </View>
          </View>
        )}

        {/* ── NOT YET ARRIVED ─────────────────────────────────────────── */}
        {notYetArrived && (
          <View style={[styles.banner, { backgroundColor: colors.infoBg }]}>
            <Text style={styles.bannerEmoji}>🚗</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>Head to the Space</Text>
              <Text style={styles.bannerSub}>Tap "I Have Arrived" once you reach the location.</Text>
            </View>
          </View>
        )}

        {/* ── WAITING FOR OWNER CONDITION CHECK ───────────────────────── */}
        {waitingForCondition && (
          <View style={[styles.banner, { backgroundColor: colors.warningBgAlt }]}>
            <ActivityIndicator size="small" color={colors.warning} style={{ marginRight: 4 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>Owner is checking your vehicle</Text>
              <Text style={styles.bannerSub}>You'll be notified once the inspection is done.</Text>
            </View>
          </View>
        )}

        {/* ── CONDITION ACKNOWLEDGEMENT ────────────────────────────────── */}
        {requiresAcknowledgement && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Vehicle Inspection</Text>
            {verification.type === 'PHOTO_VIDEO' ? (
              <>
                <View style={styles.warningRow}>
                  <AlertTriangle size={20} color={colors.warning} />
                  <Text style={styles.warningText}>Existing Damage Recorded</Text>
                </View>
                <Text style={styles.cardBody}>The owner photographed existing damage. Please review — they are not responsible for these marks.</Text>
                {verification.mediaUrls?.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                    {verification.mediaUrls.map((url: string, i: number) => (
                      <Image key={i} source={{ uri: url }} style={styles.thumb} resizeMode="cover" onError={() => {}} />
                    ))}
                  </ScrollView>
                )}
              </>
            ) : (
              <>
                <View style={styles.okBadge}>
                  <ShieldCheck size={14} color={colors.success} />
                  <Text style={styles.okBadgeText}>No Existing Damage</Text>
                </View>
                <Text style={styles.cardBody}>The owner inspected your vehicle and found no existing damage.</Text>
              </>
            )}
            <View style={styles.reviewRow}>
              <CheckSquare size={14} color={colors.primary} />
              <Text style={styles.reviewRowText}>I have reviewed the vehicle condition.</Text>
            </View>
          </View>
        )}

        {/* ── OTP ─────────────────────────────────────────────────────── */}
        {requiresOtp && (
          <View style={styles.otpCard}>
            <Text style={styles.otpTitle}>Arrival OTP</Text>
            <Text style={styles.otpSub}>Show this code to the owner to start your session.</Text>
            {generatedOtp ? (
              <Text style={styles.otpCode}>{generatedOtp}</Text>
            ) : (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 12 }} />
            )}
          </View>
        )}

        {/* ── ACTIVE SESSION ───────────────────────────────────────────── */}
        {isActive && (
          <>
            <View style={[styles.statusBanner, isLeaving ? styles.statusBannerLeaving : styles.statusBannerActive]}>
              <View style={[styles.dot, isLeaving && styles.dotLeaving]} />
              <Text style={[styles.statusText, isLeaving && styles.statusTextLeaving]}>
                {isLeaving ? 'LEAVING — AWAITING EXIT' : 'SESSION ACTIVE'}
              </Text>
            </View>
            {isLeaving && (
              <View style={styles.leavingBanner}>
                <Text style={styles.leavingText}>
                  You've notified the owner you're leaving. They'll confirm your exit and finalize the amount.
                </Text>
              </View>
            )}
          </>
        )}

        {/* ── BOOKING DETAILS card (shown for all non-empty states) ────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Booking Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Space</Text>
            <Text style={styles.detailValue}>{detail.space?.name || '—'}</Text>
          </View>
          {!!detail.space?.address && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Address</Text>
              <Text style={[styles.detailValue, { flex: 2 }]} numberOfLines={2}>{detail.space.address}</Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Vehicle</Text>
            <Text style={styles.detailValue}>{detail.vehicle?.licensePlate || '—'} ({detail.vehicle?.vehicleType || '—'})</Text>
          </View>
          {isActive && !!detail.sessionStartedAt && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Entry Time</Text>
              <Text style={styles.detailValue}>{fmtTime(detail.sessionStartedAt)}</Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Duration</Text>
            <Text style={styles.detailValue}>{detail.duration}h</Text>
          </View>
          <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.detailLabel}>Amount</Text>
            <Text style={[styles.detailValue, { color: colors.primary, fontWeight: FontWeight.extrabold }]}>₹{detail.totalAmount}</Text>
          </View>
        </View>

        {/* ── CONTACT + NAVIGATE ──────────────────────────────────────── */}
        {(notYetArrived || isActive) && (
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={callOwner}>
              <Phone size={20} color={colors.textPrimary} />
              <Text style={styles.actionBtnText}>Call Owner</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { borderLeftWidth: 1, borderLeftColor: colors.surfaceBg }]} onPress={navigate}>
              <Navigation size={20} color={colors.textPrimary} />
              <Text style={styles.actionBtnText}>Navigate</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── INLINE STATUS HINTS ───────────────────────────────────────── */}
        {(requiresOtp || isPending) && (
          <View style={styles.hintBox}>
            <Text style={styles.hintText}>
              {requiresOtp
                ? (generatedOtp ? 'Waiting for owner to verify your OTP…' : 'Preparing your arrival code…')
                : 'Waiting for owner to accept your request…'}
            </Text>
          </View>
        )}

        {/* ── NEED HELP? ────────────────────────────────────────────────── */}
        {(isActive || isLeaving) && (
          <View>
            <Text style={styles.helpLabel}>NEED HELP?</Text>
            <View style={styles.helpCard}>
              <TouchableOpacity style={styles.helpRow} onPress={() => router.push('/(home)/support/create-ticket')} activeOpacity={0.7}>
                <View style={styles.helpRowLeft}>
                  <Headphones size={16} color={colors.primary} strokeWidth={2} />
                  <View>
                    <Text style={styles.helpRowText}>Contact Support</Text>
                    <Text style={styles.helpRowSub}>OTP, payment or app issues</Text>
                  </View>
                </View>
                <Text style={styles.helpArrow}>›</Text>
              </TouchableOpacity>
              <View style={styles.helpDivider} />
              <TouchableOpacity style={styles.helpRow} activeOpacity={0.7}
                onPress={() => Alert.alert('Report an Issue', 'Open the full session screen to report an issue.')}>
                <View style={styles.helpRowLeft}>
                  <Flag size={16} color={colors.error} strokeWidth={2} />
                  <View>
                    <Text style={styles.helpRowText}>Report an Issue</Text>
                    <Text style={styles.helpRowSub}>Cash demand, harassment, unsafe</Text>
                  </View>
                </View>
                <Text style={styles.helpArrow}>›</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Owner hasn't confirmed exit — parker can self-complete after waiting */}
        {isLeaving && (
          <View style={styles.leavingHintBox}>
            <Text style={styles.hintText}>Waiting for owner to confirm your exit…</Text>
            <TouchableOpacity style={styles.selfCompleteBtn} onPress={handleSelfComplete} disabled={actionLoading}>
              <Text style={styles.selfCompleteBtnText}>Owner not responding? Complete session</Text>
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
        <View style={styles.footer}>
          {notYetArrived && (
            <TouchableOpacity style={styles.primaryBtn} onPress={handleArrived} disabled={actionLoading}>
              {actionLoading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryBtnText}>I Have Arrived</Text>}
            </TouchableOpacity>
          )}
          {requiresAcknowledgement && (
            <TouchableOpacity style={styles.primaryBtn} onPress={handleAcknowledge} disabled={actionLoading}>
              {actionLoading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryBtnText}>Accept & Continue</Text>}
            </TouchableOpacity>
          )}
          {isActive && !isLeaving && (
            <TouchableOpacity style={styles.primaryBtn} onPress={handleLeaving} disabled={actionLoading}>
              {actionLoading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryBtnText}>I Am Leaving</Text>}
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

const makeStyles = (colors: ColorsType) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.screenBg },
  scroll: { flex: 1 },
  content: { padding: Spacing.screenH, gap: Spacing['2xl'], paddingBottom: BOTTOM_NAV_H + 120 },

  banner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.lg,
    backgroundColor: colors.warningBgAlt, borderRadius: BorderRadius.lg, padding: Spacing['3xl'],
  },
  bannerEmoji: { fontSize: 26 },
  bannerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: colors.textPrimary },
  bannerSub: { fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 2, lineHeight: 17 },

  statusBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.md, backgroundColor: colors.successBg,
    borderRadius: BorderRadius.lg, padding: Spacing['2xl'],
  },
  statusBannerActive: { backgroundColor: colors.successBg },
  statusBannerLeaving: { backgroundColor: colors.warningBgAlt },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success },
  dotLeaving: { backgroundColor: colors.warning },
  statusText: { fontSize: FontSize.md, fontWeight: FontWeight.extrabold, color: colors.success, letterSpacing: 0.5 },
  statusTextLeaving: { color: colors.warning },

  leavingBanner: {
    backgroundColor: colors.warningBgAlt, borderRadius: BorderRadius.md,
    padding: Spacing['2xl'], borderLeftWidth: 3, borderLeftColor: colors.warning,
  },
  leavingText: { fontSize: FontSize.base, color: ExtendedColors.warningAmber, lineHeight: 19 },

  card: {
    backgroundColor: colors.white, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: colors.border, padding: Spacing.screenH,
  },
  cardTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: colors.textPrimary, marginBottom: Spacing.lg },
  cardBody: { fontSize: FontSize.md, color: colors.textBody, lineHeight: 20, marginBottom: Spacing['2xl'] },

  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: Spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.surfaceBg,
  },
  detailLabel: { fontSize: FontSize.base, color: colors.textSecondary, flex: 1 },
  detailValue: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: colors.textPrimary, textAlign: 'right' },

  actionRow: {
    flexDirection: 'row', backgroundColor: colors.white,
    borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.md, padding: Spacing['3xl'],
  },
  actionBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: colors.textPrimary },

  // Condition acknowledgement
  warningRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.lg },
  warningText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: colors.warning },
  okBadge: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, alignSelf: 'flex-start',
    backgroundColor: colors.successBg, borderWidth: 1, borderColor: colors.success,
    borderRadius: BorderRadius.circleXl, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm, marginBottom: Spacing.lg,
  },
  okBadgeText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: colors.success },
  reviewRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: colors.primaryBg, borderRadius: BorderRadius.md, padding: Spacing.xl, marginTop: Spacing.xs,
  },
  reviewRowText: { flex: 1, fontSize: FontSize.base, color: colors.textBody, fontWeight: FontWeight.medium },
  thumb: { width: 90, height: 90, borderRadius: BorderRadius.sm, marginRight: Spacing.lg, backgroundColor: colors.surfaceBg },

  // OTP
  otpCard: {
    backgroundColor: colors.primaryBg, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: ExtendedColors.primaryBorder,
    padding: Spacing['4xl'], alignItems: 'center',
  },
  otpTitle: { fontSize: FontSize['3xl'], fontWeight: FontWeight.extrabold, color: colors.textPrimary },
  otpSub: { fontSize: FontSize.md, color: colors.textSecondary, textAlign: 'center', marginTop: Spacing.sm },
  otpCode: { fontSize: 44, fontWeight: FontWeight.extrabold, color: colors.primary, letterSpacing: 12, marginTop: Spacing['2xl'] },

  footer: {
    // Sit ABOVE the find-space bottom nav: absolute-position the footer and lift
    // it by the nav height so the action button is never hidden behind the bar.
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: BOTTOM_NAV_H,
    padding: Spacing.screenH,
    backgroundColor: colors.white,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  primaryBtn: {
    backgroundColor: colors.primary, borderRadius: BorderRadius.button,
    paddingVertical: Spacing['3xl'], alignItems: 'center',
  },
  primaryBtnText: { color: colors.white, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  hintBox: {
    paddingVertical: Spacing['2xl'], alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.screenBg, borderRadius: BorderRadius.button,
  },
  hintText: { fontSize: FontSize.md, color: colors.textSecondary, fontWeight: FontWeight.medium, textAlign: 'center' },
  leavingHintBox: {
    backgroundColor: colors.screenBg, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: colors.border, padding: Spacing['3xl'], gap: Spacing.xl,
    alignItems: 'center',
  },
  selfCompleteBtn: {
    borderWidth: 1.5, borderColor: colors.error, borderRadius: BorderRadius.button,
    paddingVertical: Spacing.lg, paddingHorizontal: Spacing['3xl'],
  },
  selfCompleteBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: colors.error },

  helpLabel: {
    fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: colors.textSecondary,
    letterSpacing: 1, marginTop: Spacing['3xl'], marginBottom: Spacing.md, marginLeft: Spacing.xs,
  },
  helpCard: {
    backgroundColor: colors.white, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  helpRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: Spacing['2xl'], paddingHorizontal: Spacing['3xl'],
  },
  helpRowLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, flex: 1 },
  helpRowText: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: colors.textPrimary },
  helpRowSub: { fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 2 },
  helpArrow: { fontSize: 20, color: colors.textSecondary, marginLeft: Spacing.md },
  helpDivider: { height: 1, backgroundColor: colors.border, marginHorizontal: Spacing['3xl'] },
});

export default ActiveSessionsTab;
