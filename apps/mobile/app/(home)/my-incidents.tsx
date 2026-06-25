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
import { AlertTriangle, Clock, CheckCircle2, XCircle, Search } from 'lucide-react-native';
import { api } from '../../services/api';
import { NETWORK_RECONNECTED } from '../../store/networkStore';
import PageHeader from '../../components/PageHeader';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, ExtendedColors } from '../../theme';

interface IncidentReport {
  id: number;
  reportType: string;
  description: string;
  status: string;
  createdAt: string;
  resolvedAt?: string | null;
  adminNotes?: string | null;
}

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string; Icon: any }> = {
  OPEN: { label: 'Open', color: Colors.info, bg: Colors.infoBg, Icon: Clock },
  INVESTIGATING: { label: 'Investigating', color: Colors.warning, bg: Colors.warningBg, Icon: Search },
  RESOLVED: { label: 'Resolved', color: Colors.success, bg: Colors.successBg, Icon: CheckCircle2 },
  REJECTED: { label: 'Closed', color: Colors.error, bg: Colors.errorBg, Icon: XCircle },
};

const TYPE_LABELS: Record<string, string> = {
  VEHICLE_DAMAGE: 'Vehicle Damage',
  TOWING: 'Vehicle Towed',
  DISPUTE: 'Dispute with Owner',
  THEFT: 'Theft / Break-in',
  PROPERTY_DAMAGE: 'Property Damage',
  HARASSMENT: 'Harassment',
  ILLEGAL_PARKING: 'Illegal Parking',
  UNSAFE_SPACE: 'Unsafe Space',
  OTHER: 'Other',
};

export default function MyIncidentsScreen() {
  const router = useRouter();
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<IncidentReport | null>(null);

  const fetchIncidents = useCallback(async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      const [data] = await Promise.all([
        api.get('/incidents/my'),
        new Promise(resolve => setTimeout(resolve, 800)),
      ]);
      setIncidents(data?.incidents ?? []);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Could not load your incidents.');
    } finally {
      isRefresh ? setRefreshing(false) : setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(NETWORK_RECONNECTED, () => fetchIncidents(true));
    return () => sub.remove();
  }, [fetchIncidents]);

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const renderItem = ({ item }: { item: IncidentReport }) => {
    const meta = STATUS_STYLE[item.status] ?? STATUS_STYLE.OPEN;
    const { Icon } = meta;
    return (
      <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={() => setSelected(item)}>
        <View style={styles.cardTop}>
          <View style={styles.typeWrap}>
            <AlertTriangle size={16} color={Colors.error} strokeWidth={2} />
            <Text style={styles.typeText}>{TYPE_LABELS[item.reportType] ?? item.reportType}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
            <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>
        {item.description ? (
          <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
        ) : null}
        <View style={styles.cardBottom}>
          <Text style={styles.ref}>INC-{String(item.id).padStart(5, '0')}</Text>
          <Text style={styles.meta}>{fmtDate(item.createdAt)}</Text>
        </View>
        {item.adminNotes ? (
          <View style={styles.adminBanner}>
            <Text style={styles.adminBannerText} numberOfLines={1}>
              Update: {item.adminNotes}
            </Text>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <PageHeader title="My Incidents" onBack={() => router.replace('/(home)')} />

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      ) : (
        <FlatList
          data={incidents}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          style={styles.scrollView}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            error ? (
              <View style={styles.center}>
                <AlertTriangle size={40} color={Colors.error} strokeWidth={1.5} />
                <Text style={styles.emptyText}>{error}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={() => fetchIncidents()}>
                  <Text style={styles.retryBtnText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.center}>
                <AlertTriangle size={40} color={Colors.textMuted} strokeWidth={1.5} />
                <Text style={styles.emptyTitle}>No incidents yet</Text>
                <Text style={styles.emptyText}>Incidents you report during or after a parking session will appear here with their status.</Text>
              </View>
            )
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchIncidents(true)} tintColor={Colors.primary} />}
        />
      )}

      {/* Detail modal */}
      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSelected(null)}>
          <TouchableOpacity style={styles.modalCard} activeOpacity={1}>
            {selected && (() => {
              const m = STATUS_STYLE[selected.status] ?? STATUS_STYLE.OPEN;
              const { Icon } = m;
              return (
                <>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalRef}>INC-{String(selected.id).padStart(5, '0')}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: m.bg }]}>
                      <Text style={[styles.statusText, { color: m.color }]}>{m.label}</Text>
                    </View>
                  </View>
                  <Text style={styles.modalLabel}>Type</Text>
                  <Text style={styles.modalValue}>{TYPE_LABELS[selected.reportType] ?? selected.reportType}</Text>
                  <Text style={styles.modalLabel}>Your report</Text>
                  <Text style={styles.modalValue}>{selected.description || '—'}</Text>
                  <Text style={styles.modalLabel}>Reported</Text>
                  <Text style={styles.modalValue}>{new Date(selected.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
                  <Text style={styles.modalLabel}>Admin response</Text>
                  {selected.adminNotes ? (
                    <Text style={styles.modalAdminText}>{selected.adminNotes}</Text>
                  ) : (
                    <Text style={styles.modalValueMuted}>
                      {selected.status === 'OPEN'
                        ? "Your incident is being reviewed. The admin's response will appear here."
                        : 'The admin reviewed this incident. No additional note was provided.'}
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
  adminBanner: { marginTop: Spacing.md, backgroundColor: Colors.primaryBg, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs },
  adminBannerText: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: FontWeight.semibold },
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
