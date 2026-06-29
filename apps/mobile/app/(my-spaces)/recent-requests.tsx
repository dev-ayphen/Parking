import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, StatusBar, Modal, Pressable, DeviceEventEmitter, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { Clock, XCircle, AlertCircle, CheckCircle2, ThumbsUp } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../services/api';
import { NETWORK_RECONNECTED } from '../../store/networkStore';
import PageHeader from '../../components/PageHeader';
import NoActivitySvg from '../../components/Illustrations/NoActivitySvg';
import { FontSize, FontWeight, BorderRadius, Spacing, ExtendedColors } from '../../theme';
import type { ColorsType } from '../../theme';

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

export default function RecentRequestsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors);

  const REQUEST_STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
    APPROVED: { label: 'Approved', color: colors.success, bg: colors.successBg },
    COMPLETED: { label: 'Completed', color: colors.textBody, bg: colors.surfaceBg },
    REJECTED: { label: 'Rejected', color: colors.error, bg: colors.errorBg },
    CANCELLED: { label: 'Cancelled', color: colors.error, bg: colors.errorBg },
    EXPIRED: { label: 'Expired', color: colors.textSecondary, bg: colors.surfaceBg },
  };

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [modalItem, setModalItem] = useState<any>(null);

  const fetchRequests = useCallback(async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      const json = await api.get('/home/owner-dashboard');
      if (!json.success) return;

      const mapped = (json.recentRequests || []).map((r: any) => ({
        id: String(r.id),
        parkerName: r.parkerName || 'Unknown',
        parkerPhotoUrl: r.parkerPhotoUrl || null,
        spaceName: r.spaceName || '—',
        status: r.status || '',
        amount: r.amount || 0,
        createdAt: r.createdAt || '',
      }));
      setRequests(mapped);
    } catch (e) {
      if (__DEV__) console.log('[RECENT_REQUESTS] error', e);
    } finally {
      isRefresh ? setRefreshing(false) : setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useFocusEffect(useCallback(() => {
    DeviceEventEmitter.emit('sessionbar:suppress', true);
    return () => { DeviceEventEmitter.emit('sessionbar:suppress', false); };
  }, []));

  // Re-fetch when connectivity is restored (offline banner's "Retry" / auto-
  // reconnect) so the list isn't left showing stale data.
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(NETWORK_RECONNECTED, () => fetchRequests(true));
    return () => sub.remove();
  }, [fetchRequests]);

  const renderItem = ({ item: req }: { item: any }) => {
    const badge = REQUEST_STATUS_BADGE[req.status] || { label: req.status, color: colors.textSecondary, bg: colors.surfaceBg };
    return (
      <TouchableOpacity
        style={styles.recentReqCard}
        activeOpacity={0.8}
        onPress={() => setModalItem({ ...req, status: req.status.toUpperCase() })}
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
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <PageHeader title="All Recent Requests" onBack={() => router.replace('/(my-spaces)')} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          style={styles.list}
          contentContainerStyle={styles.content}
          data={requests}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchRequests(true)} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyStateContainer}>
              <NoActivitySvg width={120} height={120} primaryColor={colors.primary} />
              <Text style={styles.emptyStateTitle}>No recent requests</Text>
              <Text style={styles.emptyStateDesc}>You do not have any requests at the moment.</Text>
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
            {modalItem?.status === 'COMPLETED' && (
              <View style={styles.modalHeader}>
                <View style={[styles.modalIconWrap, { backgroundColor: colors.successBg }]}>
                  <CheckCircle2 size={32} color={colors.successAlt} />
                </View>
                <Text style={[styles.modalTitle, { color: colors.successAlt }]}>Booking Completed</Text>
                <Text style={styles.modalSub}>This booking was successfully completed.</Text>
              </View>
            )}
            {modalItem?.status === 'APPROVED' && (
              <View style={styles.modalHeader}>
                <View style={[styles.modalIconWrap, { backgroundColor: colors.successBg }]}>
                  <ThumbsUp size={32} color={colors.success} />
                </View>
                <Text style={[styles.modalTitle, { color: colors.success }]}>Booking Approved</Text>
                <Text style={styles.modalSub}>You approved this booking request.</Text>
              </View>
            )}
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

const makeStyles = (colors: ColorsType) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { flex: 1, backgroundColor: colors.screenBg },
  content: { padding: Spacing['3xl'], paddingBottom: Spacing['7xl'] },
  recentReqCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.white, borderRadius: BorderRadius.button, padding: Spacing.xl, marginBottom: Spacing.md,  // 14 = button ✓
    borderWidth: 1, borderColor: colors.surfaceBg,
  },
  recentReqAvatar: {
    width: 38, height: 38, borderRadius: BorderRadius.circle, backgroundColor: colors.surfaceBg,  // 19 = circle ✓
    alignItems: 'center', justifyContent: 'center', marginRight: Spacing.xl, overflow: 'hidden',
  },
  recentReqAvatarImg: { width: '100%', height: '100%', borderRadius: BorderRadius.circle },
  recentReqAvatarText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: colors.textSecondary },  // 15 = lg ✓
  recentReqInfo: { flex: 1 },
  recentReqName: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: colors.textPrimary },  // 14 = md ✓
  recentReqSpace: { fontSize: FontSize.sm, color: colors.textMuted, marginTop: Spacing.micro },  // 12 = sm ✓
  recentReqRight: { alignItems: 'flex-end', gap: Spacing.xs },
  recentReqBadge: { paddingHorizontal: Spacing.md, paddingVertical: 3, borderRadius: BorderRadius.sm },  // 8 = sm ✓
  recentReqBadgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },  // 11 = xs ✓
  recentReqTime: { fontSize: FontSize.xs, color: colors.textMuted },  // 11 = xs ✓

  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: Spacing.screenH,
  },
  emptyStateTitle: {
    fontSize: FontSize['2xl'],                      // 18 = 2xl ✓
    fontWeight: FontWeight.bold,
    color: colors.textPrimary,
    marginTop: Spacing.screenH,
    marginBottom: Spacing.md,
  },
  emptyStateDesc: {
    fontSize: FontSize.md,                          // 14 = md ✓
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Modal styles
  modalOverlay: {
    flex: 1, backgroundColor: ExtendedColors.overlayHeavy,   // 'rgba(0,0,0,0.55)' ✓
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.white, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl,  // 24 = xl ✓
    paddingHorizontal: Spacing.screenH, paddingTop: Spacing.screenH, paddingBottom: Spacing['6xl'],
    gap: Spacing.xl,
  },
  modalHeader: { alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xs },
  modalIconWrap: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xs,
  },
  modalTitle: { fontSize: FontSize['3xl'], fontWeight: FontWeight.extrabold, color: colors.textPrimary, textAlign: 'center' },  // 20 = 3xl ✓
  modalSub: { fontSize: FontSize.base, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },  // 13 = base ✓
  modalDetails: {
    backgroundColor: colors.screenBg, borderRadius: BorderRadius.button,   // 14 = button ✓
    paddingHorizontal: Spacing['2xl'], paddingVertical: Spacing.sm,
  },
  modalDetailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: Spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  modalDetailLabel: { fontSize: FontSize.sm, color: colors.textSecondary, fontWeight: FontWeight.medium, flex: 1 },  // 12 = sm ✓
  modalDetailValue: { fontSize: FontSize.base, color: colors.textPrimary, fontWeight: FontWeight.semibold, textAlign: 'right', flex: 1.5 },  // 13 = base ✓
  reasonBox: {
    backgroundColor: colors.pendingBg, borderRadius: BorderRadius.md, padding: Spacing['2xl'],   // '#FFF7ED' ✓, 12 = md ✓
    borderLeftWidth: 3, borderLeftColor: ExtendedColors.orange,   // '#F97316' ✓
  },
  reasonTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: ExtendedColors.redOrange, marginBottom: Spacing.sm },  // 12 = sm ✓, '#C2410C' ✓
  reasonItem: { fontSize: FontSize.sm, color: ExtendedColors.warningAmber, lineHeight: 20 },  // 12 = sm ✓, '#92400E' ✓
  modalCloseBtn: {
    paddingVertical: Spacing['2xl'], borderRadius: BorderRadius.md,   // 12 = md ✓
    backgroundColor: colors.surfaceBg, alignItems: 'center', marginTop: Spacing.md,
  },
  modalCloseBtnText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: colors.textPrimary },  // 15 = lg ✓
});
