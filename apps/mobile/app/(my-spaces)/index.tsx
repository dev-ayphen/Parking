import React, { useState, useCallback, useEffect } from 'react';
import {View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  DeviceEventEmitter,
  Modal,
  Pressable} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { CheckCircle, AlertCircle, ArrowRight, Activity, TrendingUp, MapPin, Clock, Star, Zap, User, XCircle } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { PageHeader } from '../../components';
import NoActivitySvg from '../../components/Illustrations/NoActivitySvg';
import { api } from '../../services/api';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, ExtendedColors } from '../../theme';
import { useSessionBarStore, computeExpiresAt, minsUntil } from '../../store/sessionBarStore';

interface DashboardData {
  isSubscribed: boolean;
  subscriptionPlan: string;
  revenue: number;
  revenueTrend: string;
  activeSpacesCount: number;
  todayBookingsCount: number;
  pendingRequests: { id: string; parkerName: string; spaceName: string; licensePlate: string; amount: number; durationHours: number; duration: string; eta: string; createdAt: string }[];
  liveSessions: { id: string; parkerName: string; spaceName: string; licensePlate: string; timeLeft: string; endTimeISO: string | null; isLeaving: boolean }[];
  recentRequests: { id: string; parkerName: string; spaceName: string; status: string; amount: number; createdAt: string }[];
}

// Status badge styling for retained recent requests
const REQUEST_STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  APPROVED: { label: 'Approved', color: Colors.success, bg: Colors.successBg },
  COMPLETED: { label: 'Completed', color: Colors.textBody, bg: Colors.surfaceBg },
  REJECTED: { label: 'Rejected', color: Colors.error, bg: Colors.errorBg },
  CANCELLED: { label: 'Cancelled', color: Colors.error, bg: Colors.errorBg },
  EXPIRED: { label: 'Expired', color: Colors.textSecondary, bg: Colors.surfaceBg },
};

// "2m ago" / "1h ago" / "Yesterday"
const timeAgo = (iso: string) => {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
};

const EMPTY_DASHBOARD: DashboardData = {
  isSubscribed: false,
  subscriptionPlan: '',
  revenue: 0,
  revenueTrend: '',
  activeSpacesCount: 0,
  todayBookingsCount: 0,
  pendingRequests: [],
  liveSessions: [],
  recentRequests: [],
};


export default function OwnerDashboardScreen() {
  const theme = useTheme();
  const router = useRouter();
  const setBarForSource = useSessionBarStore((s) => s.setBarForSource);
  const clearSource = useSessionBarStore((s) => s.clearSource);
  const setBar = useCallback((b: any) => setBarForSource('owner', b), [setBarForSource]);
  const clearBar = useCallback(() => clearSource('owner'), [clearSource]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData>(EMPTY_DASHBOARD);
  const [nowTs, setNowTs] = useState(Date.now()); // ticks for the live approval countdown
  const [modalItem, setModalItem] = useState<any>(null);

  const fetchDashboard = useCallback(async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      const json = await api.get('/home/owner-dashboard');
      if (!json.success) return;

      const trendPct = json.revenue?.trendPct ?? 0;
      setDashboardData({
        isSubscribed: !!json.subscription,
        subscriptionPlan: json.subscription?.planName || '',
        revenue: json.revenue?.amount ?? 0,
        revenueTrend: trendPct ? `${trendPct > 0 ? '+' : ''}${trendPct}%` : '',
        activeSpacesCount: json.stats?.activeSpacesCount ?? 0,
        todayBookingsCount: json.stats?.todayBookingsCount ?? 0,
        pendingRequests: (json.pendingRequests || []).map((r: any) => ({
          id: String(r.id),
          parkerName: r.parkerName || 'Unknown',
          spaceName: r.spaceName || '—',
          licensePlate: r.licensePlate || '',
          amount: r.amount || 0,
          durationHours: r.durationHours || 1,
          duration: r.durationHours ? `${r.durationHours} hour${r.durationHours > 1 ? 's' : ''}` : '—',
          eta: r.etaText || '—',
          createdAt: r.createdAt || '',
        })),
        liveSessions: (json.liveSessions || []).map((s: any) => ({
          id: String(s.id),
          parkerName: s.parkerName || 'Unknown',
          spaceName: s.spaceName || '—',
          licensePlate: s.licensePlate || '',
          timeLeft: s.remainingText || '—',
          endTimeISO: s.endTimeISO || null,
          isLeaving: !!s.isLeaving,
        })),
        recentRequests: (json.recentRequests || []).map((r: any) => ({
          id: String(r.id),
          parkerName: r.parkerName || 'Unknown',
          spaceName: r.spaceName || '—',
          status: r.status || '',
          amount: r.amount || 0,
          createdAt: r.createdAt || '',
        })),
      });
    } catch (e) {
      if (__DEV__) console.log('[OWNER_DASHBOARD] error', e);
    } finally {
      isRefresh ? setRefreshing(false) : setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(() => { fetchDashboard(true); }, [fetchDashboard]);

  // Refresh on focus + live refresh on new booking / arrival / session events
  useFocusEffect(useCallback(() => { fetchDashboard(); }, [fetchDashboard]));
  useEffect(() => {
    const events = ['booking:new', 'booking:expired', 'booking:cancelled', 'parker:arrived', 'parker:eta-update', 'parker:leaving', 'session:started', 'session:completed', 'notification:new'];
    const subs = events.map((evt) => DeviceEventEmitter.addListener(evt, () => fetchDashboard(true)));
    return () => subs.forEach((s) => s.remove());
  }, [fetchDashboard]);

  // Live 1-second ticker while there are pending requests (drives the approval countdown)
  useEffect(() => {
    if (dashboardData.pendingRequests.length === 0) return;
    const t = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(t);
  }, [dashboardData.pendingRequests.length]);

  // ── Feed session bar from owner dashboard state ──────────────────────
  useEffect(() => {
    const { pendingRequests, liveSessions } = dashboardData;

    if (pendingRequests.length > 0) {
      const req = pendingRequests[0];
      setBar({
        variant: 'new_request',
        bookingId: String(req.id),
        spaceName: req.spaceName,
        parkerName: req.parkerName,
        vehiclePlate: req.licensePlate,
        amount: req.amount ?? null,
        durationHours: req.durationHours ?? null,
        expiresAt: req.createdAt ? computeExpiresAt(req.createdAt) : null,
        endsAtISO: null,
        otp: null,
        etaText: null,
      });
      return;
    }

    if (liveSessions.length > 0) {
      // Surface most urgent: parker leaving > ending soon > running.
      const leaving = liveSessions.find((s) => s.isLeaving);
      const endingSoon = liveSessions.find(
        (s) => { const m = minsUntil(s.endTimeISO); return m !== null && m < 15; },
      );
      const session = leaving ?? endingSoon ?? liveSessions[0];
      const variant = leaving
        ? 'owner_session_leaving'
        : endingSoon
        ? 'owner_session_ending'
        : 'owner_session_active';

      setBar({
        variant,
        bookingId: String(session.id),
        spaceName: session.spaceName,
        parkerName: session.parkerName,
        vehiclePlate: session.licensePlate,
        amount: null,
        durationHours: null,
        expiresAt: null,
        endsAtISO: session.endTimeISO ?? null,
        otp: null,
        etaText: liveSessions.length > 1 ? `${liveSessions.length} sessions` : (session.timeLeft ?? null),
      });
      return;
    }

    clearBar();
  }, [dashboardData, setBar, clearBar]);

  // Remaining seconds in the 2-minute approval window for a pending request
  const approvalLeft = (createdAt: string) => {
    if (!createdAt) return null;
    const left = 120 - Math.floor((nowTs - new Date(createdAt).getTime()) / 1000);
    return Math.max(0, left);
  };
  const fmtCountdown = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        <PageHeader title="Manage Spaces" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <PageHeader title="Manage Spaces" />
      
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Premium Banner - Floating Style */}
        <LinearGradient
          colors={dashboardData.isSubscribed ? [Colors.textPrimary, ExtendedColors.darkCard, Colors.textDark] : [ExtendedColors.darkGrad1, ExtendedColors.darkGrad2, ExtendedColors.darkGrad3]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroBanner}
        >
          <View style={styles.heroContent}>
            <View>
              <View style={styles.heroBadgeRow}>
                {dashboardData.isSubscribed ? (
                  <Star size={14} color={Colors.amber} fill={Colors.amber} style={{ marginRight: 6 }} />
                ) : (
                  <Zap size={14} color={Colors.amber} fill={Colors.amber} style={{ marginRight: 6 }} />
                )}
                <Text style={styles.heroBadgeText}>
                  {dashboardData.isSubscribed ? 'PARKSWIFT PRO' : 'UPGRADE TO PRO'}
                </Text>
              </View>
              <Text style={styles.heroTitle}>
                {dashboardData.isSubscribed ? 'Active Subscription' : 'Unlock Premium'}
              </Text>
              <Text style={styles.heroSubtitle}>
                {dashboardData.isSubscribed ? 'Zero commissions on all bookings.' : 'Keep 100% of your revenue.'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.heroBtn}
              onPress={() => router.push('/(my-spaces)/manage-subscription')}
              activeOpacity={0.8}
            >
              <Text style={styles.heroBtnText}>
                {dashboardData.isSubscribed ? 'Manage' : 'Upgrade'}
              </Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Compact Stats Grid (2x2 Horizontal Cards) */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIconWrapper, { backgroundColor: ExtendedColors.primaryTint4 }]}>
              <TrendingUp size={18} color={Colors.primary} />
            </View>
            <View style={styles.statTextBlock}>
              <Text style={styles.statValue}>₹{dashboardData.revenue}</Text>
              <Text style={styles.statLabel}>Revenue</Text>
            </View>
          </View>
          
          <View style={styles.statCard}>
            <View style={[styles.statIconWrapper, { backgroundColor: ExtendedColors.skyBlueTint }]}>
              <MapPin size={18} color={ExtendedColors.activeBlueText} />
            </View>
            <View style={styles.statTextBlock}>
              <Text style={styles.statValue}>{dashboardData.activeSpacesCount}</Text>
              <Text style={styles.statLabel}>Active Spaces</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconWrapper, { backgroundColor: Colors.successBg }]}>
              <CheckCircle size={18} color={Colors.success} />
            </View>
            <View style={styles.statTextBlock}>
              <Text style={styles.statValue}>{dashboardData.todayBookingsCount}</Text>
              <Text style={styles.statLabel}>Bookings</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconWrapper, { backgroundColor: Colors.warningBg }]}>
              <Activity size={18} color={Colors.warning} />
            </View>
            <View style={styles.statTextBlock}>
              <Text style={styles.statValue}>{dashboardData.pendingRequests.length}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
          </View>
        </View>

        {/* Actionable Pending Requests */}
        {dashboardData.pendingRequests.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Requires Attention</Text>
              <TouchableOpacity onPress={() => router.push('/(my-spaces)/verify')}>
                <Text style={styles.sectionLink}>View all</Text>
              </TouchableOpacity>
            </View>
            
            {dashboardData.pendingRequests.map(request => {
              const left = approvalLeft(request.createdAt);
              const urgent = left != null && left < 30;
              return (
                <TouchableOpacity
                  key={request.id}
                  style={styles.actionCard}
                  activeOpacity={0.8}
                  onPress={() => router.push({ pathname: '/(my-spaces)/booking-request', params: { bookingId: request.id } })}
                >
                  <View style={styles.actionCardHeader}>
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarText}>{request.parkerName.charAt(0)}</Text>
                    </View>
                    <View style={styles.actionCardInfo}>
                      <Text style={styles.actionCardName}>{request.parkerName}</Text>
                      <Text style={styles.actionCardDetails}>{request.spaceName}</Text>
                    </View>
                    {/* Live approval countdown — how long the owner has to respond */}
                    <View style={[styles.urgentBadge, urgent && styles.urgentBadgeRed]}>
                      <Clock size={11} color={urgent ? Colors.error : Colors.warning} style={{ marginRight: 3 }} />
                      <Text style={[styles.urgentBadgeText, urgent && styles.urgentBadgeTextRed]}>
                        {left != null && left > 0 ? `${fmtCountdown(left)} left` : 'Expiring…'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.actionCardFooter}>
                    <Text style={styles.actionCardDuration}>
                      Arrives in {request.eta} · {request.duration}
                    </Text>
                    <View style={styles.reviewBtn}>
                      <Text style={styles.reviewBtnText}>Review Request</Text>
                      <ArrowRight size={14} color={Colors.white} />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Modern Live Sessions */}
        {dashboardData.liveSessions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Live Sessions</Text>
              <TouchableOpacity onPress={() => router.push('/(my-spaces)/active')}>
                <Text style={styles.sectionLink}>View all</Text>
              </TouchableOpacity>
            </View>

            {dashboardData.liveSessions.map(session => (
              <TouchableOpacity 
                key={session.id} 
                style={styles.liveSessionCard}
                activeOpacity={0.8}
                onPress={() => router.push('/(my-spaces)/active')}
              >
                <View style={styles.liveStatusIndicator}>
                  <View style={styles.liveDot} />
                </View>
                <View style={styles.liveSessionInfo}>
                  <Text style={styles.liveSessionName}>{session.parkerName}</Text>
                  <Text style={styles.liveSessionSpace}>{session.spaceName}</Text>
                </View>
                <View style={styles.timerContainer}>
                  <Clock size={14} color={Colors.success} style={{ marginRight: 4 }} />
                  <Text style={styles.timerText}>{session.timeLeft}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Recent Requests — retained history (expired/rejected/accepted/completed) */}
        {dashboardData.recentRequests.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Requests</Text>
              <TouchableOpacity onPress={() => router.push('/(my-spaces)/recent-requests')}>
                <Text style={styles.sectionLink}>View all</Text>
              </TouchableOpacity>
            </View>

            {dashboardData.recentRequests.slice(0, 2).map((req) => {
              const badge = REQUEST_STATUS_BADGE[req.status] || { label: req.status, color: Colors.textSecondary, bg: Colors.surfaceBg };
              return (
                <View
                  key={req.id}
                  style={styles.recentReqCard}
                >
                  <View style={styles.recentReqAvatar}>
                    <Text style={styles.recentReqAvatarText}>{req.parkerName.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.recentReqInfo}>
                    <Text style={styles.recentReqName}>{req.parkerName}</Text>
                    <Text style={styles.recentReqSpace} numberOfLines={1}>{req.spaceName}</Text>
                  </View>
                  <View style={styles.recentReqRight}>
                    <View style={[styles.recentReqBadge, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.recentReqBadgeText, { color: badge.color }]}>{badge.label}</Text>
                    </View>
                    <Text style={styles.recentReqTime}>{timeAgo(req.createdAt)}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Empty State when everything is cleared */}
        {dashboardData.pendingRequests.length === 0 && dashboardData.liveSessions.length === 0 && (
          <View style={styles.emptyStateContainer}>
            <NoActivitySvg width={140} height={140} primaryColor={Colors.primary} />
            <Text style={styles.emptyStateTitle}>You're all caught up!</Text>
            <Text style={styles.emptyStateDesc}>
              No pending requests or active sessions right now. 
              {dashboardData.activeSpacesCount === 0 ? " Add a space to start earning." : " We'll notify you when you get a booking."}
            </Text>
            {dashboardData.activeSpacesCount === 0 && (
              <TouchableOpacity 
                style={styles.emptyStateBtn}
                activeOpacity={0.8}
                onPress={() => router.push('/add-space')}
              >
                <Text style={styles.emptyStateBtnText}>Add a Space</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Rich detail modal for Expired / Rejected / Cancelled */}
      <Modal
        visible={!!modalItem}
        transparent
        animationType="slide"
        onRequestClose={() => setModalItem(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalItem(null)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            {/* Header */}
            {modalItem?.status === 'EXPIRED' && (
              <View style={styles.modalHeader}>
                <View style={[styles.modalIconWrap, { backgroundColor: Colors.surfaceBg }]}>
                  <Clock size={32} color={Colors.textSecondary} />
                </View>
                <Text style={styles.modalTitle}>Request Expired</Text>
                <Text style={styles.modalSub}>
                  This request expired as it wasn't approved in time.
                </Text>
              </View>
            )}
            {modalItem?.status === 'REJECTED' && (
              <View style={styles.modalHeader}>
                <View style={[styles.modalIconWrap, { backgroundColor: Colors.errorBg }]}>
                  <XCircle size={32} color={Colors.error} />
                </View>
                <Text style={[styles.modalTitle, { color: Colors.error }]}>Request Rejected</Text>
                <Text style={styles.modalSub}>You declined this booking request.</Text>
              </View>
            )}
            {modalItem?.status === 'CANCELLED' && (
              <View style={styles.modalHeader}>
                <View style={[styles.modalIconWrap, { backgroundColor: Colors.errorBg }]}>
                  <AlertCircle size={32} color={Colors.error} />
                </View>
                <Text style={[styles.modalTitle, { color: Colors.error }]}>Booking Cancelled</Text>
                <Text style={styles.modalSub}>This booking was cancelled.</Text>
              </View>
            )}

            {/* Details grid */}
            <View style={styles.modalDetails}>
              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>Space</Text>
                <Text style={styles.modalDetailValue} numberOfLines={1}>{modalItem?.spaceName}</Text>
              </View>
              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>Parker</Text>
                <Text style={styles.modalDetailValue}>{modalItem?.parkerName}</Text>
              </View>
              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>Booking ID</Text>
                <Text style={styles.modalDetailValue}>#{modalItem?.id?.slice(-6).toUpperCase()}</Text>
              </View>
              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>Requested At</Text>
                <Text style={styles.modalDetailValue}>
                  {modalItem?.createdAt ? new Date(modalItem.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '-'}
                </Text>
              </View>
              <View style={[styles.modalDetailRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.modalDetailLabel}>Amount</Text>
                <Text style={[styles.modalDetailValue, { color: Colors.primary, fontWeight: FontWeight.bold }]}>
                  {modalItem?.amount ? `₹${modalItem.amount}` : '-'}
                </Text>
              </View>
            </View>

            {/* Why did this happen (only for Expired) */}
            {modalItem?.status === 'EXPIRED' && (
              <View style={styles.reasonBox}>
                <Text style={styles.reasonTitle}>Why did this happen?</Text>
                <Text style={styles.reasonItem}>• The request timed out after 2 minutes.</Text>
                <Text style={styles.reasonItem}>• Ensure you respond to pending requests quickly to maximize earnings.</Text>
              </View>
            )}

            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setModalItem(null)}>
              <Text style={styles.modalCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.screenBg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.screenBg,
  },
  scrollContent: {
    paddingHorizontal: Spacing['3xl'],
    paddingTop: Spacing['3xl'],
    paddingBottom: Spacing['7xl'],
  },
  heroBanner: {
    borderRadius: BorderRadius.circleXl,            // 20 = circleXl ✓
    padding: Spacing.screenH,
    marginBottom: Spacing['4xl'],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  heroBadgeText: {
    color: Colors.amber,
    fontSize: FontSize.xs,                          // 11 = xs ✓
    fontWeight: FontWeight.extrabold,
    letterSpacing: 1,
  },
  heroTitle: {
    fontSize: FontSize['3xl'],                      // 20 = 3xl ✓
    fontWeight: FontWeight.extrabold,
    color: Colors.white,
    marginBottom: Spacing.xs,
  },
  heroSubtitle: {
    fontSize: FontSize.base,                        // 13 = base ✓
    color: Colors.borderMuted,
    fontWeight: FontWeight.medium,
  },
  heroBtn: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.input,               // 10 = input ✓
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  heroBtnText: {
    color: Colors.textPrimary,
    fontWeight: FontWeight.bold,
    fontSize: FontSize.sm,                          // 12 = sm ✓
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  statCard: {
    width: '48%',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.button,              // 14 = button ✓
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: Colors.textMuted,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.surfaceBg,
  },
  statIconWrapper: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.lg,
  },
  statTextBlock: {
    flex: 1,
  },
  statValue: {
    fontSize: FontSize['2xl'],                      // 18 = 2xl ✓
    fontWeight: FontWeight.extrabold,
    color: Colors.textPrimary,
    marginBottom: 1,
  },
  statLabel: {
    fontSize: FontSize.xs,                          // 11 = xs ✓
    color: Colors.textSecondary,
    fontWeight: FontWeight.semibold,
  },
  section: {
    marginBottom: Spacing['4xl'],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSize.xl,                          // 16 = xl ✓
    fontWeight: FontWeight.extrabold,
    color: Colors.textPrimary,
  },
  sectionLink: {
    fontSize: FontSize.base,                        // 13 = base ✓
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
  actionCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,                  // 16 = lg ✓
    padding: Spacing['3xl'],
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceBg,
    shadowColor: Colors.textMuted,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  actionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.lg,
  },
  avatarText: {
    fontSize: FontSize.xl,                          // 16 = xl ✓
    fontWeight: FontWeight.bold,
    color: Colors.textSecondary,
  },
  actionCardInfo: {
    flex: 1,
  },
  actionCardName: {
    fontSize: FontSize.lg,                          // 15 = lg ✓
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.micro,
  },
  actionCardDetails: {
    fontSize: FontSize.sm,                          // 12 = sm ✓
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warningBgAlt,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.input,               // 10 = input ✓
  },
  urgentBadgeRed: { backgroundColor: Colors.errorBg },
  urgentBadgeText: {
    color: Colors.warning,
    fontSize: FontSize.xs,                          // 11 = xs ✓
    fontWeight: FontWeight.bold,
  },
  urgentBadgeTextRed: { color: Colors.error },
  actionCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBg,
    paddingTop: Spacing.xl,
  },
  actionCardDuration: {
    fontSize: FontSize.sm,                          // 12 = sm ✓
    color: Colors.textSecondary,
    fontWeight: FontWeight.semibold,
  },
  reviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.input,               // 10 = input ✓
  },
  reviewBtnText: {
    color: Colors.white,
    fontWeight: FontWeight.bold,
    fontSize: FontSize.sm,                          // 12 = sm ✓
    marginRight: Spacing.xs,
  },
  recentReqCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.white, borderRadius: BorderRadius.button, padding: Spacing.xl, marginBottom: Spacing.md,  // 14 = button ✓
    borderWidth: 1, borderColor: Colors.surfaceBg,
  },
  recentReqAvatar: {
    width: 38, height: 38, borderRadius: BorderRadius.circle, backgroundColor: Colors.surfaceBg,  // 19 = circle ✓
    alignItems: 'center', justifyContent: 'center', marginRight: Spacing.xl,
  },
  recentReqAvatarText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textSecondary },  // 15 = lg ✓
  recentReqInfo: { flex: 1 },
  recentReqName: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary },  // 14 = md ✓
  recentReqSpace: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: Spacing.micro },  // 12 = sm ✓
  recentReqRight: { alignItems: 'flex-end', gap: Spacing.xs },
  recentReqBadge: { paddingHorizontal: Spacing.md, paddingVertical: 3, borderRadius: BorderRadius.sm },  // 8 = sm ✓
  recentReqBadgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },  // 11 = xs ✓
  recentReqTime: { fontSize: FontSize.xs, color: Colors.textMuted },  // 11 = xs ✓

  liveSessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,                  // 16 = lg ✓
    padding: Spacing['2xl'],
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBg,
    shadowColor: Colors.textMuted,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  liveStatusIndicator: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.successBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.lg,
  },
  liveDot: {
    width: 12,
    height: 12,
    borderRadius: BorderRadius.badge,               // 6 = badge ✓
    backgroundColor: Colors.success,
  },
  liveSessionInfo: {
    flex: 1,
  },
  liveSessionName: {
    fontSize: FontSize.lg,                          // 15 = lg ✓
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.micro,
  },
  liveSessionSpace: {
    fontSize: FontSize.sm,                          // 12 = sm ✓
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.screenBg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.input,               // 10 = input ✓
  },
  timerText: {
    color: Colors.success,
    fontWeight: FontWeight.bold,
    fontSize: FontSize.base,                        // 13 = base ✓
  },

  // Empty State
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 0,
    paddingBottom: Spacing.screenH,
    paddingHorizontal: Spacing.screenH,
    marginTop: -16,
  },
  emptyStateTitle: {
    fontSize: FontSize['2xl'],                      // 18 = 2xl ✓
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginTop: Spacing.screenH,
    marginBottom: Spacing.md,
  },
  emptyStateDesc: {
    fontSize: FontSize.md,                          // 14 = md ✓
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.screenH,
  },
  emptyStateBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing['4xl'],
    paddingVertical: Spacing.xl,
    borderRadius: BorderRadius.md,                  // 12 = md ✓
  },
  emptyStateBtnText: {
    color: Colors.white,
    fontSize: FontSize.lg,                          // 15 = lg ✓
    fontWeight: FontWeight.semibold,
  },
  // Modal styles
  modalOverlay: {
    flex: 1, backgroundColor: ExtendedColors.overlayHeavy,   // 'rgba(0,0,0,0.55)' ✓
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.white, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl,  // 24 = xl ✓
    paddingHorizontal: Spacing.screenH, paddingTop: Spacing.screenH, paddingBottom: Spacing['6xl'],
    gap: Spacing.xl,
  },
  modalHeader: { alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xs },
  modalIconWrap: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xs,
  },
  modalTitle: { fontSize: FontSize['3xl'], fontWeight: FontWeight.extrabold, color: Colors.textPrimary, textAlign: 'center' },  // 20 = 3xl ✓
  modalSub: { fontSize: FontSize.base, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },  // 13 = base ✓
  modalDetails: {
    backgroundColor: Colors.screenBg, borderRadius: BorderRadius.button,   // 14 = button ✓
    paddingHorizontal: Spacing['2xl'], paddingVertical: Spacing.sm,
  },
  modalDetailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  modalDetailLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium, flex: 1 },  // 12 = sm ✓
  modalDetailValue: { fontSize: FontSize.base, color: Colors.textPrimary, fontWeight: FontWeight.semibold, textAlign: 'right', flex: 1.5 },  // 13 = base ✓
  reasonBox: {
    backgroundColor: Colors.pendingBg, borderRadius: BorderRadius.md, padding: Spacing['2xl'],   // '#FFF7ED' ✓, 12 = md ✓
    borderLeftWidth: 3, borderLeftColor: ExtendedColors.orange,   // '#F97316' ✓
  },
  reasonTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: ExtendedColors.redOrange, marginBottom: Spacing.sm },  // 12 = sm ✓, '#C2410C' ✓
  reasonItem: { fontSize: FontSize.sm, color: ExtendedColors.warningAmber, lineHeight: 20 },  // 12 = sm ✓, '#92400E' ✓
  modalCloseBtn: {
    paddingVertical: Spacing['2xl'], borderRadius: BorderRadius.md,   // 12 = md ✓
    backgroundColor: Colors.surfaceBg, alignItems: 'center', marginTop: Spacing.md,
  },
  modalCloseBtnText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },  // 15 = lg ✓
});
