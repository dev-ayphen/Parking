import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  DeviceEventEmitter} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { TrendingDown, Calendar, Car, Star, CheckCircle2, Clock } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import PageHeader from '../../components/PageHeader';
import { api } from '../../services/api';
import { NETWORK_RECONNECTED } from '../../store/networkStore';
import { FontSize, FontWeight, BorderRadius, Spacing, ExtendedColors } from '../../theme';
import type { ColorsType } from '../../theme';
import { useTheme } from '../../hooks/useTheme';

interface Analytics {
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  pendingBookings: number;
  activeBookings: number;
  totalRevenue: number;
  thisMonthRevenue: number;
  thisWeekRevenue: number;
  todayRevenue: number;
  avgDurationHours: number;
  occupancyPct: number;
  avgRating: number;
  ratingCount: number;
  spaceName: string;
  hourlyRate: number;
}

const inr = (n: number) => `₹${(n || 0).toLocaleString('en-IN')}`;
const monthLabel = new Date().toLocaleDateString('en-IN', { month: 'long' });

const AnalyticsScreen = () => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const params = useLocalSearchParams();
  const spaceId = params.spaceId as string;
  const spaceName = (params.spaceName as string) || 'Space Analytics';

  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const fetchAnalytics = useCallback(async (isRefresh = false) => {
    if (!spaceId) { setLoading(false); setError(true); return; }
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      const res = await api.get(`/spaces/${spaceId}/analytics`);
      if (res?.success) { setData(res); setError(false); }
      else setError(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [spaceId]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  useFocusEffect(useCallback(() => {
    DeviceEventEmitter.emit('sessionbar:suppress', true);
    return () => { DeviceEventEmitter.emit('sessionbar:suppress', false); };
  }, []));

  // Re-fetch when connectivity is restored (offline banner's "Retry" / auto-
  // reconnect) so the analytics aren't left showing stale data.
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(NETWORK_RECONNECTED, () => fetchAnalytics(true));
    return () => sub.remove();
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <PageHeader title="Analytics" onBack={() => router.replace('/(my-spaces)')} />
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView style={styles.container}>
        <PageHeader title="Analytics" onBack={() => router.replace('/(my-spaces)')} />
        <View style={styles.center}>
          <Text style={styles.errorText}>Couldn&apos;t load analytics.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchAnalytics()}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const hasBookings = data.totalBookings > 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <PageHeader title="Analytics" onBack={() => router.replace('/(my-spaces)')} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchAnalytics(true)} tintColor={colors.primary} />}
      >
        <Text style={styles.spaceNameLabel} numberOfLines={1}>{data.spaceName || spaceName}</Text>

        {/* Hero Revenue Card — all real */}
        <LinearGradient colors={[colors.textPrimary, ExtendedColors.darkCard]} style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <Text style={styles.heroLabel}>Revenue ({monthLabel})</Text>
          </View>
          <Text style={styles.heroValue}>{inr(data.thisMonthRevenue)}</Text>
          <Text style={styles.heroSubtext}>Lifetime: {inr(data.totalRevenue)}</Text>
          <View style={styles.heroDivider} />
          <View style={styles.heroFooter}>
            <View style={styles.heroFooterItem}>
              <Text style={styles.heroFooterLabel}>This Week</Text>
              <Text style={styles.heroFooterValue}>{inr(data.thisWeekRevenue)}</Text>
            </View>
            <View style={styles.heroFooterDivider} />
            <View style={styles.heroFooterItem}>
              <Text style={styles.heroFooterLabel}>Today</Text>
              <Text style={styles.heroFooterValue}>{inr(data.todayRevenue)}</Text>
            </View>
          </View>
        </LinearGradient>

        <Text style={styles.sectionTitle}>Performance Metrics</Text>

        {/* Stats Grid — all real */}
        <View style={styles.statsGrid}>
          <View style={styles.statsCard}>
            <View style={[styles.statsIconWrapper, { backgroundColor: ExtendedColors.analyticsBg }]}>
              <Calendar size={18} color={colors.textBody} />
            </View>
            <View>
              <Text style={styles.statsLabel}>Total Bookings</Text>
              <Text style={styles.statsValue}>{data.totalBookings}</Text>
            </View>
          </View>

          <View style={styles.statsCard}>
            <View style={[styles.statsIconWrapper, { backgroundColor: colors.successBgAlt }]}>
              <Car size={18} color={colors.successAlt} />
            </View>
            <View>
              <Text style={styles.statsLabel}>Occupancy</Text>
              <Text style={styles.statsValue}>{data.occupancyPct}%</Text>
            </View>
          </View>

          <View style={styles.statsCard}>
            <View style={[styles.statsIconWrapper, { backgroundColor: colors.warningBg }]}>
              <Star size={18} color={colors.warning} />
            </View>
            <View>
              <Text style={styles.statsLabel}>Avg Rating</Text>
              <Text style={styles.statsValue}>
                {data.ratingCount > 0
                  ? <>{data.avgRating}<Text style={{ fontSize: FontSize.sm, color: colors.textSecondary }}> /5</Text></>
                  : <Text style={{ fontSize: FontSize.md, color: colors.textSecondary }}>New</Text>}
              </Text>
            </View>
          </View>

          <View style={styles.statsCard}>
            <View style={[styles.statsIconWrapper, { backgroundColor: colors.infoBg }]}>
              <Clock size={18} color={colors.info} />
            </View>
            <View>
              <Text style={styles.statsLabel}>Avg Duration</Text>
              <Text style={styles.statsValue}>{data.avgDurationHours}h</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Booking Breakdown</Text>

        {/* Real status breakdown (replaces the old fake activity feed) */}
        <View style={styles.activityCard}>
          {hasBookings ? (
            <>
              <BreakdownRow styles={styles} icon={<CheckCircle2 size={14} color={colors.successAlt} />} bg={colors.successBgAlt} label="Completed" value={data.completedBookings} />
              <View style={styles.divider} />
              <BreakdownRow styles={styles} icon={<Clock size={14} color={colors.warning} />} bg={colors.warningBg} label="Active / Upcoming" value={data.activeBookings} />
              <View style={styles.divider} />
              <BreakdownRow styles={styles} icon={<Calendar size={14} color={colors.info} />} bg={colors.infoBg} label="Pending Requests" value={data.pendingBookings} />
              <View style={styles.divider} />
              <BreakdownRow styles={styles} icon={<TrendingDown size={14} color={colors.error} />} bg={colors.errorBg} label="Cancelled / Rejected" value={data.cancelledBookings} />
            </>
          ) : (
            <View style={styles.emptyBox}>
              <Calendar size={28} color={colors.borderLight} />
              <Text style={styles.emptyText}>No bookings yet. Stats will appear as parkers book this space.</Text>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const BreakdownRow = ({ styles, icon, bg, label, value }: { styles: ReturnType<typeof makeStyles>; icon: React.ReactNode; bg: string; label: string; value: number }) => (
  <View style={styles.activityRow}>
    <View style={[styles.activityIcon, { backgroundColor: bg }]}>{icon}</View>
    <View style={styles.activityInfo}>
      <Text style={styles.activityTitle}>{label}</Text>
    </View>
    <Text style={styles.activityAmount}>{value}</Text>
  </View>
);

const makeStyles = (colors: ColorsType) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing['3xl'] },
  errorText: { fontSize: FontSize.md, color: colors.textSecondary, marginBottom: Spacing.xl },
  retryBtn: { backgroundColor: colors.primaryLight, paddingHorizontal: Spacing['4xl'], paddingVertical: Spacing.xl, borderRadius: BorderRadius.button },
  retryBtnText: { color: colors.primary, fontWeight: FontWeight.bold, fontSize: FontSize.md },
  spaceNameLabel: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: colors.textPrimary, marginBottom: Spacing.xl },
  emptyBox: { alignItems: 'center', paddingVertical: Spacing['4xl'], gap: Spacing.md },
  emptyText: { fontSize: FontSize.sm, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: Spacing['3xl'], lineHeight: 18 },
  content: {
    padding: Spacing['3xl'],
  },
  heroCard: {
    padding: Spacing['3xl'],
    borderRadius: BorderRadius.lg,                  // 16 = lg ✓
    marginBottom: Spacing.screenH,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  heroLabel: {
    color: colors.textMuted,
    fontSize: FontSize.sm,                          // 12 = sm ✓
    fontWeight: FontWeight.semibold,
    letterSpacing: 0,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ExtendedColors.successAlpha,   // 'rgba(16,185,129,0.15)' ✓
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.md,                  // 12 = md ✓
    gap: Spacing.xs,
  },
  trendText: {
    color: colors.successAlt,
    fontSize: FontSize.xs,                          // 11 = xs ✓
    fontWeight: FontWeight.bold,
  },
  heroValue: {
    fontSize: FontSize['7xl'],                      // 32 = 7xl ✓
    fontWeight: FontWeight.extrabold,
    color: '#FFFFFF',
    letterSpacing: -1,
    marginBottom: Spacing.micro,
  },
  heroSubtext: {
    color: ExtendedColors.indigoTint,               // '#E0E7FF' ✓
    fontSize: FontSize.xs,                          // 11 = xs ✓
  },
  heroDivider: {
    height: 1,
    backgroundColor: ExtendedColors.whiteAlpha10,   // 'rgba(255,255,255,0.1)' ✓
    marginVertical: Spacing.xl,
  },
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroFooterItem: {
    flex: 1,
  },
  heroFooterLabel: {
    color: colors.textMuted,
    fontSize: FontSize.xs,                          // 11 = xs ✓
    marginBottom: Spacing.micro,
  },
  heroFooterValue: {
    color: '#FFFFFF',
    fontSize: FontSize.xl,                          // 16 = xl ✓
    fontWeight: FontWeight.bold,
  },
  heroFooterDivider: {
    width: 1,
    height: 24,
    backgroundColor: ExtendedColors.whiteAlpha10,   // 'rgba(255,255,255,0.1)' ✓
    marginHorizontal: Spacing['3xl'],
  },
  sectionTitle: {
    fontSize: FontSize.lg,                          // 15 = lg ✓
    fontWeight: FontWeight.bold,
    color: colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xl,
    marginBottom: Spacing.screenH,
  },
  statsCard: {
    width: '48%',
    backgroundColor: colors.white,
    padding: Spacing['2xl'],
    borderRadius: BorderRadius.md,                  // 12 = md ✓
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xl,
  },
  statsIconWrapper: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.sm,                  // 8 = sm ✓
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsLabel: {
    fontSize: FontSize.xs,                          // 11 = xs ✓
    color: colors.textSecondary,
    marginBottom: 1,
  },
  statsValue: {
    fontSize: FontSize.xl,                          // 16 = xl ✓
    fontWeight: FontWeight.extrabold,
    color: colors.textPrimary,
  },
  activityCard: {
    backgroundColor: colors.white,
    borderRadius: BorderRadius.lg,                  // 16 = lg ✓
    borderWidth: 1,
    borderColor: colors.border,
    padding: Spacing['3xl'],
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,                  // 8 = sm ✓
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityInfo: {
    flex: 1,
    marginLeft: Spacing.xl,
  },
  activityTitle: {
    fontSize: FontSize.md,                          // 14 = md ✓
    fontWeight: FontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: Spacing.micro,
  },
  activityTime: {
    fontSize: FontSize.sm,                          // 12 = sm ✓
    color: colors.textSecondary,
  },
  activityAmount: {
    fontSize: FontSize.md,                          // 14 = md ✓
    fontWeight: FontWeight.bold,
    color: colors.successAlt,
  },
  divider: {
    height: 1,
    backgroundColor: colors.surfaceBg,
    marginVertical: Spacing.xl,
  },
});

export default AnalyticsScreen;
