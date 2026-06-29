import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Platform,
  ActivityIndicator,
  Alert,
  DeviceEventEmitter} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Calendar, Clock, ChevronRight, Download } from 'lucide-react-native';
import * as Linking from 'expo-linking';
import PageHeader from '../../components/PageHeader';
import { api } from '../../services/api';
import { API_BASE } from '../../config/api.config';
import { NETWORK_RECONNECTED, useNetworkStore } from '../../store/networkStore';
import { FontSize, FontWeight, BorderRadius, Spacing, ExtendedColors } from '../../theme';
import type { ColorsType } from '../../theme';
import { useTheme } from '../../hooks/useTheme';

interface Booking {
  id: string;
  spaceName: string;
  address: string;
  date: string;
  time: string;
  status: string;     // mapped tab bucket: Upcoming | Completed | Cancelled
  rawStatus: string;  // raw backend status
  price: string;
}

const STATUS_MAP: Record<string, string> = {
  PENDING_APPROVAL: 'Upcoming',
  APPROVED: 'Upcoming',
  ACTIVE: 'Upcoming',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  REJECTED: 'Cancelled',
  EXPIRED: 'Cancelled',
};

// Per-card status badge styling, keyed on raw backend status
const makeStatusBadge = (colors: ColorsType): Record<string, { label: string; color: string; bg: string }> => ({
  PENDING_APPROVAL: { label: 'Waiting for approval', color: colors.warning, bg: colors.warningBgAlt },
  APPROVED: { label: 'Approved', color: colors.success, bg: colors.successBg },
  ACTIVE: { label: 'Active session', color: ExtendedColors.activeBlueText, bg: ExtendedColors.activeBlueBg },
  COMPLETED: { label: 'Completed', color: colors.textBody, bg: colors.surfaceBg },
  CANCELLED: { label: 'Cancelled', color: colors.error, bg: colors.errorBg },
  REJECTED: { label: 'Rejected', color: colors.error, bg: colors.errorBg },
  EXPIRED: { label: 'Expired', color: colors.textSecondary, bg: colors.surfaceBg },
});

const formatDate = (d: string) => {
  const date = new Date(d);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function MyBookingsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const STATUS_BADGE = useMemo(() => makeStatusBadge(colors), [colors]);
  const [activeTab, setActiveTab] = useState('Upcoming');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const LIMIT = 50;

  const fetchBookings = useCallback(async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      const json = await api.get(`/bookings/my?limit=${LIMIT}&skip=0`);
      if (json.success) {
        const mapped: Booking[] = (json.bookings || []).map((b: any) => ({
          id: String(b.id),
          spaceName: b.space?.name || 'Unknown Space',
          address: b.space?.address || '',
          date: formatDate(b.createdAt),
          time: `${b.duration || 1}h`,
          status: STATUS_MAP[b.status] || b.status,
          rawStatus: b.status,
          price: `₹${b.totalAmount || 0}`,
        }));
        setBookings(mapped);
        setTotal(json.total || 0);
        setSkip(LIMIT);
      }
      setError(null);
    } catch (e) {
      if (__DEV__) console.log('[MY_BOOKINGS] error', e);
      setError((e as Error)?.message || 'Could not load your bookings.');
    } finally {
      isRefresh ? setRefreshing(false) : setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore || skip >= total) return;
    try {
      setLoadingMore(true);
      const json = await api.get(`/bookings/my?limit=${LIMIT}&skip=${skip}`);
      if (json.success) {
        const mapped: Booking[] = (json.bookings || []).map((b: any) => ({
          id: String(b.id),
          spaceName: b.space?.name || 'Unknown Space',
          address: b.space?.address || '',
          date: formatDate(b.createdAt),
          time: `${b.duration || 1}h`,
          status: STATUS_MAP[b.status] || b.status,
          rawStatus: b.status,
          price: `₹${b.totalAmount || 0}`,
        }));
        setBookings((prev) => [...prev, ...mapped]);
        setSkip((prev) => prev + LIMIT);
      }
    } catch (e) {
      if (__DEV__) console.log('[MY_BOOKINGS] loadMore error', e);
    } finally {
      setLoadingMore(false);
    }
  }, [skip, total, loadingMore]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  // Live refresh when the owner approves/rejects or a session changes
  useEffect(() => {
    const events = ['booking:approved', 'booking:rejected', 'session:started', 'session:completed', 'notification:new', NETWORK_RECONNECTED];
    const subs = events.map((evt) => DeviceEventEmitter.addListener(evt, () => fetchBookings(true)));
    return () => subs.forEach((s) => s.remove());
  }, [fetchBookings]);

  const downloadInvoice = async (bookingId: string) => {
    if (!useNetworkStore.getState().requireOnline()) return;
    try {
      setDownloadingId(bookingId);
      const { token: signedToken } = await api.post<{ token: string; expiresIn: number }>(
        `/bookings/${bookingId}/invoice-token`,
      );
      const url = `${API_BASE}/bookings/${bookingId}/invoice?signed_token=${signedToken}`;
      await Linking.openURL(url);
    } catch {
      Alert.alert('Error', 'Could not open invoice. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };

  const filteredBookings = bookings.filter((b) => b.status === activeTab);

  const renderBooking = ({ item }: { item: Booking }) => {
    const badge = STATUS_BADGE[item.rawStatus] || { label: item.rawStatus, color: colors.textSecondary, bg: colors.surfaceBg };
    return (
      <TouchableOpacity
        style={styles.bookingCard}
        activeOpacity={0.7}
        onPress={() =>
          item.rawStatus === 'COMPLETED'
            ? router.push({ pathname: '/(find-space)/session-complete', params: { bookingId: item.id } })
            : router.push({ pathname: '/(find-space)/booking-status', params: { bookingId: item.id } })
        }
      >
        <View style={styles.bookingHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.spaceName}>{item.spaceName}</Text>
            <Text style={styles.address}>{item.address}</Text>
          </View>
          <Text style={styles.price}>{item.price}</Text>
        </View>

        {/* Status badge */}
        <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.statusBadgeText, { color: badge.color }]}>{badge.label}</Text>
        </View>

        <View style={styles.divider} />
        <View style={styles.bookingDetails}>
          <View style={styles.detailItem}>
            <Calendar size={16} color={colors.textSecondary} />
            <Text style={styles.detailText}>{item.date}</Text>
          </View>
          <View style={styles.detailItem}>
            <Clock size={16} color={colors.textSecondary} />
            <Text style={styles.detailText}>{item.time}</Text>
          </View>
          <ChevronRight size={18} color={colors.borderMuted} />
        </View>

        {item.rawStatus === 'COMPLETED' && (
          <TouchableOpacity
            style={styles.invoiceBtn}
            onPress={(e) => { e.stopPropagation?.(); downloadInvoice(item.id); }}
            disabled={downloadingId === item.id}
            activeOpacity={0.75}
          >
            {downloadingId === item.id
              ? <ActivityIndicator size="small" color={colors.primary} />
              : <Download size={14} color={colors.primary} strokeWidth={2} />}
            <Text style={styles.invoiceBtnText}>Download Invoice</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <PageHeader title="My Bookings" onBack={() => router.replace('/(home)')} />

      <View style={styles.tabsContainer}>
        {['Upcoming', 'Completed', 'Cancelled'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.emptyState}>
          <Calendar size={64} color={colors.error} />
          <Text style={styles.emptyStateTitle}>Couldn't load bookings</Text>
          <Text style={styles.emptyStateDesc}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchBookings()}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredBookings}
          renderItem={renderBooking}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchBookings(true)} tintColor={colors.primary} />
          }
          onEndReached={() => loadMore()}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Calendar size={64} color={colors.borderMuted} />
              <Text style={styles.emptyStateTitle}>No {activeTab} Bookings</Text>
              <Text style={styles.emptyStateDesc}>
                You don't have any {activeTab.toLowerCase()} parking bookings yet.
              </Text>
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.loadingMoreContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingMoreText}>Loading more bookings...</Text>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors: ColorsType) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  tabsContainer: {
    flexDirection: 'row', backgroundColor: colors.white, paddingHorizontal: Spacing.screenH,
    borderBottomWidth: 1, borderBottomColor: colors.surfaceBg,
  },
  tab: { flex: 1, paddingVertical: Spacing['3xl'], alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: colors.primary },
  tabText: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: colors.textSecondary },  // 14 = md ✓
  activeTabText: { color: colors.primary },
  content: { padding: Spacing.screenH, paddingBottom: Spacing['7xl'] },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bookingCard: {
    backgroundColor: colors.white, borderRadius: BorderRadius.lg, padding: Spacing['3xl'], marginBottom: Spacing['3xl'],  // 16 = lg ✓
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  bookingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.xl },
  spaceName: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: colors.textPrimary, marginBottom: Spacing.xs },  // 16 = xl ✓
  address: { fontSize: FontSize.md, color: colors.textSecondary },  // 14 = md ✓
  price: { fontSize: FontSize['2xl'], fontWeight: FontWeight.bold, color: colors.primary },  // 18 = 2xl ✓
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: Spacing.lg, paddingVertical: 5, borderRadius: BorderRadius.sm, marginBottom: Spacing.xl },  // 8 = sm ✓
  statusBadgeText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },  // 12 = sm ✓
  divider: { height: 1, backgroundColor: colors.surfaceBg, marginBottom: Spacing.xl },
  bookingDetails: { flexDirection: 'row', justifyContent: 'space-between' },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  detailText: { fontSize: FontSize.md, color: colors.textDark, fontWeight: FontWeight.medium },  // 14 = md ✓
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 64, paddingHorizontal: Spacing['4xl'] },
  emptyStateTitle: { fontSize: FontSize['2xl'], fontWeight: FontWeight.bold, color: colors.textPrimary, marginTop: Spacing['3xl'], marginBottom: Spacing.md },  // 18 = 2xl ✓
  emptyStateDesc: { fontSize: FontSize.md, color: colors.textSecondary, textAlign: 'center' },  // 14 = md ✓
  retryBtn: { marginTop: Spacing['3xl'], paddingHorizontal: Spacing['4xl'], paddingVertical: Spacing.lg, backgroundColor: colors.primaryBg, borderRadius: BorderRadius.lg },
  retryBtnText: { color: colors.primary, fontWeight: FontWeight.bold, fontSize: FontSize.md },
  loadingMoreContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing['3xl'], gap: Spacing.md },
  loadingMoreText: { fontSize: FontSize.md, color: colors.textSecondary, marginLeft: Spacing.md },
  invoiceBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, marginTop: Spacing.lg, paddingVertical: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.primaryBg },
  invoiceBtnText: { fontSize: FontSize.sm, color: colors.primary, fontWeight: FontWeight.semibold },
});
