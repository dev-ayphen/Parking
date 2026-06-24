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
  Alert} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, Clock, Car, LogOut } from 'lucide-react-native';
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
    const events = ['session:started', 'session:completed', 'parker:leaving', 'booking:cancelled', 'notification:new', NETWORK_RECONNECTED];
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
        <PageHeader title="Live Sessions" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <PageHeader title="Live Sessions" />

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
          sessions.map((session) => (
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
          ))
        )}
      </ScrollView>
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
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing['3xl'] },
  detailItem: { width: '45%' },
  detailLabel: { fontSize: FontSize.sm, color: C.textSecondary, marginBottom: Spacing.xs },  // 12 = sm ✓
  detailValue: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: C.textPrimary },  // 14 = md ✓
  locationRow: { flexDirection: 'row', alignItems: 'center' },
  divider: { height: 1, backgroundColor: C.surfaceBg, marginVertical: Spacing.screenH },
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
