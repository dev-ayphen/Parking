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
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CheckCircle2, Star, Zap, Shield } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import PageHeader from '../../components/PageHeader';
import { api } from '../../services/api';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, ExtendedColors } from '../../theme';

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  yearlyPrice: number;
  features: string[];
}

type BillingCycle = 'MONTHLY' | 'YEARLY';

const PLAN_ACCENT: Record<string, { gradient: [string, string]; icon: React.ReactNode }> = {
  default: {
    gradient: [Colors.textPrimary, ExtendedColors.darkCard],
    icon: <Shield size={20} color={Colors.white} />,
  },
};

const getPlanAccent = (planName: string): { gradient: [string, string]; iconColor: string } => {
  const lower = planName.toLowerCase();
  if (lower.includes('enterprise') || lower.includes('premium')) {
    return { gradient: [Colors.primary, '#9B0042'], iconColor: Colors.white };
  }
  if (lower.includes('pro') || lower.includes('business')) {
    return { gradient: ['#1E40AF', '#1D4ED8'], iconColor: Colors.white };
  }
  return { gradient: [Colors.textPrimary, ExtendedColors.darkCard], iconColor: Colors.white };
};

const formatPrice = (amount: number, cycle: BillingCycle): string => {
  if (amount === 0) return 'Free';
  return `₹${amount.toLocaleString('en-IN')}/${cycle === 'MONTHLY' ? 'month' : 'year'}`;
};

const calcSavings = (monthly: number, yearly: number): number | null => {
  if (!monthly || !yearly) return null;
  const yearlyEquivalent = monthly * 12;
  if (yearlyEquivalent <= yearly) return null;
  return Math.round(((yearlyEquivalent - yearly) / yearlyEquivalent) * 100);
};

export default function SubscriptionPlansScreen() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('MONTHLY');
  const [subscribing, setSubscribing] = useState<string | null>(null);

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
      if (meJson?.currentPlan?.id) {
        setActivePlanId(meJson.currentPlan.id);
      }
    } catch (e) {
      if (__DEV__) console.log('[SUBSCRIPTION_PLANS] error', e);
      Alert.alert('Error', 'Failed to load plans. Please try again.');
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
    const cycleLabel = billingCycle === 'MONTHLY' ? 'month' : 'year';
    const priceStr = price === 0 ? 'Free' : `₹${price.toLocaleString('en-IN')}/${cycleLabel}`;
    Alert.alert(
      `Subscribe to ${plan.name}`,
      `Subscribe to ${plan.name} for ${priceStr}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Subscribe',
          onPress: async () => {
            try {
              setSubscribing(plan.id);
              await api.post('/subscriptions', {
                planId: plan.id,
                billingCycle,
              });
              Alert.alert(
                'Subscribed!',
                `You are now subscribed to ${plan.name}.`,
                [{ text: 'OK', onPress: () => router.back() }]
              );
            } catch (e) {
              if (__DEV__) console.log('[SUBSCRIBE] error', e);
              Alert.alert('Error', 'Failed to subscribe. Please try again.');
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
        <StatusBar barStyle="dark-content" />
        <PageHeader title="Choose a Plan" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading plans...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (plans.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        <PageHeader title="Choose a Plan" />
        <View style={styles.emptyContainer}>
          <Zap size={56} color={Colors.borderMuted} />
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
      <StatusBar barStyle="dark-content" />
      <PageHeader title="Choose a Plan" />

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
          const accent = getPlanAccent(plan.name);
          const isFeatured =
            plan.name.toLowerCase().includes('pro') ||
            plan.name.toLowerCase().includes('enterprise');

          return (
            <View key={plan.id} style={[styles.planCard, isFeatured && styles.planCardFeatured]}>
              {isFeatured && (
                <View style={styles.featuredBadge}>
                  <Star size={10} color={Colors.amber} fill={Colors.amber} />
                  <Text style={styles.featuredBadgeText}>POPULAR</Text>
                </View>
              )}

              {/* Card header */}
              <LinearGradient
                colors={accent.gradient}
                style={styles.planCardHeader}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.planHeaderTop}>
                  <Text style={styles.planName}>{plan.name}</Text>
                  {isCurrentPlan && (
                    <View style={styles.currentBadge}>
                      <Text style={styles.currentBadgeText}>Current Plan</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.planPrice}>
                  {price === 0
                    ? 'Free'
                    : `₹${price.toLocaleString('en-IN')}`}
                  {price > 0 && (
                    <Text style={styles.planPriceCycle}>
                      /{billingCycle === 'MONTHLY' ? 'month' : 'year'}
                    </Text>
                  )}
                </Text>
                {billingCycle === 'YEARLY' && savings !== null && (
                  <Text style={styles.savingsText}>Save {savings}% vs monthly</Text>
                )}
                {plan.description ? (
                  <Text style={styles.planDescription}>{plan.description}</Text>
                ) : null}
              </LinearGradient>

              {/* Features list */}
              <View style={styles.featuresSection}>
                {(plan.features ?? []).map((feature, idx) => (
                  <View key={idx} style={styles.featureRow}>
                    <CheckCircle2 size={15} color={Colors.successAlt} strokeWidth={2.5} />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>

              {/* CTA button */}
              <TouchableOpacity
                style={[
                  styles.selectButton,
                  isCurrentPlan && styles.currentPlanButton,
                  isSubscribing && styles.selectButtonLoading,
                ]}
                onPress={() => handleSelectPlan(plan)}
                disabled={isCurrentPlan || isSubscribing}
                activeOpacity={0.8}
              >
                {isSubscribing ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text
                    style={[
                      styles.selectButtonText,
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  scrollView: {
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
    gap: Spacing['3xl'],
  },
  loadingText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
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
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceBg,
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
    backgroundColor: Colors.white,
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
    color: Colors.textSecondary,
  },
  toggleOptionTextActive: {
    color: Colors.textPrimary,
  },
  savingsChip: {
    backgroundColor: Colors.successBg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.micro,
    borderRadius: BorderRadius.badge,
  },
  savingsChipText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.successAlt,
  },
  planCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing['3xl'],
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  planCardFeatured: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.xs,
  },
  featuredBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    letterSpacing: 1,
  },
  planCardHeader: {
    padding: Spacing['3xl'],
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
    color: Colors.white,
    letterSpacing: -0.3,
  },
  currentBadge: {
    backgroundColor: ExtendedColors.whiteAlpha20,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.badge,
  },
  currentBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    letterSpacing: 0.5,
  },
  planPrice: {
    fontSize: FontSize['4xl'],
    fontWeight: FontWeight.extrabold,
    color: Colors.white,
    marginBottom: Spacing.xs,
  },
  planPriceCycle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.normal,
    color: ExtendedColors.whiteAlpha70,
  },
  savingsText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.amber,
    marginBottom: Spacing.xs,
  },
  planDescription: {
    fontSize: FontSize.sm,
    color: ExtendedColors.whiteAlpha70,
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
    color: Colors.textPrimary,
    flex: 1,
  },
  selectButton: {
    marginHorizontal: Spacing['3xl'],
    marginBottom: Spacing['3xl'],
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.button,
    paddingVertical: Spacing['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectButtonLoading: {
    opacity: 0.7,
  },
  currentPlanButton: {
    backgroundColor: Colors.surfaceBg,
  },
  selectButtonText: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  currentPlanButtonText: {
    color: Colors.textSecondary,
  },
});
