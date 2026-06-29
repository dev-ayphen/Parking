import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Modal,
  StatusBar,
  ActivityIndicator,
  DeviceEventEmitter,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, Clock, Car, LogOut, Info, QrCode, X } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import { useFocusEffect, useRouter } from 'expo-router';
import { PageHeader } from '../../components';
import { api } from '../../services/api';
import { NETWORK_RECONNECTED } from '../../store/networkStore';
import { FontSize, FontWeight, BorderRadius, Spacing, ExtendedColors } from '../../theme';
import { useTheme, type AppTheme } from '../../hooks/useTheme';
import { useSessionBarStore, minsUntil } from '../../store/sessionBarStore';

interface LiveSession {
  id: string;
  parker: string;
  vehicle: string;
  space: string;
  startTime: string;
  endTime: string;
  startTimeISO?: string;
  endTimeISO?: string;
  remaining: string;
  progressPercent: number;
  isLeaving?: boolean;
  leftAt?: string | null;
  currentCharge?: number;
  minimumCharge?: number;
  elapsedLabel?: string;
  paymentStatus?: 'WAITING' | 'PAID';
  ownerUpiId?: string | null;
  ownerName?: string;
}

export default function ActiveSessionsScreen() {
  const theme = useTheme();
  const { colors: C, isDark } = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const router = useRouter();
  const setBarForSource = useSessionBarStore((s) => s.setBarForSource);
  const clearSource = useSessionBarStore((s) => s.clearSource);
  const setBar = useCallback((b: any) => setBarForSource('owner', b), [setBarForSource]);
  const clearBar = useCallback(() => clearSource('owner'), [clearSource]);
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Add-UPI modal — lets the owner add their UPI ID inline (the same one used in
  // their profile / Manage Billing). Saving hits PUT /users/me/billing, which only
  // updates upiId when sent alone, so the profile stays in sync automatically.
  const [upiModalVisible, setUpiModalVisible] = useState(false);
  const [upiInput, setUpiInput] = useState('');
  const [upiError, setUpiError] = useState('');
  const [upiSaving, setUpiSaving] = useState(false);

  const handleSaveUpi = async () => {
    const trimmed = upiInput.trim().toLowerCase();
    if (!trimmed) { setUpiError('Please enter your UPI ID'); return; }
    if (!/^[a-z0-9.\-_]{2,256}@[a-z]{2,64}$/.test(trimmed)) {
      setUpiError('Invalid UPI ID format (e.g. name@okhdfcbank)');
      return;
    }
    setUpiSaving(true);
    try {
      await api.put('/users/me/billing', { upiId: trimmed });
      setUpiModalVisible(false);
      setUpiInput('');
      setUpiError('');
      // Refresh so the live-sessions response now includes the new UPI → QR shows.
      await fetchSessions('silent');
    } catch (err: any) {
      setUpiError(err?.message || 'Could not save UPI ID');
    } finally {
      setUpiSaving(false);
    }
  };

  // `mode`:
  //   'initial' → full-screen spinner (first load only)
  //   'refresh' → pull-to-refresh spinner
  //   'silent'  → 8s poll / socket refresh — NO loader toggles. The poll used to
  //               set loading=true every 8s, which re-showed the full-screen
  //               spinner each tick (looked like it loaded forever, esp. on slow
  //               Wi-Fi). Silent refreshes update data without flashing the loader.
  const fetchSessions = useCallback(async (mode: 'initial' | 'refresh' | 'silent' = 'initial') => {
    try {
      if (mode === 'initial') setLoading(true);
      else if (mode === 'refresh') setRefreshing(true);
      const json = await api.get('/bookings/live-sessions');
      if (json.success) {
        setSessions(json.sessions || []);
      }
    } catch (e) {
      if (__DEV__) console.log('[ACTIVE] error', e);
    } finally {
      if (mode === 'initial') setLoading(false);
      else if (mode === 'refresh') setRefreshing(false);
    }
  }, []);

  // Fetch on focus + poll every 8s while focused. The poll is a self-healing
  // fallback for missed socket events (flaky network / socket reconnecting) —
  // mirrors the parker's active-session screen so the owner isn't left stale.
  useFocusEffect(useCallback(() => {
    fetchSessions('initial');
    const poll = setInterval(() => fetchSessions('silent'), 8000);
    // Live Sessions already shows the session in full — hide the floating bar
    // (which would just point here / duplicate it) while this screen is focused.
    DeviceEventEmitter.emit('sessionbar:suppress', true);
    return () => {
      clearInterval(poll);
      DeviceEventEmitter.emit('sessionbar:suppress', false);
    };
  }, [fetchSessions]));

  // Live refresh on session lifecycle events
  useEffect(() => {
    const events = ['session:started', 'session:completed', 'parker:leaving', 'booking:cancelled', 'booking:payment-received', 'notification:new', NETWORK_RECONNECTED];
    const subs = events.map((evt) => DeviceEventEmitter.addListener(evt, () => fetchSessions('silent')));
    return () => subs.forEach((s) => s.remove());
  }, [fetchSessions]);

  // ── Feed session bar from active sessions list ───────────────────────
  // Priority of what to surface: a parker who tapped "I'm leaving" (owner must
  // confirm exit) > a session ending soon > a normal running session.
  useEffect(() => {
    if (sessions.length === 0) {
      clearBar();
      return;
    }

    // 1) Parker reported leaving — owner must verify & complete now.
    const leaving = sessions.find((s) => s.isLeaving);
    // 2) Session ending soon (< 15 min left), computed from ISO end time.
    const endingSoon = sessions.find(
      (s) => { const m = minsUntil(s.endTimeISO); return m !== null && m < 15; },
    );
    const target = leaving ?? endingSoon ?? sessions[0];
    const variant = leaving
      ? 'owner_session_leaving'
      : endingSoon
      ? 'owner_session_ending'
      : 'owner_session_active';

    setBar({
      variant,
      bookingId: String(target.id),
      spaceName: target.space,
      parkerName: target.parker ?? '',
      vehiclePlate: target.vehicle ?? '',
      amount: null,
      durationHours: null,
      expiresAt: null,
      endsAtISO: target.endTimeISO ?? null,
      otp: null,
      etaText: sessions.length > 1 ? `${sessions.length} sessions` : (target.remaining ?? null),
    });
  }, [sessions, setBar, clearBar]);


  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <PageHeader title="Live Sessions"  onBack={() => router.replace('/(my-spaces)')} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <PageHeader title="Live Sessions"  onBack={() => router.replace('/(my-spaces)')} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchSessions('refresh')} tintColor={C.primary} colors={[C.primary]} />}
      >
        {sessions.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Clock size={40} color={C.borderMuted} strokeWidth={1.5} />
            </View>
            <Text style={styles.emptyTitle}>No Active Sessions</Text>
            <Text style={styles.emptyDesc}>When a parker starts a session, it will appear here in real time.</Text>
          </View>
        ) : (
          <>
            {/* ── Shared payment QR ──────────────────────────────────────────
                The owner's UPI QR is the SAME for every session (one UPI ID, no
                amount encoded), so we show it ONCE at the top instead of repeating
                it inside each session card. Each card below shows its own amount;
                the parker enters that amount in their UPI app. */}
            {(() => {
              const upi = sessions[0]?.ownerUpiId || null;
              const name = sessions[0]?.ownerName || 'ParkSwift Owner';
              return (
                <View style={styles.qrCard}>
                  <Text style={styles.qrCardTitle}>Your Payment QR</Text>
                  {upi ? (
                    <>
                      <Text style={styles.qrCardSub}>Show this to the parker to collect payment — they scan and pay you directly.</Text>
                      <View style={styles.qrWrap}>
                        <QRCode
                          value={`upi://pay?pa=${upi}&pn=${name.replace(/[^a-zA-Z0-9\s\-._]/g, '').substring(0, 60)}&cu=INR&tn=Parking fee`}
                          size={170}
                          backgroundColor="#fff"
                        />
                      </View>
                      <View style={styles.upiPill}>
                        <Text style={styles.upiPillText}>{upi}</Text>
                      </View>
                    </>
                  ) : (
                    <>
                      <View style={styles.noUpiRow}>
                        <Info size={14} color={C.textMuted} style={{ marginRight: 6, marginTop: 1 }} />
                        <Text style={styles.noUpiText}>
                          Add your UPI ID to show a scan-to-pay QR here. For now, collect cash.
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.addUpiBtn}
                        onPress={() => { setUpiInput(''); setUpiError(''); setUpiModalVisible(true); }}
                        activeOpacity={0.85}
                      >
                        <QrCode size={16} color={C.primary} strokeWidth={2.2} style={{ marginRight: 6 }} />
                        <Text style={styles.addUpiBtnText}>Add UPI ID</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  <View style={styles.disclaimerRow}>
                    <Info size={12} color={C.textMuted} style={{ marginRight: 6, marginTop: 1 }} />
                    <Text style={styles.disclaimerText}>
                      Payment goes directly to you — ParkSwift does not process, hold, or verify money.
                    </Text>
                  </View>
                </View>
              );
            })()}

            {sessions.length > 1 && (
              <Text style={styles.sessionCount}>{sessions.length} active sessions</Text>
            )}

            {sessions.map((session) => (
            <View key={session.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.headerDot} />
                <Text style={styles.headerText}>ACTIVE PARKING SESSION</Text>
              </View>

              <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Parker</Text>
                  <Text style={styles.detailValue}>{session.parker}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Vehicle</Text>
                  <View style={styles.locationRow}>
                    <Car size={14} color={C.textSecondary} style={{ marginRight: 4 }} />
                    <Text style={styles.detailValue}>{session.vehicle}</Text>
                  </View>
                </View>
                <View style={[styles.detailItem, { width: '100%' }]}>
                  <Text style={styles.detailLabel}>Space</Text>
                  <View style={styles.locationRow}>
                    <MapPin size={14} color={C.textSecondary} style={{ marginRight: 4 }} />
                    <Text style={styles.detailValue}>{session.space}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Session start + status (no running duration) */}
              <View style={styles.statusRow}>
                <View>
                  <Text style={styles.timeLabel}>Session Started At</Text>
                  <Text style={styles.timeValue}>{session.startTime}</Text>
                </View>
                {session.isLeaving ? (
                  <View style={styles.leavingPill}>
                    <LogOut size={14} color={C.warning} style={{ marginRight: 4 }} />
                    <Text style={styles.leavingText}>Vehicle Leaving</Text>
                  </View>
                ) : (
                  <View style={styles.parkedPill}>
                    <Car size={14} color={C.success} style={{ marginRight: 4 }} />
                    <Text style={styles.parkedText}>Vehicle Parked</Text>
                  </View>
                )}
              </View>

              {session.isLeaving && (
                <View style={styles.leavingInfo}>
                  <Text style={styles.leavingInfoLabel}>Parker reported departure at</Text>
                  <Text style={styles.leavingInfoTime}>{session.leftAt || '—'}</Text>
                </View>
              )}

              <View style={styles.divider} />

              <TouchableOpacity style={styles.releaseBtn} onPress={() => router.push({ pathname: '/(my-spaces)/exit-verification', params: { bookingId: session.id } })}>
                <LogOut size={18} color={C.white} style={{ marginRight: 8 }} />
                <Text style={styles.releaseBtnText}>{session.isLeaving ? 'Confirm Exit' : 'Complete Session'}</Text>
              </TouchableOpacity>
            </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* Add UPI ID modal — saves to the owner's profile (PUT /users/me/billing).
          The same UPI ID set here shows in Profile / Manage Billing too. */}
      <Modal visible={upiModalVisible} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setUpiModalVisible(false)}>
        <Pressable style={styles.upiModalOverlay} onPress={() => setUpiModalVisible(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <Pressable style={styles.upiModalCard} onPress={() => {}}>
              <View style={styles.upiModalHeader}>
                <Text style={styles.upiModalTitle}>Add your UPI ID</Text>
                <TouchableOpacity onPress={() => setUpiModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <X size={20} color={C.textSecondary} strokeWidth={2} />
                </TouchableOpacity>
              </View>
              <Text style={styles.upiModalHint}>
                Parkers scan a QR built from this to pay you directly. Saved to your profile too — ParkSwift never holds the money.
              </Text>
              <TextInput
                style={[styles.upiModalInput, !!upiError && styles.upiModalInputError]}
                placeholder="name@okhdfcbank"
                placeholderTextColor={C.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                value={upiInput}
                onChangeText={(v) => { setUpiInput(v); setUpiError(''); }}
              />
              {!!upiError && <Text style={styles.upiModalErrorText}>{upiError}</Text>}
              <TouchableOpacity
                style={[styles.upiModalBtn, (!upiInput.trim() || upiSaving) && styles.upiModalBtnDisabled]}
                onPress={handleSaveUpi}
                disabled={!upiInput.trim() || upiSaving}
                activeOpacity={0.85}
              >
                {upiSaving ? <ActivityIndicator color={C.white} size="small" /> : <Text style={styles.upiModalBtnText}>Save UPI ID</Text>}
              </TouchableOpacity>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = ({ colors: C }: AppTheme) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.white },
  // Grey content area so the white session cards stand out (white-on-white made
  // them blend in). SafeAreaView/header stays white to match other screens.
  container: { flex: 1, backgroundColor: C.screenBg, paddingHorizontal: Spacing['3xl'], paddingTop: Spacing.md },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.screenBg },
  card: {
    backgroundColor: C.white,
    borderRadius: BorderRadius.lg,                  // 16 = lg ✓
    padding: Spacing.screenH,
    marginBottom: Spacing['3xl'],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    borderTopWidth: 4,
    borderTopColor: C.successAlt,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.screenH },
  headerDot: { width: 8, height: 8, borderRadius: BorderRadius.xs, backgroundColor: C.successAlt, marginRight: Spacing.md },  // 4 = xs ✓
  headerText: { fontSize: FontSize.sm, fontWeight: FontWeight.extrabold, color: C.successAlt, letterSpacing: 1 },  // 12 = sm ✓
  paidBadge: { marginLeft: 'auto', backgroundColor: C.successBg, borderRadius: BorderRadius.badge, paddingHorizontal: Spacing.md, paddingVertical: 3 },
  paidBadgeText: { fontSize: FontSize.micro, fontWeight: FontWeight.extrabold, color: C.success, letterSpacing: 0.3 },
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing['3xl'] },
  detailItem: { width: '45%' },
  detailLabel: { fontSize: FontSize.sm, color: C.textSecondary, marginBottom: Spacing.xs },  // 12 = sm ✓
  detailValue: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: C.textPrimary },  // 14 = md ✓
  locationRow: { flexDirection: 'row', alignItems: 'center' },
  divider: { height: 1, backgroundColor: C.surfaceBg, marginVertical: Spacing.screenH },
  // Collect-payment block — owner's pay-QR (or cash note) + disclaimer.
  // Shared QR header (one per owner, above all session cards).
  qrCard: {
    backgroundColor: C.white, borderRadius: BorderRadius.lg, padding: Spacing.screenH,
    marginBottom: Spacing['3xl'], alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    borderWidth: 1, borderColor: C.borderLight,
  },
  qrCardTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.extrabold, color: C.textPrimary, marginBottom: Spacing.xs },
  qrCardSub: { fontSize: FontSize.sm, color: C.textSecondary, textAlign: 'center', marginBottom: Spacing.screenH, lineHeight: 18 },
  sessionCount: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: C.textSecondary, marginBottom: Spacing.md, marginLeft: Spacing.xs },

  qrWrap: { padding: Spacing.xl, backgroundColor: C.white, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: C.borderLight, marginBottom: Spacing.md },
  upiPill: { backgroundColor: C.screenBg, borderRadius: BorderRadius.circleXl, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm },
  upiPillText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: C.textBody },
  noUpiRow: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: Spacing.md },
  noUpiText: { flex: 1, fontSize: FontSize.sm, color: C.textSecondary, lineHeight: 18 },
  addUpiBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: Spacing.md, paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: C.primary, backgroundColor: C.white,
  },
  addUpiBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: C.primary },
  // Add-UPI modal (prefixed `upiModal*` to avoid clashing with the existing modal styles)
  upiModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', paddingHorizontal: Spacing['3xl'] },
  upiModalCard: { backgroundColor: C.white, borderRadius: BorderRadius.xl, padding: Spacing['3xl'] },
  upiModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  upiModalTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: C.textPrimary, flex: 1 },
  upiModalHint: { fontSize: FontSize.sm, color: C.textSecondary, marginBottom: Spacing.lg, lineHeight: 18 },
  upiModalInput: {
    borderWidth: 1, borderColor: C.borderLight, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, fontSize: FontSize.md,
    color: C.textPrimary, backgroundColor: C.screenBg,
  },
  upiModalInputError: { borderColor: C.error },
  upiModalErrorText: { fontSize: FontSize.xs, color: C.error, marginTop: Spacing.xs },
  upiModalBtn: { backgroundColor: C.primary, paddingVertical: Spacing.lg, borderRadius: BorderRadius.md, alignItems: 'center', marginTop: Spacing.lg },
  upiModalBtnDisabled: { opacity: 0.5 },
  upiModalBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: C.white },
  disclaimerRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: Spacing.md, paddingHorizontal: Spacing.md },
  disclaimerText: { flex: 1, fontSize: FontSize.xs, color: C.textMuted, lineHeight: 15, textAlign: 'center' },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timeLabel: { fontSize: FontSize.xs, color: C.textMuted, marginBottom: Spacing.micro },  // 11 = xs ✓
  timeValue: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: C.textPrimary },  // 16 = xl ✓
  parkedPill: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.successBg,
    paddingHorizontal: Spacing.xl, paddingVertical: 7, borderRadius: BorderRadius.input,  // 10 = input ✓
  },
  parkedText: { color: C.success, fontWeight: FontWeight.bold, fontSize: FontSize.base },  // 13 = base ✓
  leavingPill: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.warningBgAlt,
    paddingHorizontal: Spacing.xl, paddingVertical: 7, borderRadius: BorderRadius.input,  // 10 = input ✓
  },
  leavingText: { color: C.warning, fontWeight: FontWeight.bold, fontSize: FontSize.base },  // 13 = base ✓
  leavingInfo: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.warningBgAlt, borderRadius: BorderRadius.input, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg, marginTop: Spacing.xl,  // 10 = input ✓
  },
  leavingInfoLabel: { fontSize: FontSize.sm, color: ExtendedColors.warningAmber, fontWeight: FontWeight.medium },  // 12 = sm ✓
  leavingInfoTime: { fontSize: FontSize.lg, color: ExtendedColors.warningAmber, fontWeight: FontWeight.extrabold },  // 15 = lg ✓
  releaseBtn: {
    flexDirection: 'row', backgroundColor: C.primary, paddingVertical: Spacing['3xl'],
    borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center',  // 12 = md ✓
  },
  releaseBtnText: { color: C.white, fontSize: FontSize.lg, fontWeight: FontWeight.bold },  // 15 = lg ✓
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 100, paddingHorizontal: Spacing['6xl'] },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: C.surfaceBg,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.screenH,
  },
  emptyTitle: { fontSize: FontSize['2xl'], fontWeight: FontWeight.bold, color: C.textPrimary, marginBottom: Spacing.md },  // 18 = 2xl ✓
  emptyDesc: { fontSize: FontSize.md, color: C.textSecondary, textAlign: 'center', lineHeight: 20 },  // 14 = md ✓
  modalOverlay: { flex: 1, backgroundColor: C.overlay, justifyContent: 'flex-end' },   // 'rgba(0,0,0,0.5)' ✓
  modalContent: {
    backgroundColor: C.white, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl,  // 24 = xl ✓
    padding: Spacing['4xl'], paddingBottom: Spacing['7xl'],
  },
  modalTitle: { fontSize: FontSize['2xl'], fontWeight: FontWeight.extrabold, color: C.textPrimary, marginBottom: Spacing.md },  // 18 = 2xl ✓
  modalSubtitle: { fontSize: FontSize.md, color: C.textSecondary, marginBottom: Spacing.screenH, lineHeight: 20 },  // 14 = md ✓
  modalInfoBox: { backgroundColor: C.screenBg, borderRadius: BorderRadius.md, padding: Spacing['3xl'], marginBottom: Spacing['4xl'], gap: Spacing.lg },  // 12 = md ✓
  modalInfoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  modalInfoLabel: { fontSize: FontSize.base, color: C.textSecondary },  // 13 = base ✓
  modalInfoValue: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: C.textPrimary },  // 13 = base ✓
  modalFooter: { flexDirection: 'row', gap: Spacing.xl },
  cancelBtn: { flex: 1, paddingVertical: Spacing['2xl'], borderRadius: BorderRadius.input, backgroundColor: C.surfaceBg, alignItems: 'center' },  // 10 = input ✓
  cancelBtnText: { fontWeight: FontWeight.bold, color: C.textBody },
  confirmBtn: { flex: 2, paddingVertical: Spacing['2xl'], borderRadius: BorderRadius.input, backgroundColor: C.primary, alignItems: 'center' },  // 10 = input ✓
  confirmBtnText: { fontWeight: FontWeight.bold, color: C.white },
});
