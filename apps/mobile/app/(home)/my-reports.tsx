import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { FontSize, FontWeight, BorderRadius, Spacing, ExtendedColors } from '../../theme';
import type { ColorsType } from '../../theme';
import { useTheme } from '../../hooks/useTheme';

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
const makeStatusStyle = (colors: ColorsType): Record<string, { label: string; color: string; bg: string }> => ({
  REPORTED: { label: 'Under Review', color: colors.info, bg: colors.infoBg },
  INVESTIGATING: { label: 'Investigating', color: colors.warning, bg: colors.warningBg },
  WARNING_ISSUED: { label: 'Warning Issued', color: colors.warning, bg: colors.warningBg },
  SUSPENDED_TEMP: { label: 'Action Taken', color: colors.success, bg: colors.successBg },
  BANNED: { label: 'Action Taken', color: colors.success, bg: colors.successBg },
  RESOLVED: { label: 'Resolved', color: colors.success, bg: colors.successBg },
});

const TYPE_LABELS: Record<string, string> = {
  FAKER_BOOKING: 'Fake Booking',
  DAMAGING_PROPERTY: 'Property Damage',
  REPEATED_CANCELLATION: 'Repeated Cancellation',
  ILLEGAL_PARKING: 'Illegal Parking',
  HARASSMENT: 'Harassment',
  FAKE_SPACE: 'Fake Space',
  UNSAFE_AREA: 'Unsafe Area',
  OFFLINE_PAYMENT_DEMAND: 'Asked for Extra Money',
  MISLEADING_LISTING: 'Misleading Listing',
  UPI_NOT_WORKING: 'QR / UPI Not Working',
  PAYMENT_NOT_RECEIVED: 'Payment Not Received',
  LEFT_WITHOUT_PAYING: 'Left Without Paying',
  OTHER: 'Other',
};

export default function MyReportsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const STATUS_STYLE = useMemo(() => makeStatusStyle(colors), [colors]);
  const [reports, setReports] = useState<AbuseReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AbuseReport | null>(null);

  const fetchReports = useCallback(async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      // Guarantee minimum 800ms loading time so spinner is visible
      const [data] = await Promise.all([
        api.get('/abuse-reports/my'),
        new Promise(resolve => setTimeout(resolve, 800)),
      ]);
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
            <ShieldAlert size={16} color={colors.error} strokeWidth={2} />
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
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <PageHeader title="My Reports" onBack={() => router.replace('/(home)')} />

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          style={styles.scrollView}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            error ? (
              <View style={styles.center}>
                <Flag size={40} color={colors.error} strokeWidth={1.5} />
                <Text style={styles.emptyText}>{error}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={() => fetchReports()}>
                  <Text style={styles.retryBtnText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.center}>
                <Flag size={40} color={colors.textMuted} strokeWidth={1.5} />
                <Text style={styles.emptyTitle}>No reports yet</Text>
                <Text style={styles.emptyText}>Reports you submit about users or listings will appear here with their status.</Text>
              </View>
            )
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchReports(true)} tintColor={colors.primary} />}
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

const makeStyles = (colors: ColorsType) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  scrollView: { flex: 1, backgroundColor: colors.screenBg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg, padding: Spacing['4xl'], backgroundColor: colors.screenBg },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: colors.textPrimary },
  emptyText: { fontSize: FontSize.base, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  retryBtn: { paddingHorizontal: Spacing['3xl'], paddingVertical: Spacing.lg, backgroundColor: colors.primaryBg, borderRadius: BorderRadius.lg },
  retryBtnText: { color: colors.primary, fontWeight: FontWeight.bold },
  list: { padding: Spacing.screenH },
  card: {
    backgroundColor: colors.white,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: Spacing['3xl'],
    marginBottom: Spacing.xl,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  typeWrap: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexShrink: 1 },
  typeText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: colors.textPrimary, flexShrink: 1 },
  statusBadge: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.sm },
  statusText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  desc: { fontSize: FontSize.sm, color: colors.textBody, lineHeight: 18, marginBottom: Spacing.md },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.xs },
  ref: { fontSize: FontSize.sm, fontWeight: FontWeight.extrabold, color: colors.textSecondary, letterSpacing: 0.4 },
  meta: { fontSize: FontSize.xs, color: colors.textMuted, fontWeight: FontWeight.medium, flexShrink: 1, textAlign: 'right', marginLeft: Spacing.md },
  // Inline "Admin: …" banner on the card (one-liner preview)
  adminBanner: { marginTop: Spacing.md, backgroundColor: colors.primaryBg, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs },
  adminBannerText: { fontSize: FontSize.xs, color: colors.primary, fontWeight: FontWeight.semibold },
  // Detail modal
  modalOverlay: { flex: 1, backgroundColor: ExtendedColors.overlayHeavy, justifyContent: 'center', padding: Spacing['4xl'] },
  modalCard: { backgroundColor: colors.white, borderRadius: BorderRadius.lg, padding: Spacing['4xl'] },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xl },
  modalRef: { fontSize: FontSize.lg, fontWeight: FontWeight.extrabold, color: colors.textPrimary, letterSpacing: 0.4 },
  modalLabel: { fontSize: FontSize.xs, color: colors.textMuted, fontWeight: FontWeight.bold, marginTop: Spacing.lg, textTransform: 'uppercase', letterSpacing: 0.4 },
  modalValue: { fontSize: FontSize.base, color: colors.textPrimary, marginTop: 2 },
  modalValueMuted: { fontSize: FontSize.base, color: colors.textSecondary, marginTop: 2, fontStyle: 'italic' },
  modalAdminText: { fontSize: FontSize.base, color: colors.textPrimary, marginTop: Spacing.xs, backgroundColor: colors.primaryBg, borderRadius: BorderRadius.sm, padding: Spacing.lg, lineHeight: 19 },
  modalCloseBtn: { marginTop: Spacing['3xl'], backgroundColor: colors.primary, borderRadius: BorderRadius.md, paddingVertical: Spacing.xl, alignItems: 'center' },
  modalCloseText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: colors.white },
});
