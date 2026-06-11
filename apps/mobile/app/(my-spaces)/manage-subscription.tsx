import React from 'react';
import {View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Alert} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Star, Zap, Shield, TrendingUp, CheckCircle2, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PageHeader } from '../../components';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, ExtendedColors } from '../../theme';

const ManageSubscriptionScreen = () => {
  const router = useRouter();

  const billingHistory = [
    { id: 'INV-001', date: 'May 1, 2026', amount: '₹999', status: 'Paid' },
    { id: 'INV-002', date: 'Apr 1, 2026', amount: '₹999', status: 'Paid' },
    { id: 'INV-003', date: 'Mar 1, 2026', amount: '₹999', status: 'Paid' },
  ];

  const features = [
    'List up to 10 parking spaces',
    'Priority listing on the map',
    'Detailed analytics & reports',
    'Compliance risk badge',
    'Owner support (24/7)',
    'No booking commission',
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <PageHeader title="Subscription" />

      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.content} 
        showsVerticalScrollIndicator={false}
      >

        {/* Current Plan Hero */}
        <LinearGradient colors={[Colors.textPrimary, ExtendedColors.darkCard]} style={styles.planCard}>
          <View style={styles.planBadge}>
            <Star size={12} color={Colors.amber} fill={Colors.amber} />
            <Text style={styles.planBadgeText}>CURRENT PLAN</Text>
          </View>
          <Text style={styles.planName}>Pro Active</Text>
          <Text style={styles.planPrice}>₹999<Text style={styles.planPeriod}>/month</Text></Text>
          <View style={styles.planDivider} />
          <View style={styles.planFooter}>
            <View style={styles.planFooterItem}>
              <Text style={styles.planFooterLabel}>Next Billing</Text>
              <Text style={styles.planFooterValue}>Jun 1, 2026</Text>
            </View>
            <View style={styles.planFooterDivider} />
            <View style={styles.planFooterItem}>
              <Text style={styles.planFooterLabel}>Status</Text>
              <View style={styles.activeBadge}>
                <View style={styles.activeDot} />
                <Text style={styles.activeBadgeText}>Active</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Plan Features */}
        <Text style={styles.sectionTitle}>What's Included</Text>
        <View style={styles.featuresCard}>
          {features.map((feature, idx) => (
            <View key={idx} style={[styles.featureRow, idx < features.length - 1 && styles.featureRowBorder]}>
              <CheckCircle2 size={16} color={Colors.successAlt} strokeWidth={2.5} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        {/* Actions */}
        <Text style={styles.sectionTitle}>Manage Plan</Text>
        <View style={styles.actionsCard}>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => Alert.alert('Upgrade', 'Enterprise plan coming soon!')}
          >
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
            onPress={() => Alert.alert('Downgrade', 'You can downgrade at the end of your billing cycle.')}
          >
            <View style={[styles.actionIconWrapper, { backgroundColor: ExtendedColors.analyticsBg }]}>
              <TrendingUp size={16} color={Colors.textSecondary} style={{ transform: [{ rotate: '180deg' }] }} />
            </View>
            <View style={styles.actionInfo}>
              <Text style={styles.actionTitle}>Downgrade Plan</Text>
              <Text style={styles.actionSub}>Switch to Basic (free)</Text>
            </View>
            <ChevronRight size={16} color={Colors.borderMuted} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => Alert.alert('Cancel', 'Are you sure you want to cancel your subscription?', [
              { text: 'No', style: 'cancel' },
              { text: 'Cancel Subscription', style: 'destructive' },
            ])}
          >
            <View style={[styles.actionIconWrapper, { backgroundColor: Colors.errorBg }]}>
              <Shield size={16} color={Colors.errorAlt} />
            </View>
            <View style={styles.actionInfo}>
              <Text style={[styles.actionTitle, { color: Colors.errorAlt }]}>Cancel Subscription</Text>
              <Text style={styles.actionSub}>Effective at end of billing period</Text>
            </View>
            <ChevronRight size={16} color={Colors.borderMuted} />
          </TouchableOpacity>
        </View>

        {/* Billing History */}
        <Text style={styles.sectionTitle}>Billing History</Text>
        <View style={styles.billingCard}>
          {billingHistory.map((bill, idx) => (
            <View key={bill.id}>
              <View style={styles.billingRow}>
                <View style={styles.billingInfo}>
                  <Text style={styles.billingDate}>{bill.date}</Text>
                  <Text style={styles.billingId}>{bill.id}</Text>
                </View>
                <View style={styles.billingRight}>
                  <Text style={styles.billingAmount}>{bill.amount}</Text>
                  <View style={styles.paidBadge}>
                    <Text style={styles.paidBadgeText}>{bill.status}</Text>
                  </View>
                </View>
              </View>
              {idx < billingHistory.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

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
  planCard: {
    padding: Spacing.screenH,
    borderRadius: BorderRadius.circleXl,            // 20 = circleXl ✓
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
    fontSize: FontSize.xs,                          // 11 = xs ✓
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
  },
  planName: {
    fontSize: FontSize['5xl'],                      // 26 = 5xl ✓
    fontWeight: FontWeight.extrabold,
    color: Colors.white,
    marginBottom: Spacing.xs,
    letterSpacing: -0.5,
  },
  planPrice: {
    fontSize: FontSize['3xl'],                      // 20 = 3xl ✓
    fontWeight: FontWeight.bold,
    color: Colors.white,
    marginBottom: Spacing.micro,
  },
  planPeriod: {
    fontSize: FontSize.md,                          // 14 = md ✓
    fontWeight: FontWeight.normal,
    color: Colors.textMuted,
  },
  planDivider: {
    height: 1,
    backgroundColor: ExtendedColors.whiteAlpha10,   // 'rgba(255,255,255,0.1)' ✓
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
    fontSize: FontSize.xs,                          // 11 = xs ✓
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  planFooterValue: {
    fontSize: FontSize.md,                          // 14 = md ✓
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  planFooterDivider: {
    width: 1,
    height: 28,
    backgroundColor: ExtendedColors.whiteAlpha10,   // 'rgba(255,255,255,0.1)' ✓
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
    borderRadius: BorderRadius.indicator,           // 3 = indicator ✓
    backgroundColor: Colors.successAlt,
  },
  activeBadgeText: {
    fontSize: FontSize.base,                        // 13 = base ✓
    fontWeight: FontWeight.bold,
    color: Colors.successAlt,
  },
  sectionTitle: {
    fontSize: FontSize.lg,                          // 15 = lg ✓
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  featuresCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,                  // 16 = lg ✓
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
    fontSize: FontSize.md,                          // 14 = md ✓
    fontWeight: FontWeight.medium,
    color: Colors.textPrimary,
  },
  actionsCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,                  // 16 = lg ✓
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
    borderRadius: BorderRadius.sm,                  // 8 = sm ✓
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionInfo: {
    flex: 1,
  },
  actionTitle: {
    fontSize: FontSize.md,                          // 14 = md ✓
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.micro,
  },
  actionSub: {
    fontSize: FontSize.sm,                          // 12 = sm ✓
    color: Colors.textSecondary,
  },
  billingCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,                  // 16 = lg ✓
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
    fontSize: FontSize.md,                          // 14 = md ✓
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.micro,
  },
  billingId: {
    fontSize: FontSize.sm,                          // 12 = sm ✓
    color: Colors.textMuted,
  },
  billingRight: {
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  billingAmount: {
    fontSize: FontSize.lg,                          // 15 = lg ✓
    fontWeight: FontWeight.extrabold,
    color: Colors.textPrimary,
  },
  paidBadge: {
    backgroundColor: Colors.successBgAlt,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.micro,
    borderRadius: BorderRadius.badge,               // 6 = badge ✓
  },
  paidBadgeText: {
    fontSize: FontSize.xs,                          // 11 = xs ✓
    fontWeight: FontWeight.bold,
    color: ExtendedColors.teal,                     // '#059669' ✓
  },
  divider: {
    height: 1,
    backgroundColor: Colors.surfaceBg,
  },
});

export default ManageSubscriptionScreen;
