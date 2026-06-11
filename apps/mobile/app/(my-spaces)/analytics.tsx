import React from 'react';
import {View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { TrendingUp, Calendar, Car, Eye, Star } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import PageHeader from '../../components/PageHeader';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, ExtendedColors } from '../../theme';

const THEME_COLOR = Colors.primary;

const AnalyticsScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const spaceName = params.spaceName as string || 'Space Analytics';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <PageHeader title="Analytics" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Hero Revenue Card */}
        <LinearGradient colors={[Colors.textPrimary, ExtendedColors.darkCard]} style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <Text style={styles.heroLabel}>Total Revenue (May)</Text>
            <View style={styles.trendBadge}>
              <TrendingUp size={12} color={Colors.successAlt} />
              <Text style={styles.trendText}>+15.2%</Text>
            </View>
          </View>
          <Text style={styles.heroValue}>₹5,200</Text>
          <Text style={styles.heroSubtext}>Next Payout: May 25</Text>
          <View style={styles.heroDivider} />
          <View style={styles.heroFooter}>
            <View style={styles.heroFooterItem}>
              <Text style={styles.heroFooterLabel}>This Week</Text>
              <Text style={styles.heroFooterValue}>₹1,450</Text>
            </View>
            <View style={styles.heroFooterDivider} />
            <View style={styles.heroFooterItem}>
              <Text style={styles.heroFooterLabel}>Today</Text>
              <Text style={styles.heroFooterValue}>₹437</Text>
            </View>
          </View>
        </LinearGradient>

        <Text style={styles.sectionTitle}>Performance Metrics</Text>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statsCard}>
            <View style={[styles.statsIconWrapper, { backgroundColor: ExtendedColors.analyticsBg }]}>
              <Calendar size={18} color={Colors.textBody} />
            </View>
            <View>
              <Text style={styles.statsLabel}>Total Bookings</Text>
              <Text style={styles.statsValue}>15</Text>
            </View>
          </View>

          <View style={styles.statsCard}>
            <View style={[styles.statsIconWrapper, { backgroundColor: Colors.successBgAlt }]}>
              <Car size={18} color={Colors.successAlt} />
            </View>
            <View>
              <Text style={styles.statsLabel}>Occupancy</Text>
              <Text style={styles.statsValue}>68%</Text>
            </View>
          </View>

          <View style={styles.statsCard}>
            <View style={[styles.statsIconWrapper, { backgroundColor: Colors.warningBg }]}>
              <Star size={18} color={Colors.warning} />
            </View>
            <View>
              <Text style={styles.statsLabel}>Avg Rating</Text>
              <Text style={styles.statsValue}>4.8 <Text style={{fontSize: FontSize.sm, color: Colors.textSecondary}}>/5</Text></Text>
            </View>
          </View>

          <View style={styles.statsCard}>
            <View style={[styles.statsIconWrapper, { backgroundColor: ExtendedColors.purpleTint }]}>
              <Eye size={18} color={ExtendedColors.purpleDeep} />
            </View>
            <View>
              <Text style={styles.statsLabel}>Profile Views</Text>
              <Text style={styles.statsValue}>142</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Recent Activity</Text>

        {/* Recent Activity List */}
        <View style={styles.activityCard}>
          <View style={styles.activityRow}>
            <View style={[styles.activityIcon, { backgroundColor: Colors.successBgAlt }]}>
              <TrendingUp size={14} color={Colors.successAlt} />
            </View>
            <View style={styles.activityInfo}>
              <Text style={styles.activityTitle}>Earnings Processed</Text>
              <Text style={styles.activityTime}>2 hours ago</Text>
            </View>
            <Text style={styles.activityAmount}>+₹437.50</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.activityRow}>
            <View style={[styles.activityIcon, { backgroundColor: Colors.warningBg }]}>
              <Star size={14} color={Colors.warning} />
            </View>
            <View style={styles.activityInfo}>
              <Text style={styles.activityTitle}>New 5-Star Rating</Text>
              <Text style={styles.activityTime}>Yesterday, 4:30 PM</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.activityRow}>
            <View style={[styles.activityIcon, { backgroundColor: Colors.infoBg }]}>
              <Calendar size={14} color={Colors.info} />
            </View>
            <View style={styles.activityInfo}>
              <Text style={styles.activityTitle}>Booking Completed</Text>
              <Text style={styles.activityTime}>May 24, 11:00 AM</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.screenBg,
  },
  content: {
    padding: Spacing['3xl'],
  },
  heroCard: {
    padding: Spacing['3xl'],
    borderRadius: BorderRadius.lg,                  // 16 = lg ✓
    marginBottom: Spacing.screenH,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  heroLabel: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,                          // 12 = sm ✓
    fontWeight: FontWeight.semibold,
    letterSpacing: 0,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ExtendedColors.successAlpha,   // 'rgba(16,185,129,0.15)' ✓
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.md,                  // 12 = md ✓
    gap: Spacing.xs,
  },
  trendText: {
    color: Colors.successAlt,
    fontSize: FontSize.xs,                          // 11 = xs ✓
    fontWeight: FontWeight.bold,
  },
  heroValue: {
    fontSize: FontSize['7xl'],                      // 32 = 7xl ✓
    fontWeight: FontWeight.extrabold,
    color: Colors.white,
    letterSpacing: -1,
    marginBottom: Spacing.micro,
  },
  heroSubtext: {
    color: ExtendedColors.indigoTint,               // '#E0E7FF' ✓
    fontSize: FontSize.xs,                          // 11 = xs ✓
  },
  heroDivider: {
    height: 1,
    backgroundColor: ExtendedColors.whiteAlpha10,   // 'rgba(255,255,255,0.1)' ✓
    marginVertical: Spacing.xl,
  },
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroFooterItem: {
    flex: 1,
  },
  heroFooterLabel: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,                          // 11 = xs ✓
    marginBottom: Spacing.micro,
  },
  heroFooterValue: {
    color: Colors.white,
    fontSize: FontSize.xl,                          // 16 = xl ✓
    fontWeight: FontWeight.bold,
  },
  heroFooterDivider: {
    width: 1,
    height: 24,
    backgroundColor: ExtendedColors.whiteAlpha10,   // 'rgba(255,255,255,0.1)' ✓
    marginHorizontal: Spacing['3xl'],
  },
  sectionTitle: {
    fontSize: FontSize.lg,                          // 15 = lg ✓
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xl,
    marginBottom: Spacing.screenH,
  },
  statsCard: {
    width: '48%',
    backgroundColor: Colors.white,
    padding: Spacing['2xl'],
    borderRadius: BorderRadius.md,                  // 12 = md ✓
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xl,
  },
  statsIconWrapper: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.sm,                  // 8 = sm ✓
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsLabel: {
    fontSize: FontSize.xs,                          // 11 = xs ✓
    color: Colors.textSecondary,
    marginBottom: 1,
  },
  statsValue: {
    fontSize: FontSize.xl,                          // 16 = xl ✓
    fontWeight: FontWeight.extrabold,
    color: Colors.textPrimary,
  },
  activityCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,                  // 16 = lg ✓
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing['3xl'],
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,                  // 8 = sm ✓
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityInfo: {
    flex: 1,
    marginLeft: Spacing.xl,
  },
  activityTitle: {
    fontSize: FontSize.md,                          // 14 = md ✓
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.micro,
  },
  activityTime: {
    fontSize: FontSize.sm,                          // 12 = sm ✓
    color: Colors.textSecondary,
  },
  activityAmount: {
    fontSize: FontSize.md,                          // 14 = md ✓
    fontWeight: FontWeight.bold,
    color: Colors.successAlt,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.surfaceBg,
    marginVertical: Spacing.xl,
  },
});

export default AnalyticsScreen;
