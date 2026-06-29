import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Platform,
  ToastAndroid,
  Alert,
  ActivityIndicator,
  RefreshControl,
  DeviceEventEmitter} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle, Download, ChevronDown, ChevronUp, MapPin, Star, TrendingUp, Calendar } from 'lucide-react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { PageHeader } from '../../components';
import ScreenLoader from '../../components/ScreenLoader';
import { api } from '../../services/api';
import { API_BASE } from '../../config/api.config';
import { getRatingStyle } from '../../utils/ratingUtils';
import { NETWORK_RECONNECTED } from '../../store/networkStore';
import { FontSize, FontWeight, BorderRadius, Spacing, ExtendedColors } from '../../theme';
import type { ColorsType } from '../../theme';
import { useTheme } from '../../hooks/useTheme';

interface HistorySession {
  id: string;
  name: string;
  phone: string;
  space: string;
  date: string;
  duration: string;
  amount: string;   // pre-formatted, e.g. "₹437"
  rating: number;
  review: string;
}

interface HistoryData {
  earnings: { today: number; thisWeek: number; thisMonth: number };
  breakdown: { name: string; earnings: number; count: number }[];
  sessions: HistorySession[];
}

const EMPTY: HistoryData = { earnings: { today: 0, thisWeek: 0, thisMonth: 0 }, breakdown: [], sessions: [] };

export default function HistoryScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [data, setData] = useState<HistoryData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const fetchHistory = useCallback(async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      const json = await api.get('/home/owner-history');
      if (json.success) {
        setData({
          earnings: json.earnings || EMPTY.earnings,
          breakdown: json.breakdown || [],
          sessions: json.sessions || [],
        });
      }
    } catch (e) {
      if (__DEV__) console.log('[OWNER_HISTORY] error', e);
    } finally {
      isRefresh ? setRefreshing(false) : setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    fetchHistory();
    DeviceEventEmitter.emit('sessionbar:suppress', true);
    return () => { DeviceEventEmitter.emit('sessionbar:suppress', false); };
  }, [fetchHistory]));
  useEffect(() => {
    // Refetch on a completed session, and also when connectivity is restored
    // (offline banner's "Retry" / auto-reconnect) so stale data is replaced.
    const events = ['session:completed', NETWORK_RECONNECTED];
    const subs = events.map((evt) => DeviceEventEmitter.addListener(evt, () => fetchHistory(true)));
    return () => subs.forEach((s) => s.remove());
  }, [fetchHistory]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const showToast = (message: string) => {
    if (Platform.OS === 'android') ToastAndroid.show(message, ToastAndroid.SHORT);
    else Alert.alert('Booking Details', message);
  };

  const downloadInvoice = async (bookingId: string) => {
    try {
      // Exchange session JWT for a short-lived (60s) single-use signed token.
      // The signed_token rides in the URL instead of the long-lived session JWT,
      // so even if it leaks into server logs it expires in 60 seconds and is
      // consumed on first use — the session JWT never appears in a URL.
      const { token: signedToken } = await api.post<{ token: string; expiresIn: number }>(
        `/bookings/${bookingId}/invoice-token`,
      );
      const url = `${API_BASE}/bookings/${bookingId}/invoice?signed_token=${signedToken}`;
      await Linking.openURL(url);
    } catch {
      Alert.alert('Error', 'Could not open invoice. Please try again.');
    }
  };

  const renderSession = useCallback(({ item }: { item: HistorySession }) => {
    const isExpanded = expandedIds.has(item.id);
    const shortId = `#${String(item.id).slice(-6).toUpperCase()}`;
    return (
      <TouchableOpacity
        style={styles.historyCard}
        activeOpacity={0.9}
        onPress={() => toggleExpand(item.id)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.statusBadge}>
            <CheckCircle size={14} color={colors.success} />
            <Text style={styles.statusText}>COMPLETED</Text>
          </View>
          <Text style={styles.bookingId}>ID: {shortId}</Text>
        </View>

        <View style={styles.detailsRow}>
          <View style={styles.detailCol}>
            <Text style={styles.label}>Parker</Text>
            <Text style={styles.value}>{item.name}</Text>
          </View>
          <View style={styles.detailCol}>
            <Text style={styles.label}>Space</Text>
            <Text style={styles.value}>{item.space}</Text>
          </View>
        </View>

        <View style={styles.dateTimeRow}>
          <Calendar size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
          <Text style={styles.dateText}>{item.date}</Text>
        </View>

        <View style={[styles.statsRow, !isExpanded && { borderBottomWidth: 0, marginBottom: 0 }]}>
          <View>
            <Text style={styles.label}>Duration</Text>
            <Text style={styles.statValue}>{item.duration}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.label}>Amount</Text>
            <Text style={styles.amountValue}>{item.amount}</Text>
          </View>
        </View>

        {isExpanded && (
          <View style={styles.expandedSection}>
            {item.rating > 0 && (
              <View style={styles.reviewBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: getRatingStyle(item.rating).bgColor, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.badge, alignSelf: 'flex-start', marginBottom: item.review ? Spacing.md : 0 }}>
                  {!getRatingStyle(item.rating).isNew && (
                    <Star size={14} color={getRatingStyle(item.rating).iconColor} fill={getRatingStyle(item.rating).iconColor} style={{ marginRight: 4 }} />
                  )}
                  <Text style={{ color: getRatingStyle(item.rating).textColor, fontSize: FontSize.base, fontWeight: FontWeight.bold }}>
                    {getRatingStyle(item.rating).label}
                  </Text>
                </View>
                {item.review ? <Text style={styles.reviewText}>"{item.review}"</Text> : null}
              </View>
            )}

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={(e) => {
                  e.stopPropagation();
                  showToast(`ID: ${shortId}\nParker: ${item.name}\nSpace: ${item.space}\nAmount: ${item.amount}\nDuration: ${item.duration}`);
                }}
              >
                <Text style={styles.actionBtnText}>View Details</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtnPrimary}
                onPress={(e) => {
                  e.stopPropagation();
                  downloadInvoice(item.id);
                }}
              >
                <Download size={16} color={colors.white} style={{ marginRight: 6 }} />
                <Text style={styles.actionBtnPrimaryText}>Invoice</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.expandIndicatorRow}>
          {isExpanded ? <ChevronUp size={20} color={colors.textMuted} /> : <ChevronDown size={20} color={colors.textMuted} />}
        </View>
      </TouchableOpacity>
    );
  }, [expandedIds, colors, styles, toggleExpand, showToast, downloadInvoice]);

  const listHeader = (
    <>
      <View style={styles.summaryContainer}>
        <Text style={[styles.sectionTitle, { marginBottom: Spacing['3xl'] }]}>Earnings Summary</Text>
        <View style={styles.metricsGrid}>
          <View style={styles.metricCardPrimary}>
            <Text style={styles.metricLabelLight}>This Month</Text>
            <Text style={styles.metricValueLight}>₹{data.earnings.thisMonth.toLocaleString('en-IN')}</Text>
            <Text style={styles.metricSubLight}>{data.sessions.length} sessions</Text>
          </View>
          <View style={styles.metricsColumn}>
            <View style={styles.metricCardSecondary}>
              <Text style={styles.metricLabel}>This Week</Text>
              <View style={styles.rowBetween}>
                <Text style={styles.metricValue}>₹{data.earnings.thisWeek.toLocaleString('en-IN')}</Text>
                <TrendingUp size={16} color={colors.successAlt} />
              </View>
            </View>
            <View style={styles.metricCardSecondary}>
              <Text style={styles.metricLabel}>Today</Text>
              <Text style={styles.metricValue}>₹{data.earnings.today.toLocaleString('en-IN')}</Text>
            </View>
          </View>
        </View>
        {data.breakdown.length > 0 && (
          <>
            <Text style={styles.subHeading}>Breakdown by Space</Text>
            {data.breakdown.map((item, index) => (
              <View key={index} style={styles.breakdownRow}>
                <View style={styles.breakdownLeft}>
                  <MapPin size={16} color={colors.textSecondary} />
                  <Text style={styles.breakdownName}>{item.name}</Text>
                </View>
                <View style={styles.breakdownRight}>
                  <Text style={styles.breakdownAmount}>₹{item.earnings.toLocaleString('en-IN')}</Text>
                  <Text style={styles.breakdownSessions}>{item.count} session{item.count !== 1 ? 's' : ''}</Text>
                </View>
              </View>
            ))}
          </>
        )}
      </View>
      <View style={styles.divider} />
      <View style={styles.historySection}>
        <View style={styles.historyHeader}>
          <Text style={styles.sectionTitle}>Completed Sessions</Text>
        </View>
      </View>
    </>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <PageHeader title="Earnings & History" onBack={() => router.replace('/(my-spaces)')} />
        <ScreenLoader fullScreen message="Loading history…" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <PageHeader title="Earnings & History" onBack={() => router.replace('/(my-spaces)')} />

      <FlatList
        style={styles.container}
        data={data.sessions}
        keyExtractor={(item) => item.id}
        renderItem={renderSession}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <View style={[styles.emptyBox, { paddingHorizontal: Spacing['3xl'] }]}>
            <Calendar size={48} color={colors.borderMuted} strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No completed sessions yet</Text>
            <Text style={styles.emptyDesc}>Completed parking sessions will appear here with earnings and ratings.</Text>
          </View>
        }
        ListFooterComponent={<View style={{ height: 100 }} />}
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchHistory(true)} tintColor={colors.primary} colors={[colors.primary]} />}
        contentContainerStyle={{ paddingHorizontal: Spacing['3xl'] }}
      />
    </SafeAreaView>
  );
}

const makeStyles = (colors: ColorsType) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.white },
  container: { flex: 1, backgroundColor: colors.white },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.screenBg },
  summaryContainer: { paddingHorizontal: Spacing['3xl'], paddingVertical: Spacing['3xl'], backgroundColor: colors.screenBg },
  sectionTitle: { fontSize: FontSize['2xl'], fontWeight: FontWeight.extrabold, color: colors.textPrimary },  // 18 = 2xl ✓
  metricsGrid: { flexDirection: 'row', gap: Spacing.lg, marginBottom: Spacing.screenH },
  metricCardPrimary: { flex: 1, backgroundColor: colors.textPrimary, borderRadius: BorderRadius.lg, padding: Spacing.screenH, justifyContent: 'center' },  // 16 = lg ✓
  metricLabelLight: { color: colors.textMuted, fontSize: FontSize.base, marginBottom: Spacing.md },  // 13 = base ✓
  metricValueLight: { color: colors.white, fontSize: FontSize['7xl'], fontWeight: FontWeight.extrabold, marginBottom: Spacing.xs },  // 32 = 7xl ✓
  metricSubLight: { color: colors.borderMuted, fontSize: FontSize.base },  // 13 = base ✓
  metricsColumn: { flex: 1, gap: Spacing.xl },
  metricCardSecondary: { backgroundColor: colors.screenBg, borderRadius: BorderRadius.lg, padding: Spacing['3xl'], borderWidth: 1, borderColor: colors.border },  // 16 = lg ✓
  metricLabel: { color: colors.textSecondary, fontSize: FontSize.sm, marginBottom: Spacing.xs },  // 12 = sm ✓
  metricValue: { color: colors.textPrimary, fontSize: FontSize['3xl'], fontWeight: FontWeight.bold },  // 20 = 3xl ✓
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subHeading: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: colors.textBody, marginBottom: Spacing.xl },  // 14 = md ✓
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.xl, borderBottomWidth: 1, borderBottomColor: colors.surfaceBg },
  breakdownLeft: { flexDirection: 'row', alignItems: 'center' },
  breakdownName: { marginLeft: Spacing.md, fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: colors.textDark },  // 14 = md ✓
  breakdownRight: { alignItems: 'flex-end' },
  breakdownAmount: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: colors.textPrimary },  // 14 = md ✓
  breakdownSessions: { fontSize: FontSize.sm, color: colors.textMuted },  // 12 = sm ✓
  divider: { height: 1, backgroundColor: colors.surfaceBg, marginHorizontal: Spacing['3xl'] },
  historySection: { paddingHorizontal: Spacing['3xl'], paddingTop: Spacing['3xl'] },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing['3xl'] },
  emptyBox: { alignItems: 'center', paddingVertical: 50, paddingHorizontal: Spacing['4xl'], gap: Spacing.lg },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: colors.textPrimary, marginTop: Spacing.sm },  // 16 = xl ✓
  emptyDesc: { fontSize: FontSize.base, color: colors.textSecondary, textAlign: 'center', lineHeight: 19 },  // 13 = base ✓
  historyCard: { backgroundColor: colors.white, borderRadius: BorderRadius.lg, padding: Spacing['3xl'], marginBottom: Spacing['3xl'], shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },  // 16 = lg ✓
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.successBg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.sm },  // 8 = sm ✓
  statusText: { marginLeft: Spacing.xs, fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: colors.success },  // 11 = xs ✓
  bookingId: { fontSize: FontSize.sm, color: colors.textMuted, fontWeight: FontWeight.medium },  // 12 = sm ✓
  detailsRow: { flexDirection: 'row', marginBottom: Spacing.md },
  detailCol: { flex: 1 },
  label: { fontSize: FontSize.xs, color: colors.textSecondary, marginBottom: Spacing.micro },  // 11 = xs ✓
  value: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: colors.textPrimary },  // 13 = base ✓
  dateTimeRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.screenBg, padding: Spacing.md, borderRadius: BorderRadius.sm, marginBottom: Spacing.lg },  // 8 = sm ✓
  dateText: { fontSize: FontSize.sm, color: colors.textBody, fontWeight: FontWeight.medium },  // 12 = sm ✓
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.surfaceBg, borderBottomWidth: 1, borderBottomColor: colors.surfaceBg, paddingVertical: Spacing.lg, marginBottom: 0 },
  statValue: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: colors.textPrimary },  // 14 = md ✓
  amountValue: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold, color: ExtendedColors.skyBlue },  // 16 = xl ✓, '#0EA5E9' ✓
  reviewBox: { backgroundColor: colors.warningBgAlt, padding: Spacing.lg, borderRadius: BorderRadius.sm, marginBottom: Spacing.xl },  // 8 = sm ✓
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  ratingText: { fontSize: FontSize.sm, color: ExtendedColors.warningAmber, fontWeight: FontWeight.semibold, marginLeft: Spacing.md },  // 12 = sm ✓, '#92400E' ✓
  reviewText: { fontSize: FontSize.base, color: ExtendedColors.warningAmber, fontStyle: 'italic' },  // 13 = base ✓
  expandedSection: { marginTop: Spacing.lg },
  expandIndicatorRow: { alignItems: 'center', justifyContent: 'center', marginTop: Spacing.md, borderTopWidth: 1, borderTopColor: colors.surfaceBg, paddingTop: Spacing.sm },
  actionsRow: { flexDirection: 'row', gap: Spacing.xl },
  actionBtn: { flex: 1, paddingVertical: Spacing.lg, alignItems: 'center', borderRadius: BorderRadius.sm, backgroundColor: colors.surfaceBg },  // 8 = sm ✓
  actionBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: colors.textBody },  // 13 = base ✓
  actionBtnPrimary: { flex: 1, flexDirection: 'row', paddingVertical: Spacing.lg, alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.sm, backgroundColor: colors.textDark },  // 8 = sm ✓, '#334155' ✓
  actionBtnPrimaryText: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: colors.white },  // 13 = base ✓
});
