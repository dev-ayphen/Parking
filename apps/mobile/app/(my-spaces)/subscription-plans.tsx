import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CheckCircle2, Star, Zap } from 'lucide-react-native';
import PageHeader from '../../components/PageHeader';
import { api } from '../../services/api';
import { FontSize, FontWeight, BorderRadius, Spacing } from '../../theme';
import type { ColorsType } from '../../theme';
import { useTheme } from '../../hooks/useTheme';
import { toast } from '../../utils/toast';

interface Plan {
  id: number;
  name: string;
  description: string;
  price: number;
  yearlyPrice: number;
  features: string[];
  maxSpaces?: number;
  hasAnalytics?: boolean;
  hasFeaturedListing?: boolean;
  hasCsvExport?: boolean;
  hasPrioritySupport?: boolean;
}

// Human-readable "spaces" limit derived from the plan's maxSpaces capability.
// -1 = unlimited; 0/undefined = no listing allowed (free tier).
const spacesLimitLabel = (maxSpaces?: number): string | null => {
  if (maxSpaces == null) return null;
  if (maxSpaces === -1) return 'Unlimited spaces';
  if (maxSpaces === 0) return null;
  return `Up to ${maxSpaces} space${maxSpaces === 1 ? '' : 's'}`;
};

type BillingCycle = 'MONTHLY' | 'YEARLY';

const formatPrice = (amount: number, cycle: BillingCycle): string => {
  if (amount === 0) return 'Free';
  return `₹${amount.toLocaleString('en-IN')}/${cycle === 'MONTHLY' ? 'month' : 'year'}`;
};

const formatDate = (dateStr?: string | null): string => {
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

const calcSavings = (monthly: number, yearly: number): number | null => {
  if (!monthly || !yearly) return null;
  const yearlyEquivalent = monthly * 12;
  if (yearlyEquivalent <= yearly) return null;
  return Math.round(((yearlyEquivalent - yearly) / yearlyEquivalent) * 100);
};

export default function SubscriptionPlansScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePlanId, setActivePlanId] = useState<number | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('MONTHLY');
  const [subscribing, setSubscribing] = useState<number | null>(null);

  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true);
      const [plansJson, meJson] = await Promise.all([
        api.get('/subscriptions/plans'),
        api.get('/subscriptions/me').catch(() => null),
      ]);
      if (Array.isArray(plansJson)) {
        setPlans(plansJson as Plan[]);
      } else if (plansJson?.plans) {
        setPlans(plansJson.plans as Plan[]);
      }
      // Compare against the CATALOG plan id (currentPlan.planId), not the
      // subscription id (currentPlan.id), so the right card shows "Current Plan".
      if (meJson?.currentPlan?.planId != null) {
        setActivePlanId(meJson.currentPlan.planId);
      }
    } catch (e) {
      if (__DEV__) console.log('[SUBSCRIPTION_PLANS] error', e);
      toast.error('Failed to load plans. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleSelectPlan = (plan: Plan) => {
    if (plan.id === activePlanId) return;
    const price = billingCycle === 'MONTHLY' ? plan.price : plan.yearlyPrice;
    const amountStr = price === 0 ? 'Free' : `₹${price.toLocaleString('en-IN')}`;
    const cycleLabel = billingCycle === 'MONTHLY' ? 'Monthly' : 'Yearly';
    Alert.alert(
      `Subscribe to ${plan.name}`,
      `Amount: ${amountStr}\nBilling Cycle: ${cycleLabel}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Subscribe',
          onPress: async () => {
            try {
              setSubscribing(plan.id);
              // Price is derived server-side — do NOT send it.
              const res = await api.post('/subscriptions', {
                planId: plan.id,
                billingCycle,
              });
              if (res?.scheduled === true) {
                Alert.alert(
                  'Downgrade Scheduled',
                  `Your ${plan.name} plan starts on ${formatDate(res.effectiveOn)}. You keep your current plan until then.`
                );
              } else {
                toast.success(`Subscribed to ${plan.name}!`);
              }
              router.back();
            } catch (e) {
              if (__DEV__) console.log('[SUBSCRIBE] error', e);
              toast.error('Failed to subscribe. Please try again.');
            } finally {
              setSubscribing(null);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <PageHeader title="Choose a Plan"  onBack={() => router.replace('/(my-spaces)')} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading plans...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (plans.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <PageHeader title="Choose a Plan"  onBack={() => router.replace('/(my-spaces)')} />
        <View style={styles.emptyContainer}>
          <Zap size={56} color={colors.borderMuted} />
          <Text style={styles.emptyTitle}>No Plans Available</Text>
          <Text style={styles.emptyDesc}>
            No subscription plans are available at this time. Please check back later.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <PageHeader title="Choose a Plan"  onBack={() => router.replace('/(my-spaces)')} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Billing cycle toggle */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleOption, billingCycle === 'MONTHLY' && styles.toggleOptionActive]}
            onPress={() => setBillingCycle('MONTHLY')}
          >
            <Text
              style={[
                styles.toggleOptionText,
                billingCycle === 'MONTHLY' && styles.toggleOptionTextActive,
              ]}
            >
              Monthly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleOption, billingCycle === 'YEARLY' && styles.toggleOptionActive]}
            onPress={() => setBillingCycle('YEARLY')}
          >
            <Text
              style={[
                styles.toggleOptionText,
                billingCycle === 'YEARLY' && styles.toggleOptionTextActive,
              ]}
            >
              Yearly
            </Text>
            {plans.some((p) => calcSavings(p.price, p.yearlyPrice) !== null) && (
              <View style={styles.savingsChip}>
                <Text style={styles.savingsChipText}>Save up to 20%</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Plan cards */}
        {plans.map((plan) => {
          const isCurrentPlan = plan.id === activePlanId;
          const isSubscribing = subscribing === plan.id;
          const price = billingCycle === 'MONTHLY' ? plan.price : plan.yearlyPrice;
          const savings = calcSavings(plan.price, plan.yearlyPrice);
          const isFeatured =
            plan.name.toLowerCase().includes('pro') ||
            plan.name.toLowerCase().includes('enterprise');

          return (
            <View key={plan.id} style={[styles.planCard, isFeatured && styles.planCardFeatured]}>
              {/* Card header */}
              <View style={styles.planCardHeader}>
                <View style={styles.planHeaderTop}>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <View style={styles.badgeContainer}>
                    {isCurrentPlan && (
                      <View style={styles.currentBadge}>
                        <Text style={styles.currentBadgeText}>Current</Text>
                      </View>
                    )}
                    {isFeatured && (
                      <View style={styles.featuredBadge}>
                        <Star size={10} color={colors.primary} fill={colors.primary} />
                        <Text style={styles.featuredBadgeText}>POPULAR</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={styles.priceRow}>
                  <Text style={styles.planPrice}>
                    {price === 0
                      ? 'Free'
                      : `₹${price.toLocaleString('en-IN')}`}
                  </Text>
                  {price > 0 && (
                    <Text style={styles.planPriceCycle}>
                      /{billingCycle === 'MONTHLY' ? 'month' : 'year'}
                    </Text>
                  )}
                  {billingCycle === 'YEARLY' && savings !== null && (
                    <View style={styles.savingsBadge}>
                      <Text style={styles.savingsBadgeText}>Save {savings}%</Text>
                    </View>
                  )}
                </View>
                {plan.description ? (
                  <Text style={styles.planDescription}>{plan.description}</Text>
                ) : null}
              </View>

              {/* Features list — lead with the real space limit from maxSpaces. */}
              <View style={styles.featuresSection}>
                {spacesLimitLabel(plan.maxSpaces) && (
                  <View style={styles.featureRow}>
                    <CheckCircle2 size={15} color={colors.successAlt} strokeWidth={2.5} />
                    <Text style={[styles.featureText, styles.featureTextStrong]}>
                      {spacesLimitLabel(plan.maxSpaces)}
                    </Text>
                  </View>
                )}
                {(plan.features ?? []).map((feature, idx) => (
                  <View key={idx} style={styles.featureRow}>
                    <CheckCircle2 size={15} color={colors.successAlt} strokeWidth={2.5} />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>

              {/* CTA button */}
              <TouchableOpacity
                style={[
                  styles.selectButton,
                  isFeatured ? styles.selectButtonFeatured : styles.selectButtonStandard,
                  isCurrentPlan && styles.currentPlanButton,
                  isSubscribing && styles.selectButtonLoading,
                ]}
                onPress={() => handleSelectPlan(plan)}
                disabled={isCurrentPlan || isSubscribing}
                activeOpacity={0.8}
              >
                {isSubscribing ? (
                  <ActivityIndicator size="small" color={isFeatured ? colors.primary : colors.white} />
                ) : (
                  <Text
                    style={[
                      styles.selectButtonText,
                      isFeatured ? styles.selectButtonFeaturedText : styles.selectButtonStandardText,
                      isCurrentPlan && styles.currentPlanButtonText,
                    ]}
                  >
                    {isCurrentPlan ? 'Current Plan' : 'Select Plan'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ColorsType) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollView: {
    flex: 1,
    backgroundColor: colors.screenBg,
  },
  content: {
    padding: Spacing['3xl'],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing['3xl'],
  },
  loadingText: {
    fontSize: FontSize.md,
    color: colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing['4xl'],
    gap: Spacing['3xl'],
  },
  emptyTitle: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.bold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: FontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceBg,
    borderRadius: BorderRadius.md,
    padding: Spacing.xs,
    marginBottom: Spacing['4xl'],
  },
  toggleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.input,
    gap: Spacing.md,
  },
  toggleOptionActive: {
    backgroundColor: colors.white,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  toggleOptionText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: colors.textSecondary,
  },
  toggleOptionTextActive: {
    color: colors.textPrimary,
  },
  savingsChip: {
    backgroundColor: colors.successBg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.micro,
    borderRadius: BorderRadius.badge,
  },
  savingsChipText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: colors.successAlt,
  },
  planCard: {
    backgroundColor: colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginBottom: Spacing['3xl'],
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  planCardFeatured: {
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: colors.primaryBg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.badge,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  featuredBadgeText: {
    fontSize: FontSize.xs - 1,
    fontWeight: FontWeight.bold,
    color: colors.primary,
    letterSpacing: 0.5,
  },
  planCardHeader: {
    padding: Spacing['3xl'],
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  planHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  planName: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.extrabold,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  currentBadge: {
    backgroundColor: colors.successBg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.badge,
    borderWidth: 1,
    borderColor: colors.success,
  },
  currentBadgeText: {
    fontSize: FontSize.xs - 1,
    fontWeight: FontWeight.bold,
    color: colors.success,
    letterSpacing: 0.5,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  planPrice: {
    fontSize: FontSize['4xl'],
    fontWeight: FontWeight.extrabold,
    color: colors.textPrimary,
  },
  planPriceCycle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: colors.textSecondary,
  },
  savingsBadge: {
    backgroundColor: colors.successBg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.badge,
    marginLeft: Spacing.md,
  },
  savingsBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: colors.success,
  },
  planDescription: {
    fontSize: FontSize.sm,
    color: colors.textSecondary,
    marginTop: Spacing.md,
    lineHeight: 18,
  },
  featuresSection: {
    padding: Spacing['3xl'],
    gap: Spacing['2xl'],
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xl,
  },
  featureText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: colors.textPrimary,
    flex: 1,
  },
  featureTextStrong: {
    fontWeight: FontWeight.bold,
  },
  selectButton: {
    marginHorizontal: Spacing['3xl'],
    marginBottom: Spacing['3xl'],
    borderRadius: BorderRadius.button,
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
  },
  selectButtonStandard: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  selectButtonStandardText: {
    color: colors.primary,
  },
  selectButtonFeatured: {
    backgroundColor: colors.primaryBg,
  },
  selectButtonFeaturedText: {
    color: colors.primary,
  },
  selectButtonLoading: {
    opacity: 0.7,
  },
  currentPlanButton: {
    backgroundColor: colors.surfaceBg,
    borderWidth: 0,
  },
  selectButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  currentPlanButtonText: {
    color: colors.textSecondary,
  },
});
