import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Star, Zap, Shield, TrendingUp, CheckCircle2, ChevronRight, CreditCard, Receipt, HelpCircle, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PageHeader } from '../../components';
import { api } from '../../services/api';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, ExtendedColors } from '../../theme';
import { toast } from '../../utils/toast';

interface BillingRecord {
  id: string;
  date: string;
  plan: string;
  amount: string;
  status: string;
}

interface CurrentPlan {
  id: string | null;
  planId: number | null;
  name: string;
  features: string[];
  price: number;
  status: string;
  renewalDate: string;
  billingCycle: string;
  autoRenewal: boolean;
  willExpireOn: string | null;
  scheduledDowngrade: { planId: number; planName: string } | null;
}

interface AvailablePlan {
  id: string;
  name: string;
  price: number;
  yearlyPrice: number;
  features: string[];
  maxSpaces?: number;
  hasAnalytics?: boolean;
  hasFeaturedListing?: boolean;
  hasCsvExport?: boolean;
  hasPrioritySupport?: boolean;
}

interface SubscriptionUsage {
  spacesUsed: number;
  maxSpaces: number;
  daysRemaining: number;
  isExpired: boolean;
}

interface SubscriptionData {
  currentPlan: CurrentPlan;
  billingHistory: BillingRecord[];
  availablePlans: AvailablePlan[];
  usage?: SubscriptionUsage;
}

// Shape returned by /subscriptions/me/transactions (subscription.service.ts).
// `id` is the human txn number (e.g. TXN-0042); `method` is the payment method.
interface TxnRecord {
  id: string;
  type?: string;
  description: string;
  amountDisplay: string;
  method?: string | null;
  status: string;
  date: string;
}

// Static help content for the "How subscriptions work" modal. Hardcoded on
// purpose — this is informational copy, not data from the backend.
const HELP_ITEMS: { q: string; a: string }[] = [
  {
    q: 'Why do I need a subscription?',
    a: 'A subscription is required to list your parking spaces. Your plan determines how many spaces you can publish and which features (analytics, featured listings, CSV export, priority support) you get.',
  },
  {
    q: 'Monthly vs yearly billing',
    a: 'Both billing cycles unlock the same plan features. Yearly billing is charged once a year and usually works out cheaper than paying month to month.',
  },
  {
    q: 'How does upgrading work?',
    a: 'Upgrades take effect immediately. You get the higher plan\'s limits and features right away, and your renewal date stays the same.',
  },
  {
    q: 'How does downgrading work?',
    a: 'Downgrades are scheduled for your next renewal date. You keep your current plan and its benefits until then, so you never lose access you\'ve already paid for.',
  },
  {
    q: 'What happens when I cancel?',
    a: 'Cancelling turns off auto-renewal. Your plan stays active until the renewal date, then expires. You won\'t be billed again and no refund is issued for the current period.',
  },
  {
    q: 'What happens when my plan expires?',
    a: 'Your spaces are hidden from search until you re-subscribe. You can still sign in and view all your spaces, bookings and history — nothing is deleted. Re-subscribe any time to make your spaces visible again.',
  },
  {
    q: 'Where can I get my payment receipts?',
    a: 'Tap any row in Billing History to open an in-app receipt with the transaction details. You can screenshot it for your records.',
  },
];

// How many billing rows to show inline on the subscription screen before
// collapsing the rest behind "View all" (full list on its own page).
const BILLING_PREVIEW_COUNT = 5;

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

const formatAmount = (amount: string | number): string => {
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount));
  if (isNaN(num)) return String(amount);
  return `₹${num.toLocaleString('en-IN')}`;
};

const ManageSubscriptionScreen = () => {
  const router = useRouter();
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [txns, setTxns] = useState<TxnRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  // In-app receipt for a billing-history transaction (no PDF endpoint exists for
  // subscription payments — only bookings have /bookings/:id/invoice).
  const [receiptTxn, setReceiptTxn] = useState<TxnRecord | null>(null);
  const [helpVisible, setHelpVisible] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      // Fetch the subscription summary AND the real transaction ledger together.
      // Billing History below uses the real ledger, not the derived placeholder.
      const [json, txnRes] = await Promise.all([
        api.get('/subscriptions/me'),
        api.get('/subscriptions/me/transactions').catch(() => null),
      ]);
      if (json) {
        setData(json as SubscriptionData);
      }
      if (txnRes?.transactions) {
        setTxns(txnRes.transactions);
      }
    } catch (e) {
      if (__DEV__) console.log('[MANAGE_SUBSCRIPTION] error', e);
      toast.error('Failed to load subscription data. Please try again.');
    } finally {
      isRefresh ? setRefreshing(false) : setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCancelSubscription = () => {
    if (!data?.currentPlan?.id) return;
    const expiryDate = formatDate(
      data.currentPlan.willExpireOn || data.currentPlan.renewalDate
    );
    Alert.alert(
      'Turn Off Auto-Renewal',
      `Your plan will stay active until ${expiryDate}, then expire. Auto-renewal will be turned off and you won't be billed again. No refund is issued.`,
      [
        { text: 'Keep Auto-Renewal', style: 'cancel' },
        {
          text: 'Turn Off',
          style: 'destructive',
          onPress: async () => {
            try {
              setCancelling(true);
              const res = await api.put(`/subscriptions/${data.currentPlan.id}/cancel`);
              await fetchData(true);
              toast.success(
                res?.message ||
                  `Auto-renewal turned off. Your plan stays active until ${expiryDate}.`
              );
            } catch (e) {
              if (__DEV__) console.log('[CANCEL_SUBSCRIPTION] error', e);
              toast.error('Failed to update auto-renewal. Please try again.');
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  const handleUpgradePress = () => {
    if (!data) return;
    const { currentPlan, availablePlans } = data;
    const higherPlans = availablePlans.filter(
      (p) => p.price > currentPlan.price
    );
    if (higherPlans.length === 0) {
      // Already on the top plan — give enterprise-interested owners a real path
      // (contact support) instead of a dead-end "coming soon".
      Alert.alert(
        'You\'re on our top plan',
        'Need higher limits or custom features for a large operation? Our team can set up an enterprise plan for you.',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Contact Support', onPress: () => router.push('/(home)/support/create-ticket') },
        ],
      );
    } else {
      router.push('/(my-spaces)/subscription-plans');
    }
  };

  const isFreePlan = !data?.currentPlan?.id;

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        <PageHeader title="Subscription"  onBack={() => router.replace('/(my-spaces)')} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const currentPlan = data?.currentPlan;
  const features = currentPlan?.features ?? [];

  const billingCycleLabel = currentPlan?.billingCycle === 'YEARLY' ? '/year' : '/month';
  const statusText = currentPlan?.status
    ? currentPlan.status.charAt(0).toUpperCase() + currentPlan.status.slice(1).toLowerCase()
    : 'Active';
  const isActive = !currentPlan?.status || currentPlan.status.toUpperCase() === 'ACTIVE';

  // Auto-renewal off → plan will EXPIRE on willExpireOn instead of renewing.
  const autoRenewalOff = currentPlan?.autoRenewal === false && !!currentPlan?.willExpireOn;
  const scheduledDowngrade = currentPlan?.scheduledDowngrade ?? null;

  // ── Usage meter values (from the new /subscriptions/me `usage` field) ──
  const usage = data?.usage;
  const isUnlimited = usage?.maxSpaces === -1;
  const usagePct = usage && !isUnlimited && usage.maxSpaces > 0
    ? Math.min(100, Math.max(0, Math.round((usage.spacesUsed / usage.maxSpaces) * 100)))
    : 0;
  const usageMaxLabel = isUnlimited ? 'Unlimited' : String(usage?.maxSpaces ?? 0);
  const expiryLabel = usage
    ? usage.isExpired
      ? 'Expired'
      : `Expires in ${usage.daysRemaining} day${usage.daysRemaining === 1 ? '' : 's'}`
    : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <PageHeader title="Subscription"  onBack={() => router.replace('/(my-spaces)')} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchData(true)}
            tintColor={Colors.primary}
          />
        }
      >

        {/* Current Plan Hero */}
        <LinearGradient
          colors={[Colors.textPrimary, ExtendedColors.darkCard]}
          style={styles.planCard}
        >
          <View style={styles.planBadge}>
            <Star size={12} color={Colors.amber} fill={Colors.amber} />
            <Text style={styles.planBadgeText}>CURRENT PLAN</Text>
          </View>
          <Text style={styles.planName}>
            {isFreePlan ? 'Free' : currentPlan?.name ?? 'Free'}
          </Text>
          {!isFreePlan && (
            <Text style={styles.planPrice}>
              {formatAmount(currentPlan?.price ?? 0)}
              <Text style={styles.planPeriod}>{billingCycleLabel}</Text>
            </Text>
          )}
          <View style={styles.planDivider} />
          <View style={styles.planFooter}>
            <View style={styles.planFooterItem}>
              <Text style={styles.planFooterLabel}>
                {autoRenewalOff ? 'Expires On' : 'Next Billing'}
              </Text>
              <Text style={styles.planFooterValue}>
                {isFreePlan
                  ? '—'
                  : formatDate(
                      autoRenewalOff
                        ? currentPlan?.willExpireOn ?? ''
                        : currentPlan?.renewalDate ?? ''
                    )}
              </Text>
            </View>
            <View style={styles.planFooterDivider} />
            <View style={styles.planFooterItem}>
              <Text style={styles.planFooterLabel}>Status</Text>
              <View style={styles.activeBadge}>
                <View style={[styles.activeDot, !isActive && styles.inactiveDot]} />
                <Text style={[styles.activeBadgeText, !isActive && styles.inactiveBadgeText]}>
                  {statusText}
                </Text>
              </View>
            </View>
          </View>

          {/* Usage meter — spaces consumed against the plan limit + expiry */}
          {usage && (
            <View style={styles.usageBlock}>
              <View style={styles.usageHeader}>
                <Text style={styles.usageLabel}>Spaces Used</Text>
                <Text style={styles.usageValue}>
                  {usage.spacesUsed} / {usageMaxLabel}
                </Text>
              </View>
              <View style={styles.usageBarTrack}>
                <View
                  style={[
                    styles.usageBarFill,
                    { width: isUnlimited ? '100%' : `${usagePct}%` },
                    isUnlimited && styles.usageBarFillUnlimited,
                  ]}
                />
              </View>
              {expiryLabel && (
                <Text style={[styles.usageExpiry, usage.isExpired && styles.usageExpiryExpired]}>
                  {expiryLabel}
                </Text>
              )}
            </View>
          )}
        </LinearGradient>

        {/* Scheduled downgrade — backend keeps current plan until renewalDate */}
        {!isFreePlan && scheduledDowngrade && (
          <View style={styles.infoBanner}>
            <TrendingUp
              size={16}
              color={Colors.warning}
              style={{ transform: [{ rotate: '180deg' }] }}
            />
            <Text style={styles.infoBannerText}>
              Downgrade to {scheduledDowngrade.planName} scheduled for{' '}
              {formatDate(currentPlan?.renewalDate ?? '')}.
            </Text>
          </View>
        )}

        {/* Auto-renewal off — plan will expire on willExpireOn */}
        {!isFreePlan && autoRenewalOff && (
          <View style={styles.infoBanner}>
            <Shield size={16} color={Colors.warning} />
            <Text style={styles.infoBannerText}>
              Auto-renewal is off · Expires {formatDate(currentPlan?.willExpireOn ?? '')}.
            </Text>
          </View>
        )}

        {/* Plan Features */}
        {features.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>What's Included</Text>
            <View style={styles.featuresCard}>
              {features.map((feature, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.featureRow,
                    idx < features.length - 1 && styles.featureRowBorder,
                  ]}
                >
                  <CheckCircle2 size={16} color={Colors.successAlt} strokeWidth={2.5} />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Actions */}
        <Text style={styles.sectionTitle}>Manage Plan</Text>
        {isFreePlan ? (
          <TouchableOpacity
            style={styles.choosePlanButton}
            onPress={() => router.push('/(my-spaces)/subscription-plans')}
          >
            <CreditCard size={18} color={Colors.white} />
            <Text style={styles.choosePlanButtonText}>Choose a Plan</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.actionsCard}>
            <TouchableOpacity style={styles.actionRow} onPress={handleUpgradePress}>
              <View style={[styles.actionIconWrapper, { backgroundColor: Colors.warningBg }]}>
                <Zap size={16} color={Colors.warning} />
              </View>
              <View style={styles.actionInfo}>
                <Text style={styles.actionTitle}>Change Plan</Text>
                <Text style={styles.actionSub}>Upgrade for more spaces & features</Text>
              </View>
              <ChevronRight size={16} color={Colors.borderMuted} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => router.push('/(my-spaces)/subscription-plans')}
            >
              <View style={[styles.actionIconWrapper, { backgroundColor: ExtendedColors.analyticsBg }]}>
                <TrendingUp
                  size={16}
                  color={Colors.textSecondary}
                  style={{ transform: [{ rotate: '180deg' }] }}
                />
              </View>
              <View style={styles.actionInfo}>
                <Text style={styles.actionTitle}>Downgrade Plan</Text>
                <Text style={styles.actionSub}>Switch to a lower tier plan</Text>
              </View>
              <ChevronRight size={16} color={Colors.borderMuted} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => router.push('/(home)/manage-billing')}
            >
              <View style={[styles.actionIconWrapper, { backgroundColor: ExtendedColors.analyticsBg }]}>
                <Receipt size={16} color={Colors.textSecondary} />
              </View>
              <View style={styles.actionInfo}>
                <Text style={styles.actionTitle}>Billing Details</Text>
                <Text style={styles.actionSub}>Name, email & GSTIN for invoices</Text>
              </View>
              <ChevronRight size={16} color={Colors.borderMuted} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={[styles.actionRow, autoRenewalOff && styles.actionRowDisabled]}
              onPress={handleCancelSubscription}
              disabled={cancelling || autoRenewalOff}
            >
              <View
                style={[
                  styles.actionIconWrapper,
                  { backgroundColor: autoRenewalOff ? Colors.surfaceBg : Colors.errorBg },
                ]}
              >
                {cancelling ? (
                  <ActivityIndicator size="small" color={Colors.errorAlt} />
                ) : (
                  <Shield size={16} color={autoRenewalOff ? Colors.textMuted : Colors.errorAlt} />
                )}
              </View>
              <View style={styles.actionInfo}>
                {autoRenewalOff ? (
                  <>
                    <Text style={styles.actionTitle}>Auto-renewal off</Text>
                    <Text style={styles.actionSub}>
                      Expires {formatDate(currentPlan?.willExpireOn ?? '')}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={[styles.actionTitle, { color: Colors.errorAlt }]}>
                      Turn Off Auto-Renewal
                    </Text>
                    <Text style={styles.actionSub}>Plan stays active until renewal date</Text>
                  </>
                )}
              </View>
              {!autoRenewalOff && <ChevronRight size={16} color={Colors.borderMuted} />}
            </TouchableOpacity>
          </View>
        )}

        {/* Billing History — real transaction ledger (/subscriptions/me/transactions).
            Each row is tappable to open an in-app receipt (screenshot-friendly);
            there is no subscription invoice PDF endpoint on the backend. */}
        {txns.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Billing History</Text>
            <Text style={styles.billingHint}>Tap a payment to view its receipt</Text>
            <View style={styles.billingCard}>
              {/* Show only the latest few here; the full ledger lives on its own
                  page (linked via "View all") so a long history doesn't make this
                  screen scroll forever. */}
              {txns.slice(0, BILLING_PREVIEW_COUNT).map((t, idx, shown) => {
                const isPaid = t.status?.toUpperCase() === 'SUCCESS';
                return (
                  <View key={t.id}>
                    <TouchableOpacity
                      style={styles.billingRow}
                      onPress={() => setReceiptTxn(t)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.billingInfo}>
                        <Text style={styles.billingDate}>{formatDate(t.date)}</Text>
                        <Text style={styles.billingId} numberOfLines={1}>{t.description || t.id}</Text>
                      </View>
                      <View style={styles.billingRight}>
                        <Text style={styles.billingAmount}>{t.amountDisplay}</Text>
                        <View style={[styles.paidBadge, !isPaid && styles.pendingBadge]}>
                          <Text style={[styles.paidBadgeText, !isPaid && styles.pendingBadgeText]}>
                            {t.status}
                          </Text>
                        </View>
                      </View>
                      <Receipt size={16} color={Colors.borderMuted} style={styles.billingReceiptIcon} />
                    </TouchableOpacity>
                    {idx < shown.length - 1 && <View style={styles.divider} />}
                  </View>
                );
              })}

              {/* "View all" — only when there are more than the preview count. */}
              {txns.length > BILLING_PREVIEW_COUNT && (
                <>
                  <View style={styles.divider} />
                  <TouchableOpacity
                    style={styles.viewAllRow}
                    onPress={() => router.push('/(my-spaces)/billing-history')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.viewAllText}>View all {txns.length} payments</Text>
                    <ChevronRight size={16} color={Colors.primary} />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </>
        )}

        {/* Subscription Help — opens a static FAQ modal */}
        <TouchableOpacity
          style={styles.helpRow}
          onPress={() => setHelpVisible(true)}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIconWrapper, { backgroundColor: Colors.infoBg }]}>
            <HelpCircle size={16} color={Colors.info} />
          </View>
          <View style={styles.actionInfo}>
            <Text style={styles.actionTitle}>Subscription Help</Text>
            <Text style={styles.actionSub}>How plans, billing & cancellation work</Text>
          </View>
          <ChevronRight size={16} color={Colors.borderMuted} />
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Receipt modal — in-app receipt for a subscription payment ── */}
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
                  <Star size={16} color={Colors.amber} fill={Colors.amber} />
                  <Text style={styles.receiptBrand}>ParkSwift</Text>
                </View>
                <Text style={styles.receiptSubhead}>Payment Receipt</Text>
              </View>

              {receiptTxn && (
                <View style={styles.receiptBody}>
                  <View style={styles.receiptAmountBlock}>
                    <Text style={styles.receiptAmountLabel}>Amount</Text>
                    <Text style={styles.receiptAmount}>
                      {receiptTxn.amountDisplay?.replace(/^\+/, '')}
                    </Text>
                    <View
                      style={[
                        styles.paidBadge,
                        receiptTxn.status?.toUpperCase() !== 'SUCCESS' && styles.pendingBadge,
                      ]}
                    >
                      <Text
                        style={[
                          styles.paidBadgeText,
                          receiptTxn.status?.toUpperCase() !== 'SUCCESS' && styles.pendingBadgeText,
                        ]}
                      >
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
                    <Text style={[styles.receiptRowValue, styles.receiptRowValueWrap]}>
                      {receiptTxn.description || '—'}
                    </Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptRowLabel}>Payment Method</Text>
                    <Text style={styles.receiptRowValue}>
                      {receiptTxn.method ? receiptTxn.method.replace(/_/g, ' ') : '—'}
                    </Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptRowLabel}>Date</Text>
                    <Text style={styles.receiptRowValue}>{formatDate(receiptTxn.date)}</Text>
                  </View>

                  <Text style={styles.receiptFooterNote}>
                    This is a system-generated receipt. Screenshot it for your records.
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.receiptDoneBtn}
                onPress={() => setReceiptTxn(null)}
              >
                <Text style={styles.receiptDoneBtnText}>Done</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Subscription Help modal — static FAQ ── */}
      <Modal
        visible={helpVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setHelpVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.helpCard}>
            <View style={styles.helpHeader}>
              <View style={styles.helpHeaderTitleRow}>
                <HelpCircle size={18} color={Colors.primary} />
                <Text style={styles.helpHeaderTitle}>How Subscriptions Work</Text>
              </View>
              <TouchableOpacity
                onPress={() => setHelpVisible(false)}
                style={styles.helpCloseBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={18} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.helpScroll}
              contentContainerStyle={styles.helpScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {HELP_ITEMS.map((item, idx) => (
                <View key={idx} style={styles.helpItem}>
                  <Text style={styles.helpQuestion}>{item.q}</Text>
                  <Text style={styles.helpAnswer}>{item.a}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.screenBg,
  },
  content: {
    padding: Spacing['3xl'],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  planCard: {
    paddingHorizontal: Spacing.screenH,
    paddingVertical: Spacing['3xl'],
    borderRadius: BorderRadius.circleXl,
    marginBottom: Spacing['4xl'],
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  planBadgeText: {
    color: Colors.amber,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
  },
  planName: {
    fontSize: FontSize['4xl'],
    fontWeight: FontWeight.extrabold,
    color: Colors.white,
    letterSpacing: -0.5,
  },
  planPrice: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.bold,
    color: Colors.white,
    marginTop: Spacing.micro,
  },
  planPeriod: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.normal,
    color: Colors.textMuted,
  },
  planDivider: {
    height: 1,
    backgroundColor: ExtendedColors.whiteAlpha10,
    marginVertical: Spacing.xl,
  },
  planFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planFooterItem: {
    flex: 1,
  },
  planFooterLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  planFooterValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  planFooterDivider: {
    width: 1,
    height: 28,
    backgroundColor: ExtendedColors.whiteAlpha10,
    marginHorizontal: Spacing['3xl'],
  },
  usageBlock: {
    marginTop: Spacing.xl,
    paddingTop: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: ExtendedColors.whiteAlpha10,
  },
  usageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  usageLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  usageValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  usageBarTrack: {
    height: 6,
    borderRadius: BorderRadius.indicator,
    backgroundColor: ExtendedColors.whiteAlpha20,
    overflow: 'hidden',
  },
  usageBarFill: {
    height: '100%',
    borderRadius: BorderRadius.indicator,
    backgroundColor: Colors.amber,
  },
  usageBarFillUnlimited: {
    backgroundColor: ExtendedColors.whiteAlpha40,
  },
  usageExpiry: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
    fontWeight: FontWeight.medium,
  },
  usageExpiryExpired: {
    color: Colors.errorAlt,
    fontWeight: FontWeight.bold,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: BorderRadius.indicator,
    backgroundColor: Colors.successAlt,
  },
  inactiveDot: {
    backgroundColor: Colors.errorAlt,
  },
  activeBadgeText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.successAlt,
  },
  inactiveBadgeText: {
    color: Colors.errorAlt,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  featuresCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing['4xl'],
    overflow: 'hidden',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xl,
    paddingVertical: 13,
    paddingHorizontal: Spacing['3xl'],
  },
  featureRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBg,
  },
  featureText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.textPrimary,
  },
  choosePlanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xl,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.button,
    paddingVertical: Spacing['2xl'],
    marginBottom: Spacing['4xl'],
  },
  choosePlanButtonText: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    backgroundColor: Colors.warningBg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.warning,
    paddingVertical: Spacing['2xl'],
    paddingHorizontal: Spacing['3xl'],
    marginBottom: Spacing['4xl'],
    marginTop: -Spacing.lg,
  },
  infoBannerText: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  actionsCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing['4xl'],
    overflow: 'hidden',
  },
  actionRowDisabled: {
    opacity: 0.7,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
    paddingHorizontal: Spacing['3xl'],
    gap: Spacing.xl,
  },
  actionIconWrapper: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionInfo: {
    flex: 1,
  },
  actionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.micro,
  },
  actionSub: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  billingCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  billingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing['2xl'],
    paddingHorizontal: Spacing['3xl'],
  },
  billingInfo: {},
  billingDate: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.micro,
  },
  billingId: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  billingRight: {
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  billingAmount: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.extrabold,
    color: Colors.textPrimary,
  },
  paidBadge: {
    backgroundColor: Colors.successBgAlt,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.micro,
    borderRadius: BorderRadius.badge,
  },
  paidBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: ExtendedColors.teal,
  },
  pendingBadge: {
    backgroundColor: Colors.warningBg,
  },
  pendingBadgeText: {
    color: Colors.warning,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.surfaceBg,
  },
  billingHint: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: -Spacing.sm,
    marginBottom: Spacing.lg,
  },
  billingReceiptIcon: {
    marginLeft: Spacing.lg,
  },
  viewAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing['2xl'],
  },
  viewAllText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  helpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xl,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing['2xl'],
    paddingHorizontal: Spacing['3xl'],
    marginTop: Spacing['4xl'],
  },
  // ── Shared modal overlay ──
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenH,
  },
  // ── Receipt modal ──
  modalCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.circleXl,
    width: '100%',
    maxHeight: '85%',
    overflow: 'hidden',
  },
  receiptHeader: {
    backgroundColor: Colors.textPrimary,
    paddingVertical: Spacing['3xl'],
    alignItems: 'center',
  },
  receiptBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  receiptBrand: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.extrabold,
    color: Colors.white,
    letterSpacing: -0.5,
  },
  receiptSubhead: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
    fontWeight: FontWeight.medium,
  },
  receiptBody: {
    paddingHorizontal: Spacing.screenH,
    paddingVertical: Spacing['3xl'],
  },
  receiptAmountBlock: {
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing['2xl'],
  },
  receiptAmountLabel: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    fontWeight: FontWeight.medium,
  },
  receiptAmount: {
    fontSize: FontSize['5xl'],
    fontWeight: FontWeight.extrabold,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  receiptDivider: {
    height: 1,
    backgroundColor: Colors.surfaceBg,
    marginBottom: Spacing.lg,
  },
  receiptRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: Spacing.lg,
    gap: Spacing.xl,
  },
  receiptRowLabel: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    flexShrink: 0,
  },
  receiptRowValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    textAlign: 'right',
  },
  receiptRowValueWrap: {
    flex: 1,
  },
  receiptFooterNote: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing['2xl'],
    lineHeight: 16,
  },
  receiptDoneBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing['2xl'],
    alignItems: 'center',
    marginHorizontal: Spacing.screenH,
    marginBottom: Spacing.screenH,
    borderRadius: BorderRadius.button,
  },
  receiptDoneBtnText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  // ── Help modal ──
  helpCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.circleXl,
    width: '100%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  helpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenH,
    paddingVertical: Spacing['3xl'],
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBg,
  },
  helpHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  helpHeaderTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  helpCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surfaceBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpScroll: {
    flexGrow: 0,
  },
  helpScrollContent: {
    paddingHorizontal: Spacing.screenH,
    paddingVertical: Spacing['2xl'],
  },
  helpItem: {
    marginBottom: Spacing['3xl'],
  },
  helpQuestion: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  helpAnswer: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});

export default ManageSubscriptionScreen;
