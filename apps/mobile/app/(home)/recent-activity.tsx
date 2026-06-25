import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, StatusBar, TouchableOpacity,
  FlatList, RefreshControl, ActivityIndicator, Modal, Pressable,
  DeviceEventEmitter,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Car, IndianRupee, CalendarCheck, Clock, XCircle, AlertCircle } from 'lucide-react-native';

const ICON_CONFIG: Record<string, { Icon: any; color: string; bg: string }> = {
  booking:  { Icon: Car,           color: '#3B82F6', bg: '#EFF6FF' },
  payment:  { Icon: IndianRupee,   color: '#10B981', bg: '#ECFDF5' },
  approval: { Icon: CalendarCheck, color: '#F59E0B', bg: '#FFFBEB' },
};

const iconForItem = (type: 'Parking' | 'Earnings', status: string) => {
  if (type === 'Earnings') return ICON_CONFIG.payment;
  if (status === 'Pending' || status === 'Approved') return ICON_CONFIG.approval;
  return ICON_CONFIG.booking;
};
import { PageHeader } from '../../components';
import NoActivitySvg from '../../components/Illustrations/NoActivitySvg';
import { api } from '../../services/api';
import { NETWORK_RECONNECTED } from '../../store/networkStore';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, ExtendedColors } from '../../theme';

interface Activity {
  id: string;
  location: string;
  status: string;
  statusTitle: string;
  time: string;
  amount: string | null;
  type: 'Parking' | 'Earnings';
  // Extra fields for detail modal
  shortId: string;
  requestedAt: string;
  vehicle: string;
  price: string;
  etaLabel: string;
  rawCreatedAt: string;
}

const formatTime = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

// Descriptive title matching the home feed (e.g. "Parking Completed").
const titleForStatus = (rawStatus: string): string => {
  switch (rawStatus) {
    case 'COMPLETED': return 'Parking Completed';
    case 'ACTIVE': return 'Parking Active';
    case 'PENDING_APPROVAL': return 'Awaiting Approval';
    case 'APPROVED': return 'Booking Approved';
    case 'CANCELLED': return 'Booking Cancelled';
    case 'REJECTED': return 'Booking Rejected';
    case 'EXPIRED': return 'Request Expired';
    default: return 'Parking Booked';
  }
};

const mapStatus = (status: string) => {
  switch (status) {
    case 'ACTIVE': return 'Active';
    case 'COMPLETED': return 'Completed';
    case 'CANCELLED': return 'Cancelled';
    case 'APPROVED': return 'Approved';
    case 'PENDING_APPROVAL': return 'Pending';
    case 'REJECTED': return 'Rejected';
    case 'EXPIRED': return 'Expired';
    default: return status;
  }
};

// Statuses that get a quick modal instead of a full screen
const MODAL_STATUSES = ['Expired', 'Rejected', 'Cancelled'];

const RecentActivityScreen = () => {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState('All');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalItem, setModalItem] = useState<Activity | null>(null);

  const filters = ['All', 'Parking', 'Earnings'];

  const fetchActivities = useCallback(async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      const json = await api.get('/bookings/my?limit=20');
      if (json.success) {
        const fmtTimeOfDay = (iso: string) =>
          new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

        const etaMinLabel = (etaIso: string, createdIso: string) => {
          const mins = Math.round((new Date(etaIso).getTime() - new Date(createdIso).getTime()) / 60000);
          if (mins <= 0) return '-';
          if (mins < 60) return `${mins} mins`;
          return `${Math.floor(mins / 60)}h ${mins % 60 > 0 ? `${mins % 60}m` : ''}`.trim();
        };

        const mapped: Activity[] = (json.bookings || []).map((b: any) => {
          const status = mapStatus(b.status);
          const isEarning = b.status === 'COMPLETED' && b.totalAmount > 0;
          const plate = b.vehicle?.licensePlate || '-';
          const vtype = b.vehicle?.vehicleType || '';
          return {
            id: String(b.id),
            location: b.space?.name || b.space?.address || 'Unknown Space',
            status,
            statusTitle: titleForStatus(b.status),
            time: formatTime(b.createdAt),
            amount: isEarning ? `₹${b.totalAmount}` : null,
            type: isEarning ? 'Earnings' : 'Parking',
            shortId: `#${String(b.id).slice(-6).toUpperCase()}`,
            requestedAt: b.createdAt ? fmtTimeOfDay(b.createdAt) : '-',
            rawCreatedAt: b.createdAt || '',
            vehicle: vtype ? `${plate} (${vtype})` : plate,
            price: b.space?.hourlyRate ? `₹${b.space.hourlyRate}/hr` : (b.totalAmount ? `₹${b.totalAmount}` : '-'),
            etaLabel: b.eta && b.createdAt ? etaMinLabel(b.eta, b.createdAt) : '-',
          };
        });
        setActivities(mapped);
      }
      setError(null);
    } catch (e) {
      if (__DEV__) console.log('[RECENT_ACTIVITY] fetch error:', e);
      // "Failed to load" must not look like "no activity yet" — show retry instead.
      setError((e as Error)?.message || 'Could not load your activity.');
    } finally {
      isRefresh ? setRefreshing(false) : setLoading(false);
    }
  }, []);

  useEffect(() => { fetchActivities(); }, [fetchActivities]);

  // Re-fetch whenever the screen regains focus (status may have changed in DB)
  useFocusEffect(useCallback(() => { fetchActivities(); }, [fetchActivities]));

  // Live refresh when any booking status changes server-side
  useEffect(() => {
    const events = ['booking:expired', 'booking:approved', 'booking:rejected', 'booking:cancelled', 'session:started', 'session:completed', NETWORK_RECONNECTED];
    const subs = events.map((evt) => DeviceEventEmitter.addListener(evt, () => fetchActivities(true)));
    return () => subs.forEach((s) => s.remove());
  }, [fetchActivities]);

  const filteredActivities = activities.filter(
    (item) => activeFilter === 'All' || item.type === activeFilter
  );

  const statusColor = (s: string) => {
    if (s === 'Active') return Colors.successAlt;
    if (s === 'Approved') return Colors.success;
    if (s === 'Pending') return Colors.warning;
    if (s === 'Cancelled' || s === 'Rejected') return Colors.error;
    if (s === 'Expired') return Colors.textSecondary;
    return Colors.textSecondary;
  };

  // Light tint used behind the status badge + icon for each state
  const statusBg = (s: string) => {
    if (s === 'Active') return Colors.successBgAlt;
    if (s === 'Approved') return Colors.successBg;
    if (s === 'Pending') return Colors.warningBg;
    if (s === 'Cancelled' || s === 'Rejected') return Colors.errorBg;
    return Colors.surfaceBg;
  };

  const handleCardPress = (item: Activity) => {
    if (MODAL_STATUSES.includes(item.status)) {
      // Quick modal for terminal/informational statuses
      setModalItem(item);
      return;
    }
    if (item.status === 'Active') {
      router.push({ pathname: '/(find-space)/active-session', params: { bookingId: item.id } });
    } else if (item.status === 'Completed') {
      router.push({ pathname: '/(find-space)/session-complete', params: { bookingId: item.id } });
    } else {
      // Pending, Approved, Arrived → booking status screen
      router.push({ pathname: '/(find-space)/booking-status', params: { bookingId: item.id } });
    }
  };

  const renderItem = ({ item }: { item: Activity }) => {
    const { Icon, color: iconColor, bg: iconBg } = iconForItem(item.type, item.status);
    return (
      <TouchableOpacity
        style={styles.activityItem}
        onPress={() => handleCardPress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.activityIcon, { backgroundColor: iconBg }]}>
          <Icon size={16} color={iconColor} strokeWidth={2} />
        </View>
        <View style={styles.activityInfo}>
          <Text style={styles.activityTitleText} numberOfLines={1}>{item.statusTitle}</Text>
          <Text style={styles.activityLocation} numberOfLines={1}>{item.location}</Text>
        </View>
        <View style={styles.activityRight}>
          {item.amount && <Text style={styles.activityAmount}>{item.amount}</Text>}
          <Text style={styles.activityRightTime}>{item.time}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <PageHeader title="Recent Activity" onBack={() => router.dismiss()} />

      {/* Filter Pills */}
      <View style={styles.filterContainer}>
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[styles.filterPill, activeFilter === filter && styles.filterPillActive]}
            onPress={() => setActiveFilter(filter)}
          >
            <Text style={[styles.filterText, activeFilter === filter && styles.filterTextActive]}>
              {filter}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.emptyState}>
          <AlertCircle size={48} color={Colors.error} strokeWidth={1.5} />
          <Text style={styles.emptyTitle}>Couldn't load activity</Text>
          <Text style={styles.emptyDescription}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchActivities()}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          style={styles.list}
          data={filteredActivities}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchActivities(true)} tintColor={Colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrapper}>
                <NoActivitySvg width={100} height={100} primaryColor={Colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>
                {activities.length === 0 ? 'No activity yet' : `No ${activeFilter.toLowerCase()} activities`}
              </Text>
              <Text style={styles.emptyDescription}>
                {activities.length === 0
                  ? 'Your bookings and transactions will appear here'
                  : `No ${activeFilter.toLowerCase()} activities to show`}
              </Text>
            </View>
          }
        />
      )}

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
            {modalItem?.status === 'Expired' && (
              <View style={styles.modalHeader}>
                <View style={[styles.modalIconWrap, { backgroundColor: Colors.surfaceBg }]}>
                  <Clock size={32} color={Colors.textSecondary} />
                </View>
                <Text style={styles.modalTitle}>Request Expired</Text>
                <Text style={styles.modalSub}>
                  The owner did not respond within 2 minutes.{'\n'}Your request was automatically cancelled.
                </Text>
              </View>
            )}
            {modalItem?.status === 'Rejected' && (
              <View style={styles.modalHeader}>
                <View style={[styles.modalIconWrap, { backgroundColor: Colors.errorBg }]}>
                  <XCircle size={32} color={Colors.error} />
                </View>
                <Text style={[styles.modalTitle, { color: Colors.error }]}>Booking Rejected</Text>
                <Text style={styles.modalSub}>The owner declined this booking request.</Text>
              </View>
            )}
            {modalItem?.status === 'Cancelled' && (
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
                <Text style={styles.modalDetailValue} numberOfLines={1}>{modalItem?.location}</Text>
              </View>
              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>Booking ID</Text>
                <Text style={styles.modalDetailValue}>{modalItem?.shortId}</Text>
              </View>
              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>Requested At</Text>
                <Text style={styles.modalDetailValue}>{modalItem?.requestedAt}</Text>
              </View>
              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>Arrival Selected</Text>
                <Text style={styles.modalDetailValue}>{modalItem?.etaLabel}</Text>
              </View>
              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>Vehicle</Text>
                <Text style={styles.modalDetailValue} numberOfLines={1}>{modalItem?.vehicle}</Text>
              </View>
              <View style={[styles.modalDetailRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.modalDetailLabel}>Price</Text>
                <Text style={[styles.modalDetailValue, { color: Colors.primary, fontWeight: FontWeight.bold }]}>{modalItem?.price}</Text>
              </View>
            </View>

            {/* Why did this happen (only for Expired) */}
            {modalItem?.status === 'Expired' && (
              <View style={styles.reasonBox}>
                <Text style={styles.reasonTitle}>Why did this happen?</Text>
                <Text style={styles.reasonItem}>• Owner was unavailable at the time</Text>
                <Text style={styles.reasonItem}>• Owner did not respond within 2 minutes</Text>
                <Text style={styles.reasonItem}>• Space may no longer be available</Text>
              </View>
            )}

            {/* Actions */}
            <TouchableOpacity
              style={styles.modalSearchBtn}
              onPress={() => { setModalItem(null); router.push('/(find-space)'); }}
            >
              <Text style={styles.modalSearchBtnText}>Search Similar Spaces</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setModalItem(null)}>
              <Text style={styles.modalCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  list: { flex: 1, backgroundColor: Colors.screenBg },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.screenBg,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing['3xl'],
    gap: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBg,
  },
  filterPill: { paddingHorizontal: Spacing['3xl'], paddingVertical: Spacing.md, borderRadius: BorderRadius.circleXl, backgroundColor: Colors.surfaceBg },  // 20 = circleXl ✓
  filterPillActive: { backgroundColor: Colors.primary },
  filterText: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.textSecondary },  // 13 = base ✓
  filterTextActive: { color: Colors.white },
  content: { paddingBottom: Spacing['7xl'] },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.screenBg },
  activityItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white,
    paddingVertical: Spacing['3xl'], paddingHorizontal: Spacing['3xl'],
    borderBottomWidth: 1, borderBottomColor: Colors.surfaceBg,
  },
  activityIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.lg },
  activityInfo: { flex: 1, marginRight: 12, minWidth: 0 },
  activityTitleText: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  activityLocation: { fontSize: 13, fontWeight: '400', color: '#64748B' },
  activityRight: { alignItems: 'flex-end', justifyContent: 'center', flexShrink: 0, gap: 4, paddingRight: 4 },
  activityAmount: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  activityRightTime: { fontSize: 12, fontWeight: '500', color: '#94A3B8' },
  emptyState: {
    flex: 1,
    paddingVertical: 80,
    paddingHorizontal: Spacing['7xl'],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.screenBg,
  },
  emptyIconWrapper: {
    marginBottom: Spacing.screenH,
  },
  emptyTitle: {
    fontSize: FontSize.xl,                          // 16 = xl ✓
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: FontSize.base, color: Colors.textMuted, textAlign: 'center', lineHeight: 20,  // 13 = base ✓
  },
  retryBtn: { marginTop: Spacing['3xl'], paddingHorizontal: Spacing['4xl'], paddingVertical: Spacing.lg, backgroundColor: Colors.primaryBg, borderRadius: BorderRadius.lg },
  retryBtnText: { color: Colors.primary, fontWeight: FontWeight.bold, fontSize: FontSize.md },
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
  modalSearchBtn: {
    backgroundColor: Colors.primary, paddingVertical: Spacing['2xl'],
    borderRadius: BorderRadius.md, alignItems: 'center',   // 12 = md ✓
  },
  modalSearchBtnText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.white },  // 15 = lg ✓
  modalCloseBtn: {
    paddingVertical: Spacing.xl, borderRadius: BorderRadius.md,   // 12 = md ✓
    borderWidth: 1, borderColor: Colors.border, alignItems: 'center',
  },
  modalCloseBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textSecondary },  // 14 = md ✓
});

export default RecentActivityScreen;
