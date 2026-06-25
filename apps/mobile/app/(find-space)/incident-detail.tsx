import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AlertTriangle, Clock, Search, CheckCircle2, XCircle } from 'lucide-react-native';
import { api } from '../../services/api';
import PageHeader from '../../components/PageHeader';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing } from '../../theme';

// Status → presentation. Mirrors the admin incident statuses
// (OPEN | INVESTIGATING | RESOLVED | REJECTED).
const STATUS_META: Record<string, { label: string; color: string; bg: string; Icon: any; blurb: string }> = {
  OPEN: {
    label: 'Open',
    color: Colors.info,
    bg: Colors.infoBg,
    Icon: Clock,
    blurb: 'Your report has been received and is awaiting review by our team.',
  },
  INVESTIGATING: {
    label: 'Investigating',
    color: Colors.warning,
    bg: Colors.warningBg,
    Icon: Search,
    blurb: 'Our team is actively reviewing the details and evidence you provided.',
  },
  RESOLVED: {
    label: 'Resolved',
    color: Colors.success,
    bg: Colors.successBg,
    Icon: CheckCircle2,
    blurb: 'This report has been reviewed and resolved.',
  },
  REJECTED: {
    label: 'Closed',
    color: Colors.error,
    bg: Colors.errorBg,
    Icon: XCircle,
    blurb: 'After review, no further action was taken on this report.',
  },
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

export default function IncidentDetailScreen() {
  const router = useRouter();
  const { incidentId } = useLocalSearchParams<{ incidentId: string }>();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIncident = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get(`/incidents/${incidentId}`);
      setReport(data.report || data);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Could not load this report.');
    } finally {
      setLoading(false);
    }
  }, [incidentId]);

  useEffect(() => {
    fetchIncident();
  }, [fetchIncident]);

  const fmtDate = (iso?: string) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return `${d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} • ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <PageHeader title="Incident Report" onBack={() => router.replace('/(find-space)')} />
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      </SafeAreaView>
    );
  }

  if (error || !report) {
    return (
      <SafeAreaView style={styles.container}>
        <PageHeader title="Incident Report" onBack={() => router.replace('/(find-space)')} />
        <View style={styles.center}>
          <AlertTriangle size={40} color={Colors.error} strokeWidth={1.5} />
          <Text style={styles.errorText}>{error || 'Report not found'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchIncident}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const meta = STATUS_META[report.status] ?? STATUS_META.OPEN;
  const { Icon } = meta;
  const ref = `INC-${String(report.id).padStart(5, '0')}`;
  const evidence: string[] = report.evidenceUrls ?? [];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <PageHeader title="Incident Report" onBack={() => router.replace('/(find-space)')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status hero */}
        <View style={[styles.statusHero, { backgroundColor: meta.bg }]}>
          <Icon size={36} color={meta.color} strokeWidth={2} />
          <Text style={[styles.statusLabel, { color: meta.color }]}>{meta.label}</Text>
          <Text style={styles.statusBlurb}>{meta.blurb}</Text>
        </View>

        {/* Details */}
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Reference</Text>
            <Text style={styles.refValue}>{ref}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.label}>Type</Text>
            <Text style={styles.value}>{TYPE_LABELS[report.reportType] ?? report.reportType}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.label}>Reported</Text>
            <Text style={styles.value}>{fmtDate(report.createdAt)}</Text>
          </View>
          {report.resolvedAt && (
            <>
              <View style={styles.divider} />
              <View style={styles.row}>
                <Text style={styles.label}>Closed</Text>
                <Text style={styles.value}>{fmtDate(report.resolvedAt)}</Text>
              </View>
            </>
          )}
        </View>

        {/* Description */}
        {report.description ? (
          <View style={styles.block}>
            <Text style={styles.blockTitle}>What you reported</Text>
            <Text style={styles.blockBody}>{report.description}</Text>
          </View>
        ) : null}

        {/* Admin notes (only when present) */}
        {report.adminNotes ? (
          <View style={[styles.block, styles.adminBlock]}>
            <Text style={styles.blockTitle}>Update from ParkSwift</Text>
            <Text style={styles.blockBody}>{report.adminNotes}</Text>
          </View>
        ) : null}

        {/* Evidence */}
        {evidence.length > 0 && (
          <View style={styles.block}>
            <Text style={styles.blockTitle}>Evidence ({evidence.length})</Text>
            <View style={styles.evidenceGrid}>
              {evidence.map((uri) => (
                <Image key={uri} source={{ uri }} style={styles.evidenceThumb} />
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg, padding: Spacing.screenH },
  errorText: { color: Colors.textSecondary, textAlign: 'center', fontSize: FontSize.base },
  retryBtn: { paddingHorizontal: Spacing['3xl'], paddingVertical: Spacing.lg, backgroundColor: Colors.primaryBg, borderRadius: BorderRadius.lg },
  retryBtnText: { color: Colors.primary, fontWeight: FontWeight.bold },
  content: { padding: Spacing.screenH, paddingBottom: Spacing['5xl'] },

  statusHero: {
    alignItems: 'center',
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing['4xl'],
    paddingHorizontal: Spacing['3xl'],
    marginBottom: Spacing.screenH,
  },
  statusLabel: { fontSize: FontSize['2xl'], fontWeight: FontWeight.black, marginTop: Spacing.lg },
  statusBlurb: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.md, lineHeight: 18 },

  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing['3xl'],
    marginBottom: Spacing.screenH,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.md },
  label: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  value: { fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: FontWeight.semibold, flexShrink: 1, textAlign: 'right' },
  refValue: { fontSize: FontSize.base, color: Colors.textPrimary, fontWeight: FontWeight.extrabold, letterSpacing: 0.5 },
  divider: { height: 1, backgroundColor: Colors.borderLighter },

  block: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing['3xl'],
    marginBottom: Spacing.screenH,
  },
  adminBlock: { backgroundColor: Colors.infoBg, borderColor: Colors.info },
  blockTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: Spacing.md },
  blockBody: { fontSize: FontSize.sm, color: Colors.textBody, lineHeight: 20 },

  evidenceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  evidenceThumb: { width: 72, height: 72, borderRadius: BorderRadius.md, backgroundColor: Colors.surfaceBg },
});
