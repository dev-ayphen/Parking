import React, { useState, useCallback, useEffect } from 'react';
import {View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  DeviceEventEmitter,
  Modal,
  Pressable,
  Image,
  Alert} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { CheckCircle, AlertCircle, ArrowRight, Activity, TrendingUp, MapPin, Clock, Star, Zap, XCircle, Lock, QrCode } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { PageHeader, LoadErrorState } from '../../components';
import NoActivitySvg from '../../components/Illustrations/NoActivitySvg';
import { api } from '../../services/api';
import { NETWORK_RECONNECTED } from '../../store/networkStore';
import { ExtendedColors, FontWeight, FontSize } from '../../theme';
import { useSessionBarStore, computeExpiresAt, minsUntil } from '../../store/sessionBarStore';
import { makeOwnerDashboardStyles } from './styles';

interface Entitlements {
  planName: string;
  maxSpaces: number;
  hasAnalytics: boolean;
  hasFeaturedListing: boolean;
  hasCsvExport: boolean;
  hasPrioritySupport: boolean;
  isSubscribed: boolean;
}

interface Usage {
  spacesUsed: number;
  maxSpaces: number;
  daysRemaining: number;
  isExpired: boolean;
}

interface DashboardData {
  isSubscribed: boolean;
  subscriptionPlan: string;
  revenue: number;
  revenueTrend: string;
  activeSpacesCount: number;
  todayBookingsCount: number;
  pendingRequests: { id: string; parkerName: string; parkerPhotoUrl: string | null; spaceName: string; licensePlate: string; amount: number; durationHours: number; duration: string; eta: string; createdAt: string }[];
  liveSessions: { id: string; parkerName: string; parkerPhotoUrl: string | null; spaceName: string; licensePlate: string; timeLeft: string; endTimeISO: string | null; isLeaving: boolean }[];
  awaitingArrival: { id: string; parkerName: string; spaceName: string; licensePlate: string; etaText: string | null; atGate: boolean }[];
  recentRequests: { id: string; parkerName: string; parkerPhotoUrl: string | null; spaceName: string; status: string; amount: number; createdAt: string }[];
  entitlements: Entitlements | null;
  usage: Usage | null;
  hasUpiId: boolean;
}

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
  awaitingArrival: [],
  recentRequests: [],
  entitlements: null,
  usage: null,
  hasUpiId: true, // assume set until the API says otherwise (avoid a flash of the nudge)
};


export default function OwnerDashboardScreen() {
  const theme = useTheme();
  const colors = theme.colors;
  const router = useRouter();
  const setBarForSource = useSessionBarStore((s) => s.setBarForSource);
  const clearSource = useSessionBarStore((s) => s.clearSource);
  const setBar = useCallback((b: any) => setBarForSource('owner', b), [setBarForSource]);
  const clearBar = useCallback(() => clearSource('owner'), [clearSource]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData>(EMPTY_DASHBOARD);
  // Track whether a load has EVER succeeded. If a fetch fails before we ever have
  // real data (e.g. opened the screen offline), we show a full "can't load" state
  // instead of a misleading default dashboard (₹0, fake "all caught up").
  const [loadFailed, setLoadFailed] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [nowTs, setNowTs] = useState(Date.now()); // ticks for the live approval countdown
  const [modalItem, setModalItem] = useState<any>(null);

  // Status badge styling for retained recent requests — inside component so it can use colors
  const REQUEST_STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
    APPROVED: { label: 'Approved', color: colors.success, bg: colors.successBg },
    COMPLETED: { label: 'Completed', color: colors.textBody, bg: colors.surfaceBg },
    REJECTED: { label: 'Rejected', color: colors.error, bg: colors.errorBg },
    CANCELLED: { label: 'Cancelled', color: colors.error, bg: colors.errorBg },
    EXPIRED: { label: 'Expired', color: colors.textSecondary, bg: colors.surfaceBg },
  };

  const styles = makeOwnerDashboardStyles(colors);

  const fetchDashboard = useCallback(async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      const json = await api.get('/home/owner-dashboard');
      if (!json.success) return;
      setLoadFailed(false);
      setHasLoaded(true);

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
          parkerPhotoUrl: r.parkerPhotoUrl || null,
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
          parkerPhotoUrl: s.parkerPhotoUrl || null,
          spaceName: s.spaceName || '—',
          licensePlate: s.licensePlate || '',
          timeLeft: s.remainingText || '—',
          endTimeISO: s.endTimeISO || null,
          isLeaving: !!s.isLeaving,
        })),
        awaitingArrival: (json.awaitingArrival || []).map((a: any) => ({
          id: String(a.id),
          parkerName: a.parkerName || 'Unknown',
          spaceName: a.spaceName || '—',
          licensePlate: a.licensePlate || '',
          etaText: a.etaText || null,
          atGate: !!a.atGate,
        })),
        recentRequests: (json.recentRequests || []).map((r: any) => ({
          id: String(r.id),
          parkerName: r.parkerName || 'Unknown',
          parkerPhotoUrl: r.parkerPhotoUrl || null,
          spaceName: r.spaceName || '—',
          status: r.status || '',
          amount: r.amount || 0,
          createdAt: r.createdAt || '',
        })),
        entitlements: json.entitlements ?? null,
        usage: json.usage ?? null,
        hasUpiId: json.hasUpiId !== false, // default to true unless API explicitly says false
      });
    } catch (e) {
      if (__DEV__) console.log('[OWNER_DASHBOARD] error', e);
      // Mark the load as failed so we can show a proper "can't load" screen when
      // we have no real data yet (rather than the misleading default dashboard).
      setLoadFailed(true);
    } finally {
      isRefresh ? setRefreshing(false) : setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(() => { fetchDashboard(true); }, [fetchDashboard]);

  // Refresh on focus + live refresh on new booking / arrival / session events
  useFocusEffect(useCallback(() => { fetchDashboard(); }, [fetchDashboard]));
  useEffect(() => {
    const events = ['booking:new', 'booking:expired', 'booking:cancelled', 'parker:arrived', 'parker:eta-update', 'parker:leaving', 'session:started', 'session:completed', 'notification:new', NETWORK_RECONNECTED];
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
    // Default to [] — older cached dashboardData (or a partial fetch) may not have
    // the awaitingArrival field yet, and `undefined.length` would crash the screen.
    const { pendingRequests, liveSessions, awaitingArrival = [] } = dashboardData;

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

    // Accepted but not started: "Parker at gate — verify OTP" (arrived) else
    // "Parker is on the way". Prefer an at-gate booking so the owner is nudged
    // to the verify action when one is ready.
    if (awaitingArrival.length > 0) {
      const target = awaitingArrival.find((a) => a.atGate) ?? awaitingArrival[0];
      setBar({
        variant: target.atGate ? 'parker_at_gate' : 'parker_en_route',
        bookingId: String(target.id),
        spaceName: target.spaceName,
        parkerName: target.parkerName,
        vehiclePlate: target.licensePlate,
        amount: null,
        durationHours: null,
        expiresAt: null,
        endsAtISO: null,
        otp: null,
        etaText: target.etaText ?? null,
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

  // ── Subscription gate (Task B & C) ───────────────────────────────────
  // Owners with no active subscription (or an expired one) cannot list spaces.
  // entitlements.isSubscribed is the source of truth; usage.isExpired flags a
  // lapsed plan so we can show "renew" copy instead of "subscribe".
  const ent = dashboardData.entitlements;
  const usage = dashboardData.usage;
  const isSubscribed = ent ? ent.isSubscribed : dashboardData.isSubscribed;
  const isExpired = !!usage?.isExpired;
  const subscriptionLocked = !isSubscribed || isExpired;

  // Gate the Add Space entry: route to plans (with a nudge) when not subscribed.
  const handleAddSpace = useCallback(() => {
    if (subscriptionLocked) {
      Alert.alert(
        'Subscription Required',
        'A subscription is required to list a parking space. Choose a plan to start earning.',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'View Plans', onPress: () => router.push('/(my-spaces)/subscription-plans') },
        ],
      );
      return;
    }
    router.push('/add-space');
  }, [subscriptionLocked, router]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        <PageHeader title="Manage Spaces"  onBack={() => router.replace('/(home)')} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // Couldn't load and we have no real data to show yet (e.g. opened offline).
  // Show a full "can't load / try again" state instead of a misleading default
  // dashboard. Once data has loaded once, we keep showing it (a transient refresh
  // failure shouldn't blank the screen).
  if (loadFailed && !hasLoaded) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        <PageHeader title="Manage Spaces"  onBack={() => router.replace('/(home)')} />
        <LoadErrorState onRetry={() => fetchDashboard()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <PageHeader title="Manage Spaces"  onBack={() => router.replace('/(home)')} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Subscription lock banner — the key revenue nudge. Shown when the owner
            has no active subscription or it has expired, so they can't list spaces. */}
        {subscriptionLocked && (
          <View style={styles.lockBanner}>
            <View style={styles.lockBannerIcon}>
              <Lock size={18} color={colors.error} />
            </View>
            <View style={styles.lockBannerBody}>
              <Text style={styles.lockBannerTitle}>
                {isExpired ? 'Subscription Expired' : 'Subscription Required'}
              </Text>
              <Text style={styles.lockBannerText}>
                {isExpired
                  ? 'Renew to continue listing and managing your parking spaces.'
                  : 'Subscribe to list and manage your parking spaces.'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.lockBannerBtn}
              activeOpacity={0.8}
              onPress={() => router.push('/(my-spaces)/subscription-plans')}
            >
              <Text style={styles.lockBannerBtnText}>
                {isExpired ? 'Renew' : 'View Plans'}
              </Text>
            </TouchableOpacity>
          </View>
        )}


        {/* Premium Banner - Floating Style */}
        <LinearGradient
          colors={dashboardData.isSubscribed ? [colors.textPrimary, ExtendedColors.darkCard, colors.textDark] : [ExtendedColors.darkGrad1, ExtendedColors.darkGrad2, ExtendedColors.darkGrad3]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroBanner}
        >
          <View style={styles.heroContent}>
            <View>
              <View style={styles.heroBadgeRow}>
                {dashboardData.isSubscribed ? (
                  <Star size={14} color={colors.amber} fill={colors.amber} style={{ marginRight: 6 }} />
                ) : (
                  <Zap size={14} color={colors.amber} fill={colors.amber} style={{ marginRight: 6 }} />
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
              <TrendingUp size={18} color={colors.primary} />
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
            <View style={[styles.statIconWrapper, { backgroundColor: colors.successBg }]}>
              <CheckCircle size={18} color={colors.success} />
            </View>
            <View style={styles.statTextBlock}>
              <Text style={styles.statValue}>{dashboardData.todayBookingsCount}</Text>
              <Text style={styles.statLabel}>Bookings</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconWrapper, { backgroundColor: colors.warningBg }]}>
              <Activity size={18} color={colors.warning} />
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
                      {request.parkerPhotoUrl ? (
                        <Image source={{ uri: request.parkerPhotoUrl }} style={styles.avatarImg} resizeMode="cover" onError={() => {}} />
                      ) : (
                        <Text style={styles.avatarText}>{request.parkerName.charAt(0)}</Text>
                      )}
                    </View>
                    <View style={styles.actionCardInfo}>
                      <Text style={styles.actionCardName}>{request.parkerName}</Text>
                      <Text style={styles.actionCardDetails}>{request.spaceName}</Text>
                    </View>
                    {/* Live approval countdown — how long the owner has to respond */}
                    <View style={[styles.urgentBadge, urgent && styles.urgentBadgeRed]}>
                      <Clock size={11} color={urgent ? colors.error : colors.warning} style={{ marginRight: 3 }} />
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
                      <ArrowRight size={14} color={colors.white} />
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
                  <Clock size={14} color={colors.success} style={{ marginRight: 4 }} />
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
              const badge = REQUEST_STATUS_BADGE[req.status] || { label: req.status, color: colors.textSecondary, bg: colors.surfaceBg };
              return (
                <TouchableOpacity
                  key={req.id}
                  style={styles.recentReqCard}
                  activeOpacity={0.7}
                  onPress={() => setModalItem(req)}
                >
                  <View style={styles.recentReqAvatar}>
                    {req.parkerPhotoUrl ? (
                      <Image source={{ uri: req.parkerPhotoUrl }} style={styles.recentReqAvatarImg} resizeMode="cover" onError={() => {}} />
                    ) : (
                      <Text style={styles.recentReqAvatarText}>{req.parkerName.charAt(0).toUpperCase()}</Text>
                    )}
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
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Empty State when everything is cleared */}
        {dashboardData.pendingRequests.length === 0 && dashboardData.liveSessions.length === 0 && (
          <View style={styles.emptyStateContainer}>
            <NoActivitySvg width={140} height={140} primaryColor={colors.primary} />
            <Text style={styles.emptyStateTitle}>You're all caught up!</Text>
            <Text style={styles.emptyStateDesc}>
              No pending requests or active sessions right now.
              {dashboardData.activeSpacesCount === 0 ? " Add a space to start earning." : " We'll notify you when you get a booking."}
            </Text>
            {dashboardData.activeSpacesCount === 0 && (
              <TouchableOpacity
                style={styles.emptyStateBtn}
                activeOpacity={0.8}
                onPress={handleAddSpace}
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
                <View style={[styles.modalIconWrap, { backgroundColor: colors.surfaceBg }]}>
                  <Clock size={32} color={colors.textSecondary} />
                </View>
                <Text style={styles.modalTitle}>Request Expired</Text>
                <Text style={styles.modalSub}>
                  This request expired as it wasn't approved in time.
                </Text>
              </View>
            )}
            {modalItem?.status === 'REJECTED' && (
              <View style={styles.modalHeader}>
                <View style={[styles.modalIconWrap, { backgroundColor: colors.errorBg }]}>
                  <XCircle size={32} color={colors.error} />
                </View>
                <Text style={[styles.modalTitle, { color: colors.error }]}>Request Rejected</Text>
                <Text style={styles.modalSub}>You declined this booking request.</Text>
              </View>
            )}
            {modalItem?.status === 'CANCELLED' && (
              <View style={styles.modalHeader}>
                <View style={[styles.modalIconWrap, { backgroundColor: colors.errorBg }]}>
                  <AlertCircle size={32} color={colors.error} />
                </View>
                <Text style={[styles.modalTitle, { color: colors.error }]}>Booking Cancelled</Text>
                <Text style={styles.modalSub}>This booking was cancelled.</Text>
              </View>
            )}
            {(modalItem?.status === 'APPROVED' || modalItem?.status === 'COMPLETED') && (
              <View style={styles.modalHeader}>
                <View style={[styles.modalIconWrap, { backgroundColor: colors.successBg }]}>
                  <CheckCircle size={32} color={colors.success} />
                </View>
                <Text style={[styles.modalTitle, { color: colors.success }]}>
                  {modalItem?.status === 'COMPLETED' ? 'Booking Completed' : 'Request Approved'}
                </Text>
                <Text style={styles.modalSub}>
                  {modalItem?.status === 'COMPLETED'
                    ? 'This parking session was completed successfully.'
                    : 'You approved this booking request.'}
                </Text>
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
                <Text style={[styles.modalDetailValue, { color: colors.primary, fontWeight: FontWeight.bold }]}>
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


