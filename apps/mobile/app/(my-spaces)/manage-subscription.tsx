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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Star, Zap, Shield, TrendingUp, CheckCircle2, ChevronRight, CreditCard, Receipt } from 'lucide-react-native';
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
  name: string;
  features: string[];
  price: number;
  status: string;
  renewalDate: string;
  billingCycle: string;
}

interface AvailablePlan {
  id: string;
  name: string;
  price: number;
  yearlyPrice: number;
  features: string[];
}

interface SubscriptionData {
  currentPlan: CurrentPlan;
  billingHistory: BillingRecord[];
  availablePlans: AvailablePlan[];
}

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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      const json = await api.get('/subscriptions/me');
      if (json) {
        setData(json as SubscriptionData);
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
    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel your subscription? It will remain active until the end of your current billing period.',
      [
        { text: 'Keep Plan', style: 'cancel' },
        {
          text: 'Cancel Subscription',
          style: 'destructive',
          onPress: async () => {
            try {
              setCancelling(true);
              await api.put(`/subscriptions/${data.currentPlan.id}/cancel`);
              await fetchData(true);
              toast.success('Subscription cancelled. Access continues until billing period ends.');
            } catch (e) {
              if (__DEV__) console.log('[CANCEL_SUBSCRIPTION] error', e);
              toast.error('Failed to cancel subscription. Please try again.');
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
        <PageHeader title="Subscription" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const currentPlan = data?.currentPlan;
  const billingHistory = data?.billingHistory ?? [];
  const features = currentPlan?.features ?? [];

  const billingCycleLabel = currentPlan?.billingCycle === 'YEARLY' ? '/year' : '/month';
  const statusText = currentPlan?.status
    ? currentPlan.status.charAt(0).toUpperCase() + currentPlan.status.slice(1).toLowerCase()
    : 'Active';
  const isActive = !currentPlan?.status || currentPlan.status.toUpperCase() === 'ACTIVE';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <PageHeader title="Subscription" />

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
              <Text style={styles.planFooterLabel}>Next Billing</Text>
              <Text style={styles.planFooterValue}>
                {isFreePlan ? '—' : formatDate(currentPlan?.renewalDate ?? '')}
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
        </LinearGradient>

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
                <Text style={styles.actionTitle}>Upgrade to Enterprise</Text>
                <Text style={styles.actionSub}>Unlimited spaces & priority support</Text>
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
              style={styles.actionRow}
              onPress={handleCancelSubscription}
              disabled={cancelling}
            >
              <View style={[styles.actionIconWrapper, { backgroundColor: Colors.errorBg }]}>
                {cancelling ? (
                  <ActivityIndicator size="small" color={Colors.errorAlt} />
                ) : (
                  <Shield size={16} color={Colors.errorAlt} />
                )}
              </View>
              <View style={styles.actionInfo}>
                <Text style={[styles.actionTitle, { color: Colors.errorAlt }]}>
                  Cancel Subscription
                </Text>
                <Text style={styles.actionSub}>Effective at end of billing period</Text>
              </View>
              <ChevronRight size={16} color={Colors.borderMuted} />
            </TouchableOpacity>
          </View>
        )}

        {/* Billing History */}
        {billingHistory.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Billing History</Text>
            <View style={styles.billingCard}>
              {billingHistory.map((bill, idx) => (
                <View key={bill.id}>
                  <View style={styles.billingRow}>
                    <View style={styles.billingInfo}>
                      <Text style={styles.billingDate}>{formatDate(bill.date)}</Text>
                      <Text style={styles.billingId}>{bill.id}</Text>
                    </View>
                    <View style={styles.billingRight}>
                      <Text style={styles.billingAmount}>{formatAmount(bill.amount)}</Text>
                      <View
                        style={[
                          styles.paidBadge,
                          bill.status?.toUpperCase() !== 'PAID' && styles.pendingBadge,
                        ]}
                      >
                        <Text
                          style={[
                            styles.paidBadgeText,
                            bill.status?.toUpperCase() !== 'PAID' && styles.pendingBadgeText,
                          ]}
                        >
                          {bill.status}
                        </Text>
                      </View>
                    </View>
                  </View>
                  {idx < billingHistory.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
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
    padding: Spacing.screenH,
    borderRadius: BorderRadius.circleXl,
    marginBottom: Spacing['4xl'],
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  planBadgeText: {
    color: Colors.amber,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
  },
  planName: {
    fontSize: FontSize['5xl'],
    fontWeight: FontWeight.extrabold,
    color: Colors.white,
    marginBottom: Spacing.xs,
    letterSpacing: -0.5,
  },
  planPrice: {
    fontSize: FontSize['3xl'],
    fontWeight: FontWeight.bold,
    color: Colors.white,
    marginBottom: Spacing.micro,
  },
  planPeriod: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.normal,
    color: Colors.textMuted,
  },
  planDivider: {
    height: 1,
    backgroundColor: ExtendedColors.whiteAlpha10,
    marginVertical: Spacing['3xl'],
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
  actionsCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing['4xl'],
    overflow: 'hidden',
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
});

export default ManageSubscriptionScreen;
