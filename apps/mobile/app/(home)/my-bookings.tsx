import React, { useState, useEffect, useCallback } from 'react';
import {View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Platform,
  ActivityIndicator,
  DeviceEventEmitter} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Calendar, Clock, ChevronRight } from 'lucide-react-native';
import PageHeader from '../../components/PageHeader';
import { api } from '../../services/api';
import { NETWORK_RECONNECTED } from '../../store/networkStore';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, ExtendedColors } from '../../theme';

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
const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  PENDING_APPROVAL: { label: 'Waiting for approval', color: Colors.warning, bg: Colors.warningBgAlt },
  APPROVED: { label: 'Approved', color: Colors.success, bg: Colors.successBg },
  ACTIVE: { label: 'Active session', color: ExtendedColors.activeBlueText, bg: ExtendedColors.activeBlueBg },
  COMPLETED: { label: 'Completed', color: Colors.textBody, bg: Colors.surfaceBg },
  CANCELLED: { label: 'Cancelled', color: Colors.error, bg: Colors.errorBg },
  REJECTED: { label: 'Rejected', color: Colors.error, bg: Colors.errorBg },
  EXPIRED: { label: 'Expired', color: Colors.textSecondary, bg: Colors.surfaceBg },
};

const formatDate = (d: string) => {
  const date = new Date(d);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function MyBookingsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('Upcoming');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBookings = useCallback(async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      const json = await api.get('/bookings/my?limit=50');
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
      }
      setError(null);
    } catch (e) {
      if (__DEV__) console.log('[MY_BOOKINGS] error', e);
      // Distinguish "load failed" from "loaded but empty" — show retry, not "No bookings".
      setError((e as Error)?.message || 'Could not load your bookings.');
    } finally {
      isRefresh ? setRefreshing(false) : setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  // Live refresh when the owner approves/rejects or a session changes
  useEffect(() => {
    const events = ['booking:approved', 'booking:rejected', 'session:started', 'session:completed', 'notification:new', NETWORK_RECONNECTED];
    const subs = events.map((evt) => DeviceEventEmitter.addListener(evt, () => fetchBookings(true)));
    return () => subs.forEach((s) => s.remove());
  }, [fetchBookings]);

  const filteredBookings = bookings.filter((b) => b.status === activeTab);

  const renderBooking = ({ item }: { item: Booking }) => {
    const badge = STATUS_BADGE[item.rawStatus] || { label: item.rawStatus, color: Colors.textSecondary, bg: Colors.surfaceBg };
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
            <Calendar size={16} color={Colors.textSecondary} />
            <Text style={styles.detailText}>{item.date}</Text>
          </View>
          <View style={styles.detailItem}>
            <Clock size={16} color={Colors.textSecondary} />
            <Text style={styles.detailText}>{item.time}</Text>
          </View>
          <ChevronRight size={18} color={Colors.borderMuted} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <PageHeader title="My Bookings" onBack={() => router.back()} />

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
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.emptyState}>
          <Calendar size={64} color={Colors.error} />
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
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchBookings(true)} tintColor={Colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Calendar size={64} color={Colors.borderMuted} />
              <Text style={styles.emptyStateTitle}>No {activeTab} Bookings</Text>
              <Text style={styles.emptyStateDesc}>
                You don't have any {activeTab.toLowerCase()} parking bookings yet.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  tabsContainer: {
    flexDirection: 'row', backgroundColor: Colors.white, paddingHorizontal: Spacing.screenH,
    borderBottomWidth: 1, borderBottomColor: Colors.surfaceBg,
  },
  tab: { flex: 1, paddingVertical: Spacing['3xl'], alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: Colors.primary },
  tabText: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textSecondary },  // 14 = md ✓
  activeTabText: { color: Colors.primary },
  content: { padding: Spacing.screenH, paddingBottom: Spacing['7xl'] },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bookingCard: {
    backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing['3xl'], marginBottom: Spacing['3xl'],  // 16 = lg ✓
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  bookingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.xl },
  spaceName: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: Spacing.xs },  // 16 = xl ✓
  address: { fontSize: FontSize.md, color: Colors.textSecondary },  // 14 = md ✓
  price: { fontSize: FontSize['2xl'], fontWeight: FontWeight.bold, color: Colors.primary },  // 18 = 2xl ✓
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: Spacing.lg, paddingVertical: 5, borderRadius: BorderRadius.sm, marginBottom: Spacing.xl },  // 8 = sm ✓
  statusBadgeText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },  // 12 = sm ✓
  divider: { height: 1, backgroundColor: Colors.surfaceBg, marginBottom: Spacing.xl },
  bookingDetails: { flexDirection: 'row', justifyContent: 'space-between' },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  detailText: { fontSize: FontSize.md, color: Colors.textDark, fontWeight: FontWeight.medium },  // 14 = md ✓
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 64, paddingHorizontal: Spacing['4xl'] },
  emptyStateTitle: { fontSize: FontSize['2xl'], fontWeight: FontWeight.bold, color: Colors.textPrimary, marginTop: Spacing['3xl'], marginBottom: Spacing.md },  // 18 = 2xl ✓
  emptyStateDesc: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center' },  // 14 = md ✓
  retryBtn: { marginTop: Spacing['3xl'], paddingHorizontal: Spacing['4xl'], paddingVertical: Spacing.lg, backgroundColor: Colors.primaryBg, borderRadius: BorderRadius.lg },
  retryBtnText: { color: Colors.primary, fontWeight: FontWeight.bold, fontSize: FontSize.md },
});
