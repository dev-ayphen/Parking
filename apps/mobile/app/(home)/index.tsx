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
  Image} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from "../../hooks/useTheme";
import { clearAuthData } from '../../utils/secureStorage';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useSessionBarStore } from '../../store/sessionBarStore';
import ProHeader from '../../components/Header/ProHeader';
import PersonalizedGreeting from '../../components/Home/PersonalizedGreeting';
import HomeCard from '../../components/Cards/HomeCard';
import ActivityFeed, { Activity } from '../../components/Activity/ActivityFeed';
import NavigationDrawer from '../../components/Navigation/NavigationDrawer';
import MagnifyingGlassSvg from '../../components/Illustrations/MagnifyingGlassSvg';
import { MapPin, CarFront } from 'lucide-react-native';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, ExtendedColors } from '../../theme';

// ── Helpers for session bar ────────────────────────────────────────────────────
const APPROVAL_WINDOW_MS = 120_000; // 2 minutes

function calcApprovalExpiry(createdAt: string) {
  return new Date(new Date(createdAt).getTime() + APPROVAL_WINDOW_MS).toISOString();
}

function etaMinText(etaIso: string | null) {
  if (!etaIso) return null;
  const mins = Math.round((new Date(etaIso).getTime() - Date.now()) / 60000);
  if (mins <= 0) return 'now';
  return mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h`;
}

const HomeScreen = () => {
  const router = useRouter();
  const theme = useTheme();
  const { colors, isDark } = theme;
  const currentUser = useAuthStore((s) => s.user);
  const setBar = useSessionBarStore((s) => s.setBar);
  const clearBar = useSessionBarStore((s) => s.clearBar);
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

  // ── Session bar: resolve active booking state on focus ────────────────
  const syncSessionBar = useCallback(async () => {
    if (!currentUser?.id) return;
    const role = currentUser.role; // 'PARKER' | 'OWNER' | undefined
    try {
      if (role === 'OWNER') {
        // Owner: check for pending requests + active sessions on their spaces
        const ownerData = await api.get('/home/owner-dashboard');
        const pending = ownerData.pendingRequests ?? [];
        const live = ownerData.liveSessions ?? [];

        if (pending.length > 0) {
          const req = pending[0];
          setBar({
            variant: pending.length > 1 ? 'new_request' : 'new_request',
            bookingId: String(req.id),
            spaceName: req.spaceName ?? '',
            vehiclePlate: req.vehicle?.licensePlate ?? req.parkerName ?? '',
            expiresAt: req.createdAt ? calcApprovalExpiry(req.createdAt) : null,
            endsAt: null,
            otp: null,
            etaText: null,
          });
          return;
        }

        if (live.length > 0) {
          const session = live[0];
          const endsAt = session.endsAt ?? null;
          const minsLeft = endsAt
            ? Math.max(0, Math.floor((new Date(endsAt).getTime() - Date.now()) / 60000))
            : null;
          setBar({
            variant: minsLeft !== null && minsLeft < 15 ? 'owner_session_ending' : 'owner_session_active',
            bookingId: String(session.id),
            spaceName: session.spaceName ?? '',
            vehiclePlate: '',
            expiresAt: null,
            endsAt,
            otp: null,
            etaText: null,
          });
          return;
        }

        clearBar();
      } else {
        // Parker: check for active/pending bookings
        const json = await api.get('/bookings/my?limit=10');
        const bookings: any[] = json.bookings ?? [];

        // Priority: ACTIVE > PENDING_APPROVAL > APPROVED
        const active = bookings.find((b: any) => b.status === 'ACTIVE');
        if (active) {
          const endsAt = active.endTime ?? null;
          const minsLeft = endsAt
            ? Math.max(0, Math.floor((new Date(endsAt).getTime() - Date.now()) / 60000))
            : null;
          setBar({
            variant: minsLeft !== null && minsLeft < 15 ? 'session_ending' : 'session_active',
            bookingId: String(active.id),
            spaceName: active.space?.name ?? '',
            vehiclePlate: active.vehicle?.licensePlate ?? '',
            expiresAt: null,
            endsAt,
            otp: active.sessionOtp ?? null,
            etaText: null,
          });
          return;
        }

        const pending = bookings.find((b: any) => b.status === 'PENDING_APPROVAL');
        if (pending) {
          setBar({
            variant: 'booking_pending',
            bookingId: String(pending.id),
            spaceName: pending.space?.name ?? '',
            vehiclePlate: '',
            expiresAt: pending.createdAt ? calcApprovalExpiry(pending.createdAt) : null,
            endsAt: null,
            otp: null,
            etaText: null,
          });
          return;
        }

        const approved = bookings.find((b: any) => b.status === 'APPROVED');
        if (approved) {
          setBar({
            variant: 'booking_approved',
            bookingId: String(approved.id),
            spaceName: approved.space?.name ?? '',
            vehiclePlate: '',
            expiresAt: null,
            endsAt: null,
            otp: null,
            etaText: null,
          });
          return;
        }

        clearBar();
      }
    } catch (e) {
      if (__DEV__) console.log('[HOME] session bar sync error', e);
    }
  }, [currentUser?.id, currentUser?.role, setBar, clearBar]);

  // Sync bar on every focus + 30s background poll
  useFocusEffect(
    useCallback(() => {
      syncSessionBar();
      const t = setInterval(syncSessionBar, 30_000);
      return () => clearInterval(t);
    }, [syncSessionBar])
  );

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
