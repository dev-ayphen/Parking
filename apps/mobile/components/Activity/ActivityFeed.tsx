import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import NoActivitySvg from '../Illustrations/NoActivitySvg';
import ActivityItem, { ActivityType } from './ActivityItem';
import { Spacing, Typography } from '../../theme/colors';
import { Colors, BorderRadius } from '../../theme';

export interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  amount?: number;
  status: 'active' | 'completed' | 'pending' | 'failed';
  statusLabel?: string;
  timestamp: string;
  onPress?: () => void;
}

interface ActivityFeedProps {
  activities: Activity[];
  title?: string;
  maxHeight?: number;
  horizontal?: boolean;
  onLoadMore?: () => void;
  isLoading?: boolean;
  onSeeAll?: () => void;
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({
  activities,
  title = 'Recent Activity',
  isLoading = false,
  onSeeAll,
}) => {
  const theme = useTheme();

  const dynamicStyles = useMemo(
    () =>
      StyleSheet.create({
        title: { color: theme.colors.textPrimary },
        emptyText: { color: theme.colors.textSecondary },
      }),
    [theme]
  );

  if (activities.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconWrapper}>
          <NoActivitySvg width={100} height={100} primaryColor="#DC0159" />
        </View>
        <Text style={[styles.emptyDescription, dynamicStyles.emptyText]}>
          Your bookings and transactions will appear here
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>

        {/* Plain map — no FlatList, safe to nest inside a ScrollView */}
        {activities.map((item, index) => (
        <ActivityItem
          key={item.id}
          type={item.type}
          title={item.title}
          description={item.description}
          amount={item.amount}
          status={item.status}
          statusLabel={item.statusLabel}
          timestamp={item.timestamp}
          onPress={item.onPress}
          isLast={index === activities.length - 1}
        />
      ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.sm,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  emptyContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  emptyIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  emptyDescription: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default ActivityFeed;
