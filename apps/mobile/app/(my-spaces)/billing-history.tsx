import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Star, Receipt } from 'lucide-react-native';
import { PageHeader } from '../../components';
import { api } from '../../services/api';
import { FontSize, FontWeight, BorderRadius, Spacing, ExtendedColors } from '../../theme';
import type { ColorsType } from '../../theme';
import { useTheme } from '../../hooks/useTheme';
import { toast } from '../../utils/toast';

// Same shape as /subscriptions/me/transactions (subscription.service.ts).
interface TxnRecord {
  id: string;
  type?: string;
  description: string;
  amountDisplay: string;
  method?: string | null;
  status: string;
  date: string;
}

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

/**
 * Full billing-history list. The Subscription screen shows only the latest few
 * payments and links here via "View all", so a long ledger (100+ rows) lives on
 * its own scrollable page instead of bloating the subscription screen.
 */
const BillingHistoryScreen = () => {
  const router = useRouter();
  const [txns, setTxns] = useState<TxnRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [receiptTxn, setReceiptTxn] = useState<TxnRecord | null>(null);
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      const res = await api.get('/subscriptions/me/transactions').catch(() => null);
      if (res?.transactions) setTxns(res.transactions);
    } catch (e) {
      if (__DEV__) console.log('[BILLING_HISTORY] error', e);
      toast.error('Failed to load billing history. Please try again.');
    } finally {
      isRefresh ? setRefreshing(false) : setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const renderRow = ({ item: t, index }: { item: TxnRecord; index: number }) => {
    const isPaid = t.status?.toUpperCase() === 'SUCCESS';
    return (
      <TouchableOpacity
        style={[styles.row, index > 0 && styles.rowBorder]}
        onPress={() => setReceiptTxn(t)}
        activeOpacity={0.7}
      >
        <View style={styles.rowInfo}>
          <Text style={styles.rowDate}>{formatDate(t.date)}</Text>
          <Text style={styles.rowDesc} numberOfLines={1}>{t.description || t.id}</Text>
        </View>
        <View style={styles.rowRight}>
          <Text style={styles.rowAmount}>{t.amountDisplay}</Text>
          <View style={[styles.paidBadge, !isPaid && styles.pendingBadge]}>
            <Text style={[styles.paidBadgeText, !isPaid && styles.pendingBadgeText]}>{t.status}</Text>
          </View>
        </View>
        <Receipt size={16} color={colors.borderMuted} style={styles.rowReceiptIcon} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <PageHeader title="Billing History"  onBack={() => router.replace('/(my-spaces)')} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : txns.length === 0 ? (
        <View style={styles.center}>
          <Receipt size={36} color={colors.borderMuted} />
          <Text style={styles.emptyTitle}>No payments yet</Text>
          <Text style={styles.emptySub}>Your subscription payments will appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={txns}
          keyExtractor={(t) => t.id}
          renderItem={renderRow}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={<Text style={styles.hint}>Tap a payment to view its receipt</Text>}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor={colors.primary} />
          }
        />
      )}

      {/* In-app receipt — mirrors the one on the Subscription screen. */}
      <Modal
        visible={receiptTxn !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setReceiptTxn(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
              <View style={styles.receiptHeader}>
                <View style={styles.receiptBrandRow}>
                  <Star size={16} color={colors.amber} fill={colors.amber} />
                  <Text style={styles.receiptBrand}>ParkSwift</Text>
                </View>
                <Text style={styles.receiptSubhead}>Payment Receipt</Text>
              </View>

              {receiptTxn && (
                <View style={styles.receiptBody}>
                  <View style={styles.receiptAmountBlock}>
                    <Text style={styles.receiptAmountLabel}>Amount</Text>
                    <Text style={styles.receiptAmount}>{receiptTxn.amountDisplay?.replace(/^\+/, '')}</Text>
                    <View style={[styles.paidBadge, receiptTxn.status?.toUpperCase() !== 'SUCCESS' && styles.pendingBadge]}>
                      <Text style={[styles.paidBadgeText, receiptTxn.status?.toUpperCase() !== 'SUCCESS' && styles.pendingBadgeText]}>
                        {receiptTxn.status}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.receiptDivider} />
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptRowLabel}>Receipt No.</Text>
                    <Text style={styles.receiptRowValue}>{receiptTxn.id}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptRowLabel}>Description</Text>
                    <Text style={[styles.receiptRowValue, styles.receiptRowValueWrap]}>{receiptTxn.description || '—'}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptRowLabel}>Payment Method</Text>
                    <Text style={styles.receiptRowValue}>{receiptTxn.method ? receiptTxn.method.replace(/_/g, ' ') : '—'}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptRowLabel}>Date</Text>
                    <Text style={styles.receiptRowValue}>{formatDate(receiptTxn.date)}</Text>
                  </View>
                  <Text style={styles.receiptFooterNote}>This is a system-generated receipt. Screenshot it for your records.</Text>
                </View>
              )}

              <TouchableOpacity style={styles.receiptDoneBtn} onPress={() => setReceiptTxn(null)}>
                <Text style={styles.receiptDoneBtnText}>Done</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const makeStyles = (colors: ColorsType) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.white },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing['4xl'] },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: colors.textPrimary, marginTop: Spacing.md },
  emptySub: { fontSize: FontSize.md, color: colors.textSecondary, textAlign: 'center' },
  listContent: { padding: Spacing['3xl'], paddingBottom: Spacing['7xl'] },
  hint: { fontSize: FontSize.sm, color: colors.textMuted, marginBottom: Spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing['2xl'],
    paddingHorizontal: Spacing['3xl'],
    backgroundColor: colors.white,
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.surfaceBg },
  rowInfo: { flex: 1 },
  rowDate: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: colors.textPrimary, marginBottom: Spacing.micro },
  rowDesc: { fontSize: FontSize.sm, color: colors.textMuted },
  rowRight: { alignItems: 'flex-end', gap: Spacing.xs },
  rowAmount: { fontSize: FontSize.lg, fontWeight: FontWeight.extrabold, color: colors.textPrimary },
  rowReceiptIcon: { marginLeft: Spacing.lg },
  paidBadge: { backgroundColor: colors.successBgAlt, paddingHorizontal: Spacing.md, paddingVertical: Spacing.micro, borderRadius: BorderRadius.badge },
  paidBadgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: ExtendedColors.teal },
  pendingBadge: { backgroundColor: colors.warningBg },
  pendingBadgeText: { color: colors.warning },
  // Receipt modal (shared visual language with the subscription screen)
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.screenH },
  modalCard: { backgroundColor: colors.white, borderRadius: BorderRadius.circleXl, width: '100%', maxHeight: '85%', overflow: 'hidden' },
  receiptHeader: { backgroundColor: colors.textPrimary, paddingVertical: Spacing['3xl'], alignItems: 'center' },
  receiptBrandRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  receiptBrand: { fontSize: FontSize['2xl'], fontWeight: FontWeight.extrabold, color: colors.white, letterSpacing: -0.5 },
  receiptSubhead: { fontSize: FontSize.sm, color: colors.textMuted, marginTop: Spacing.xs, fontWeight: FontWeight.medium },
  receiptBody: { paddingHorizontal: Spacing.screenH, paddingVertical: Spacing['3xl'] },
  receiptAmountBlock: { alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing['2xl'] },
  receiptAmountLabel: { fontSize: FontSize.sm, color: colors.textMuted, fontWeight: FontWeight.medium },
  receiptAmount: { fontSize: FontSize['5xl'], fontWeight: FontWeight.extrabold, color: colors.textPrimary, letterSpacing: -0.5 },
  receiptDivider: { height: 1, backgroundColor: colors.surfaceBg, marginBottom: Spacing.lg },
  receiptRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingVertical: Spacing.lg, gap: Spacing.xl },
  receiptRowLabel: { fontSize: FontSize.md, color: colors.textSecondary, flexShrink: 0 },
  receiptRowValue: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: colors.textPrimary, textAlign: 'right' },
  receiptRowValueWrap: { flex: 1 },
  receiptFooterNote: { fontSize: FontSize.xs, color: colors.textMuted, textAlign: 'center', marginTop: Spacing['2xl'], lineHeight: 16 },
  receiptDoneBtn: { backgroundColor: colors.primary, paddingVertical: Spacing['2xl'], alignItems: 'center', marginHorizontal: Spacing.screenH, marginBottom: Spacing.screenH, borderRadius: BorderRadius.button },
  receiptDoneBtnText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: colors.white },
});

export default BillingHistoryScreen;
