import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {View,
  ScrollView,
  StyleSheet,
  StatusBar,
  Text,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  DeviceEventEmitter,
  Image} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from "../../hooks/useTheme";
import { clearAuthData } from '../../utils/secureStorage';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useSessionBarStore, computeEndsAtISO, computeExpiresAt, minsUntil } from '../../store/sessionBarStore';
import ProHeader from '../../components/Header/ProHeader';
import PersonalizedGreeting from '../../components/Home/PersonalizedGreeting';
import HomeCard from '../../components/Cards/HomeCard';
import ActivityFeed, { Activity } from '../../components/Activity/ActivityFeed';
import NavigationDrawer from '../../components/Navigation/NavigationDrawer';
import MagnifyingGlassSvg from '../../components/Illustrations/MagnifyingGlassSvg';
import { MapPin, CarFront } from 'lucide-react-native';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, ExtendedColors } from '../../theme';


const HomeScreen = () => {
  const router = useRouter();
  const theme = useTheme();
  const { colors, isDark } = theme;
  const currentUser = useAuthStore((s) => s.user);
  const setBarForSource = useSessionBarStore((s) => s.setBarForSource);
  const clearSource = useSessionBarStore((s) => s.clearSource);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeRoute, setActiveRoute] = useState('home');
  const [userName, setUserName] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  const [recentActivityLoading, setRecentActivityLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [homeStats, setHomeStats] = useState({
    spotsNearby: '-', available: '-',
    todayEarnings: '-', activeBookings: '-', spacesListed: '-', monthEarnings: '-',
  });
  const [unreadCount, setUnreadCount] = useState(0);

  // ── Data fetching ─────────────────────────────────────────────────
  const loadDashboardData = useCallback(async () => {
    try {
      const data = await api.get('/home/dashboard');
      if (data.success && data.data?.user) {
        setUserName(data.data.user.name || '');
      }
    } catch (e) {
      if (__DEV__) console.log('[HOME] dashboard error', e);
    }
  }, [router]);

  const loadRecentActivity = useCallback(async () => {
    try {
      const json = await api.get('/bookings/my?limit=5');
      if (json.success) {
        const statusLabel: Record<string, string> = {
          PENDING_APPROVAL: 'Waiting for approval',
          APPROVED: 'Approved',
          ACTIVE: 'In progress',
          COMPLETED: 'Completed',
          CANCELLED: 'Cancelled',
          REJECTED: 'Rejected',
          EXPIRED: 'Expired',
        };
        const statusType = (s: string): Activity['status'] => {
          if (s === 'ACTIVE') return 'active';
          if (s === 'COMPLETED') return 'completed';
          if (s === 'CANCELLED' || s === 'REJECTED' || s === 'EXPIRED') return 'failed';
          return 'pending';
        };
        const mapped: Activity[] = (json.bookings || []).map((b: any) => ({
          id: String(b.id),
          type: b.status === 'COMPLETED' ? 'payment' : 'booking',
          title: b.space?.name || 'Unknown Space',
          description: statusLabel[b.status] ?? b.status,
          amount: b.totalAmount || 0,
          status: statusType(b.status),
          timestamp: b.createdAt,
        }));
        setRecentActivities(mapped);
      }
    } catch (e) {
      if (__DEV__) console.log('[HOME] activity error', e);
    } finally {
      setRecentActivityLoading(false);
    }
  }, []);

  const loadHomeStats = useCallback(async () => {
    try {
      const json = await api.get('/home/stats');
      if (json.success) {
        const { parker, owner } = json.stats;
        setHomeStats({
          spotsNearby: String(parker.spotsNearby),
          available: String(parker.available),
          todayEarnings: `₹${owner.todayEarnings}`,
          activeBookings: String(owner.activeBookings),
          spacesListed: String(owner.spacesListed),
          monthEarnings: `₹${owner.monthEarnings ?? 0}`,
        });
      }
    } catch (e) {
      if (__DEV__) console.log('[HOME] stats error', e);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadUnreadCount = useCallback(async () => {
    try {
      const json = await api.get('/home/notifications');
      if (json.success) {
        // Use server-computed unreadCount (only real DB notifications)
        setUnreadCount(json.unreadCount ?? 0);
      }
    } catch (e) {
      if (__DEV__) console.log('[HOME] unread count error', e);
    }
  }, []);

  // ── Session bar sync ──────────────────────────────────────────────────────
  // A user can be BOTH a parker (booked someone's space) and an owner (someone
  // booked theirs) at the same time. We therefore sync BOTH sources independently
  // and in parallel — each writes only its own source, so both bars coexist and
  // stack in the SessionBar ("1/2" + swipe). We don't gate on currentUser.role
  // because that single field doesn't capture dual activity.

  // Parker side: GET /bookings/my — my own active/pending bookings.
  const syncParkerBar = useCallback(async () => {
    try {
      const json = await api.get('/bookings/my?limit=10');
      const bookings: any[] = json.bookings ?? [];

      // Priority: ACTIVE > PENDING_APPROVAL > APPROVED > COMPLETED(unrated)
      const active = bookings.find((b: any) => b.status === 'ACTIVE');
      if (active) {
        const endsAtISO = computeEndsAtISO(active.sessionStartedAt, active.eta, active.createdAt, active.duration ?? 1);
        const mins = minsUntil(endsAtISO);
        setBarForSource('parker', {
          variant: mins !== null && mins < 15 ? 'session_ending' : 'session_active',
          bookingId: String(active.id),
          spaceName: active.space?.name ?? '',
          parkerName: '',
          vehiclePlate: active.vehicle?.licensePlate ?? '',
          amount: active.totalAmount ?? null,
          durationHours: active.duration ?? null,
          expiresAt: null,
          endsAtISO,
          otp: active.sessionOtp ?? null,
          etaText: null,
        });
        return;
      }

      const pending = bookings.find((b: any) => b.status === 'PENDING_APPROVAL');
      if (pending) {
        setBarForSource('parker', {
          variant: 'booking_pending',
          bookingId: String(pending.id),
          spaceName: pending.space?.name ?? '',
          parkerName: '',
          vehiclePlate: '',
          amount: pending.totalAmount ?? null,
          durationHours: pending.duration ?? null,
          expiresAt: pending.createdAt ? computeExpiresAt(pending.createdAt) : null,
          endsAtISO: null,
          otp: null,
          etaText: null,
        });
        return;
      }

      const approved = bookings.find((b: any) => b.status === 'APPROVED');
      if (approved) {
        // Format the arrival deadline (eta) as "6:30 PM" so the bar can remind
        // the parker to head over before they forget the booking.
        const etaText = approved.eta
          ? new Date(approved.eta).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
          : null;
        setBarForSource('parker', {
          variant: approved.sessionOtp ? 'arrived_otp_ready' : 'booking_approved',
          bookingId: String(approved.id),
          spaceName: approved.space?.name ?? '',
          parkerName: '',
          vehiclePlate: approved.vehicle?.licensePlate ?? '',
          amount: approved.totalAmount ?? null,
          durationHours: approved.duration ?? null,
          expiresAt: null,
          endsAtISO: null,
          otp: approved.sessionOtp ?? null,
          etaText,
        });
        return;
      }

      // Note: an EXPIRED booking does NOT get a bar — the inbox notification
      // ("Booking Request Expired") already informs the user. Bars are only for
      // active, actionable states, never dead/finished ones.

      const unrated = bookings.find((b: any) => b.status === 'COMPLETED' && !b.rating);
      if (unrated) {
        setBarForSource('parker', {
          variant: 'rating_pending',
          bookingId: String(unrated.id),
          spaceName: unrated.space?.name ?? '',
          parkerName: '',
          vehiclePlate: '',
          amount: unrated.totalAmount ?? null,
          durationHours: null,
          expiresAt: null,
          endsAtISO: null,
          otp: null,
          etaText: null,
        });
        return;
      }

      clearSource('parker');
    } catch (e) {
      if (__DEV__) console.log('[HOME] parker bar sync error', e);
    }
  }, [setBarForSource, clearSource]);

  // Owner side: GET /home/owner-dashboard — requests/sessions on MY spaces.
  const syncOwnerBar = useCallback(async () => {
    try {
      const ownerData = await api.get('/home/owner-dashboard');
      const pending: any[] = ownerData.pendingRequests ?? [];
      const live: any[]    = ownerData.liveSessions ?? [];

      if (pending.length > 0) {
        const req = pending[0];
        setBarForSource('owner', {
          variant: 'new_request',
          bookingId: String(req.id),
          spaceName: req.spaceName ?? '',
          parkerName: req.parkerName ?? '',
          vehiclePlate: req.licensePlate ?? '',
          amount: req.amount ?? null,
          durationHours: req.durationHours ?? null,
          expiresAt: req.createdAt ? computeExpiresAt(req.createdAt) : null,
          endsAtISO: null,
          otp: null,
          etaText: req.etaText ?? null,
        });
        return;
      }

      if (live.length > 0) {
        const leaving = live.find((s: any) => s.isLeaving);
        const endingSoon = live.find((s: any) => { const m = minsUntil(s.endTimeISO); return m !== null && m < 15; });
        const target = leaving ?? endingSoon ?? live[0];
        const variant = leaving ? 'owner_session_leaving' : endingSoon ? 'owner_session_ending' : 'owner_session_active';
        setBarForSource('owner', {
          variant,
          bookingId: String(target.id),
          spaceName: target.spaceName ?? '',
          parkerName: target.parkerName ?? '',
          vehiclePlate: target.licensePlate ?? '',
          amount: null,
          durationHours: null,
          expiresAt: null,
          endsAtISO: target.endTimeISO ?? null,
          otp: null,
          etaText: live.length > 1 ? `${live.length} sessions` : (target.remainingText ?? null),
        });
        return;
      }

      clearSource('owner');
    } catch (e) {
      // A pure parker has no spaces; owner-dashboard may 403/empty — that's fine,
      // just clear the owner bar and move on without surfacing an error.
      clearSource('owner');
      if (__DEV__) console.log('[HOME] owner bar sync skipped', e);
    }
  }, [setBarForSource, clearSource]);

  // Run both in parallel on every sync trigger.
  const syncSessionBar = useCallback(async () => {
    if (!currentUser?.id) return;
    await Promise.all([syncParkerBar(), syncOwnerBar()]);
  }, [currentUser?.id, syncParkerBar, syncOwnerBar]);

  // Sync bar on every focus + 30s background poll (self-healing fallback)
  useFocusEffect(
    useCallback(() => {
      syncSessionBar();
      const t = setInterval(syncSessionBar, 30_000);
      return () => clearInterval(t);
    }, [syncSessionBar])
  );

  // Instant bar updates: re-sync the moment any booking/session socket event
  // arrives (parker- AND owner-facing), so the home bar reflects state changes
  // immediately instead of waiting up to 30s for the next poll. Mirrors the
  // pattern Swiggy/Ola use — socket first, poll only as a fallback.
  useEffect(() => {
    const events = [
      // Parker-facing lifecycle
      'booking:approved', 'booking:rejected', 'booking:expired',
      'booking:cancelled', 'verification:ready', 'session:started',
      'session:completed', 'rating:new',
      // Owner-facing lifecycle
      'booking:new', 'parker:arrived', 'parker:eta-update', 'parker:leaving',
      // Catch-all
      'notification:new',
    ];
    const subs = events.map((evt) =>
      DeviceEventEmitter.addListener(evt, () => {
        syncSessionBar();
        // Any of these events may have created a notification — refresh the bell
        // badge live so it bumps without waiting for a screen refocus.
        loadUnreadCount();
      }),
    );
    return () => subs.forEach((s) => s.remove());
  }, [syncSessionBar, loadUnreadCount]);

  useEffect(() => {
    loadDashboardData();
    loadRecentActivity();
    loadHomeStats();
    loadUnreadCount();
  }, [loadDashboardData, loadRecentActivity, loadHomeStats, loadUnreadCount]);

  // Re-fetch badge count every time screen is focused (e.g. after returning from notifications)
  useFocusEffect(
    useCallback(() => {
      loadUnreadCount();
    }, [loadUnreadCount])
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadDashboardData(), loadRecentActivity(), loadHomeStats(), loadUnreadCount(), syncSessionBar()]);
    setIsRefreshing(false);
  };

  // ── Navigation handlers ───────────────────────────────────────────
  const handleMenuPress = (menuId: string) => {
    setActiveRoute(menuId);
    setDrawerOpen(false);
    switch (menuId) {
      case 'home':
        break; // already on home
      case 'profile':
        router.push('/(home)/profile');
        break;
      case 'my-bookings':
        router.push('/(home)/my-bookings');
        break;
      case 'find-parking':
        router.push('/(find-space)');
        break;
      case 'my-vehicles':
        router.push({ pathname: '/(find-space)', params: { tab: 'vehicle' } });
        break;
      case 'my-spaces':
        router.push('/(my-spaces)/spaces');
        break;
      case 'settings':
        router.push('/(home)/settings');
        break;
      case 'help':
        router.push('/(home)/help-support');
        break;
      case 'logout':
        Alert.alert('Logout', 'Are you sure you want to logout?', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Logout',
            style: 'destructive',
            onPress: async () => {
              try {
                await api.post('/auth/logout').catch(() => {});
                await clearAuthData();
                router.replace('/(auth)/login');
              } catch {
                await clearAuthData();
                router.replace('/(auth)/login');
              }
            },
          },
        ]);
        break;
    }
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.white },
        scrollView: { flex: 1, backgroundColor: colors.screenBg },
        activityHeader: {
          flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
          paddingHorizontal: Spacing['4xl'], marginTop: Spacing.md, marginBottom: Spacing.xs,
        },
        activityTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: colors.textPrimary, letterSpacing: 0 },
        activitySeeAll: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: colors.primary },
        statPlaceholder: { width: 40, height: 14, borderRadius: BorderRadius.xs, backgroundColor: colors.surfaceBg, marginBottom: Spacing.micro },
      }),
    [colors]
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.white}
      />

      {/* Navigation Drawer */}
      <NavigationDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        userName={userName || 'User'}
        userImage={undefined}
        userRole="both"
        activeRoute={activeRoute}
        onMenuItemPress={handleMenuPress}
      />

      {/* Header */}
      <ProHeader
        onMenuPress={() => setDrawerOpen(true)}
        onNotificationPress={() => router.push('/(home)/notifications')}
        notificationCount={unreadCount}
      />

      {/* Main Content */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Personalized Greeting */}
        <PersonalizedGreeting userName={userName || 'User'} />

        {/* Find Parking Card */}
        <HomeCard
          icon={<MapPin size={20} color={colors.primary} strokeWidth={2.5} />}
          iconBgColor={ExtendedColors.primaryAlpha10}
          title="Find Parking"
          subtitle="Discover verified spots near you"
          illustration={<MagnifyingGlassSvg width={100} height={80} primaryColor={colors.primary} />}
          stats={[
            { label: 'Spots nearby', value: statsLoading ? <View style={styles.statPlaceholder} /> : homeStats.spotsNearby },
            { label: 'Available now', value: statsLoading ? <View style={styles.statPlaceholder} /> : homeStats.available },
          ]}
          buttonText="Find Parking Now"
          buttonColor={colors.primary}
          onPressButton={() => router.push('/(find-space)')}
          cardBgColor="#FFFFFF"
        />

        {/* My Space Card */}
        <HomeCard
          icon={<CarFront size={20} color="#059669" strokeWidth={2} />}
          iconBgColor="rgba(5,150,105,0.10)"
          title="My Space"
          subtitle="Manage spaces & grow earnings"
          illustration={
            <Image
              source={require('../../assets/images/real-estate-sector_optimized_4500.jpg')}
              style={{ width: 100, height: 80, borderRadius: 14 }}
              resizeMode="cover"
            />
          }
          stats={[
            { label: "Today's earnings", value: statsLoading ? <View style={styles.statPlaceholder} /> : homeStats.todayEarnings },
            { label: 'Active bookings', value: statsLoading ? <View style={styles.statPlaceholder} /> : homeStats.activeBookings },
            { label: 'Spaces listed', value: statsLoading ? <View style={styles.statPlaceholder} /> : homeStats.spacesListed },
          ]}
          buttonText="Manage Spaces & Bookings"
          buttonColor="#059669"
          onPressButton={() => router.push('/(my-spaces)')}
          cardBgColor="#FFFFFF"
        />

        {/* Activity Feed Header */}
        <View style={styles.activityHeader}>
          <Text style={styles.activityTitle}>Recent Activity</Text>
          <TouchableOpacity onPress={() => router.push('/(home)/recent-activity')}>
            <Text style={styles.activitySeeAll}>See All</Text>
          </TouchableOpacity>
        </View>

        <ActivityFeed
          activities={recentActivities.map(a => ({
            ...a,
            onPress: () => router.push('/(home)/recent-activity'),
          }))}
          title=""
          isLoading={recentActivityLoading}
        />

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

// Static styles removed — replaced by useMemo makeStyles inside component

export default HomeScreen;
