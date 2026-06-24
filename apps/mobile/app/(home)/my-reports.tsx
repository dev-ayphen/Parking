import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Modal,
  DeviceEventEmitter,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Flag, ShieldAlert } from 'lucide-react-native';
import { api } from '../../services/api';
import { NETWORK_RECONNECTED } from '../../store/networkStore';
import PageHeader from '../../components/PageHeader';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, ExtendedColors } from '../../theme';

interface AbuseReport {
  id: number;
  abuseType: string;
  description: string;
  status: string;
  createdAt: string;
  adminAction?: string | null;
  updatedAt?: string | null;
  reportedUser?: { id: number; firstName?: string; lastName?: string } | null;
}

// Abuse status → presentation. Covers the full server enum.
const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  REPORTED: { label: 'Under Review', color: Colors.info, bg: Colors.infoBg },
  INVESTIGATING: { label: 'Investigating', color: Colors.warning, bg: Colors.warningBg },
  WARNING_ISSUED: { label: 'Warning Issued', color: Colors.warning, bg: Colors.warningBg },
  SUSPENDED_TEMP: { label: 'Action Taken', color: Colors.success, bg: Colors.successBg },
  BANNED: { label: 'Action Taken', color: Colors.success, bg: Colors.successBg },
  RESOLVED: { label: 'Resolved', color: Colors.success, bg: Colors.successBg },
};

const TYPE_LABELS: Record<string, string> = {
  FAKER_BOOKING: 'Fake Booking',
  DAMAGING_PROPERTY: 'Property Damage',
  REPEATED_CANCELLATION: 'Repeated Cancellation',
  ILLEGAL_PARKING: 'Illegal Parking',
  HARASSMENT: 'Harassment',
  FAKE_SPACE: 'Fake Space',
  UNSAFE_AREA: 'Unsafe Area',
  OFFLINE_PAYMENT_DEMAND: 'Offline Payment Demand',
  MISLEADING_LISTING: 'Misleading Listing',
  OTHER: 'Other',
};

export default function MyReportsScreen() {
  const router = useRouter();
  const [reports, setReports] = useState<AbuseReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AbuseReport | null>(null);

  const fetchReports = useCallback(async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      const data = await api.get('/abuse-reports/my');
      setReports(data?.reports ?? []);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Could not load your reports.');
    } finally {
      isRefresh ? setRefreshing(false) : setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Re-fetch when connectivity is restored (offline banner's "Retry" / auto-
  // reconnect) so the list isn't left showing stale data.
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(NETWORK_RECONNECTED, () => fetchReports(true));
    return () => sub.remove();
  }, [fetchReports]);

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const renderItem = ({ item }: { item: AbuseReport }) => {
    const meta = STATUS_STYLE[item.status] ?? STATUS_STYLE.REPORTED;
    const against = item.reportedUser
      ? [item.reportedUser.firstName, item.reportedUser.lastName].filter(Boolean).join(' ')
      : null;
    return (
      <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={() => setSelected(item)}>
        <View style={styles.cardTop}>
          <View style={styles.typeWrap}>
            <ShieldAlert size={16} color={Colors.error} strokeWidth={2} />
            <Text style={styles.typeText}>{TYPE_LABELS[item.abuseType] ?? item.abuseType}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
            <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>
        {item.description ? (
          <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
        ) : null}
        <View style={styles.cardBottom}>
          <Text style={styles.ref}>ABU-{String(item.id).padStart(5, '0')}</Text>
          <Text style={styles.meta}>
            {against ? `Against ${against} · ` : ''}{fmtDate(item.createdAt)}
          </Text>
        </View>
        {item.adminAction ? (
          <View style={styles.adminBanner}>
            <Text style={styles.adminBannerText} numberOfLines={1}>
              Admin: {item.adminAction}
            </Text>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <PageHeader title="My Reports" onBack={() => router.back()} />

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      ) : error ? (
        <View style={styles.center}>
          <Flag size={40} color={Colors.error} strokeWidth={1.5} />
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchReports()}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : reports.length === 0 ? (
        <View style={styles.center}>
          <Flag size={40} color={Colors.textMuted} strokeWidth={1.5} />
          <Text style={styles.emptyTitle}>No reports yet</Text>
          <Text style={styles.emptyText}>Reports you submit about users or listings will appear here with their status.</Text>
        </View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          style={styles.scrollView}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchReports(true)} tintColor={Colors.primary} />}
        />
      )}

      {/* Detail modal — shows the admin's action / resolution on this report */}
      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSelected(null)}>
          <TouchableOpacity style={styles.modalCard} activeOpacity={1}>
            {selected && (() => {
              const m = STATUS_STYLE[selected.status] ?? STATUS_STYLE.REPORTED;
              const against = selected.reportedUser
                ? [selected.reportedUser.firstName, selected.reportedUser.lastName].filter(Boolean).join(' ')
                : null;
              return (
                <>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalRef}>ABU-{String(selected.id).padStart(5, '0')}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: m.bg }]}>
                      <Text style={[styles.statusText, { color: m.color }]}>{m.label}</Text>
                    </View>
                  </View>
                  <Text style={styles.modalLabel}>Type</Text>
                  <Text style={styles.modalValue}>{TYPE_LABELS[selected.abuseType] ?? selected.abuseType}</Text>
                  {against ? (<><Text style={styles.modalLabel}>Reported user</Text><Text style={styles.modalValue}>{against}</Text></>) : null}
                  <Text style={styles.modalLabel}>Your report</Text>
                  <Text style={styles.modalValue}>{selected.description || '—'}</Text>
                  <Text style={styles.modalLabel}>Admin response</Text>
                  {selected.adminAction ? (
                    <Text style={styles.modalAdminText}>{selected.adminAction}</Text>
                  ) : (
                    <Text style={styles.modalValueMuted}>
                      {selected.status === 'REPORTED'
                        ? 'Your report is being reviewed. The admin’s decision will appear here.'
                        : 'The admin actioned this report. No additional note was provided.'}
                    </Text>
                  )}
                  <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSelected(null)}>
                    <Text style={styles.modalCloseText}>Close</Text>
                  </TouchableOpacity>
                </>
              );
            })()}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  scrollView: { flex: 1, backgroundColor: Colors.screenBg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg, padding: Spacing['4xl'], backgroundColor: Colors.screenBg },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  emptyText: { fontSize: FontSize.base, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  retryBtn: { paddingHorizontal: Spacing['3xl'], paddingVertical: Spacing.lg, backgroundColor: Colors.primaryBg, borderRadius: BorderRadius.lg },
  retryBtnText: { color: Colors.primary, fontWeight: FontWeight.bold },
  list: { padding: Spacing.screenH },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing['3xl'],
    marginBottom: Spacing.xl,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  typeWrap: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexShrink: 1 },
  typeText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textPrimary, flexShrink: 1 },
  statusBadge: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.sm },
  statusText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  desc: { fontSize: FontSize.sm, color: Colors.textBody, lineHeight: 18, marginBottom: Spacing.md },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.xs },
  ref: { fontSize: FontSize.sm, fontWeight: FontWeight.extrabold, color: Colors.textSecondary, letterSpacing: 0.4 },
  meta: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: FontWeight.medium, flexShrink: 1, textAlign: 'right', marginLeft: Spacing.md },
  // Inline "Admin: …" banner on the card (one-liner preview)
  adminBanner: { marginTop: Spacing.md, backgroundColor: Colors.primaryBg, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs },
  adminBannerText: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: FontWeight.semibold },
  // Detail modal
  modalOverlay: { flex: 1, backgroundColor: ExtendedColors.overlayHeavy, justifyContent: 'center', padding: Spacing['4xl'] },
  modalCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing['4xl'] },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xl },
  modalRef: { fontSize: FontSize.lg, fontWeight: FontWeight.extrabold, color: Colors.textPrimary, letterSpacing: 0.4 },
  modalLabel: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: FontWeight.bold, marginTop: Spacing.lg, textTransform: 'uppercase', letterSpacing: 0.4 },
  modalValue: { fontSize: FontSize.base, color: Colors.textPrimary, marginTop: 2 },
  modalValueMuted: { fontSize: FontSize.base, color: Colors.textSecondary, marginTop: 2, fontStyle: 'italic' },
  modalAdminText: { fontSize: FontSize.base, color: Colors.textPrimary, marginTop: Spacing.xs, backgroundColor: Colors.primaryBg, borderRadius: BorderRadius.sm, padding: Spacing.lg, lineHeight: 19 },
  modalCloseBtn: { marginTop: Spacing['3xl'], backgroundColor: Colors.primary, borderRadius: BorderRadius.md, paddingVertical: Spacing.xl, alignItems: 'center' },
  modalCloseText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.white },
});
