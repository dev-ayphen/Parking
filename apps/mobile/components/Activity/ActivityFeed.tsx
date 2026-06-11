import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import NoActivitySvg from '../Illustrations/NoActivitySvg';
import ActivityItem, { ActivityType } from './ActivityItem';
import { Spacing, Typography } from '../../theme/colors';

export interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  amount?: number;
  status: 'active' | 'completed' | 'pending' | 'failed';
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
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({
  activities,
  title = 'Recent Activity',
  isLoading = false,
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
        {!!title && <Text style={[styles.title, dynamicStyles.title]}>{title}</Text>}
        <View style={styles.emptyIconWrapper}>
          <NoActivitySvg width={100} height={100} primaryColor="#DC0159" />
        </View>
        <Text style={[styles.emptyTitle, dynamicStyles.emptyText]}>No Recent Activity</Text>
        <Text style={[styles.emptyDescription, dynamicStyles.emptyText]}>
          Your bookings and transactions will appear here
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!!title && <Text style={[styles.title, dynamicStyles.title]}>{title}</Text>}
      {/* Plain map — no FlatList, safe to nest inside a ScrollView */}
      {activities.map((item) => (
        <ActivityItem
          key={item.id}
          type={item.type}
          title={item.title}
          description={item.description}
          amount={item.amount}
          status={item.status}
          timestamp={item.timestamp}
          onPress={item.onPress}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  title: {
    fontSize: Typography.heading3.fontSize,
    fontWeight: Typography.heading3.fontWeight as any,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
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
