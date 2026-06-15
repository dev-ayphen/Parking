import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, StatusBar, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { ChevronLeft, Clock, XCircle, AlertCircle, CheckCircle2, ThumbsUp } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { api } from '../../services/api';
import NoActivitySvg from '../../components/Illustrations/NoActivitySvg';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, ExtendedColors } from '../../theme';

const REQUEST_STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  APPROVED: { label: 'Approved', color: Colors.success, bg: Colors.successBg },
  COMPLETED: { label: 'Completed', color: Colors.textBody, bg: Colors.surfaceBg },
  REJECTED: { label: 'Rejected', color: Colors.error, bg: Colors.errorBg },
  CANCELLED: { label: 'Cancelled', color: Colors.error, bg: Colors.errorBg },
  EXPIRED: { label: 'Expired', color: Colors.textSecondary, bg: Colors.surfaceBg },
};

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

  const renderItem = ({ item: req }: { item: any }) => {
    const badge = REQUEST_STATUS_BADGE[req.status] || { label: req.status, color: Colors.textSecondary, bg: Colors.surfaceBg };
    return (
      <TouchableOpacity
        style={styles.recentReqCard}
        activeOpacity={0.8}
        onPress={() => setModalItem({ ...req, status: req.status.toUpperCase() })}
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
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Recent Requests</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
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
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchRequests(true)} tintColor={Colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyStateContainer}>
              <NoActivitySvg width={120} height={120} primaryColor={Colors.primary} />
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
                <View style={[styles.modalIconWrap, { backgroundColor: Colors.successBg }]}>
                  <CheckCircle2 size={32} color={Colors.successAlt} />
                </View>
                <Text style={[styles.modalTitle, { color: Colors.successAlt }]}>Booking Completed</Text>
                <Text style={styles.modalSub}>This booking was successfully completed.</Text>
              </View>
            )}
            {modalItem?.status === 'APPROVED' && (
              <View style={styles.modalHeader}>
                <View style={[styles.modalIconWrap, { backgroundColor: Colors.successBg }]}>
                  <ThumbsUp size={32} color={Colors.success} />
                </View>
                <Text style={[styles.modalTitle, { color: Colors.success }]}>Booking Approved</Text>
                <Text style={styles.modalSub}>You approved this booking request.</Text>
              </View>
            )}
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
  safeArea: { flex: 1, backgroundColor: Colors.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenH,
    paddingVertical: Spacing.xl,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBg,
  },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.screenBg, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSize['2xl'], fontWeight: FontWeight.bold, color: Colors.textPrimary },  // 18 = 2xl ✓
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { flex: 1, backgroundColor: Colors.screenBg },
  content: { padding: Spacing['3xl'], paddingBottom: Spacing['7xl'] },
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

  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: Spacing.screenH,
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
