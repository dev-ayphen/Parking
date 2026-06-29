import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import type { ColorsType } from '../../theme';
import NoActivitySvg from '../Illustrations/NoActivitySvg';
import ActivityItem, { ActivityType } from './ActivityItem';
import { Spacing } from '../../theme/colors';
import { BorderRadius } from '../../theme';

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

const makeStyles = (colors: ColorsType) => StyleSheet.create({
  container: {
    paddingVertical: Spacing.sm,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
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
    backgroundColor: colors.surfaceBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptyDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
});

const ActivityFeed: React.FC<ActivityFeedProps> = ({
  activities,
  isLoading = false,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  if (activities.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconWrapper}>
          <NoActivitySvg width={100} height={100} primaryColor="#DC0159" />
        </View>
        <Text style={styles.emptyDescription}>
          Your bookings and transactions will appear here
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
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

export default ActivityFeed;
