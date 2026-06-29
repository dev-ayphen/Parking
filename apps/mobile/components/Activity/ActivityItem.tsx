import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Car, IndianRupee, ShieldCheck, CalendarCheck } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import type { ColorsType } from '../../theme';

const ICON_CONFIG: Record<string, { Icon: any; lightColor: string; darkColor: string }> = {
  booking:  { Icon: Car,           lightColor: '#3B82F6', darkColor: '#60A5FA' },
  payment:  { Icon: IndianRupee,   lightColor: '#10B981', darkColor: '#34D399' },
  otp:      { Icon: ShieldCheck,   lightColor: '#8B5CF6', darkColor: '#A78BFA' },
  approval: { Icon: CalendarCheck, lightColor: '#F59E0B', darkColor: '#FCD34D' },
};

export type ActivityType = 'booking' | 'otp' | 'payment' | 'approval';

interface ActivityItemProps {
  type: ActivityType;
  title: string;
  description: string;
  amount?: number;
  status: 'active' | 'completed' | 'pending' | 'failed';
  statusLabel?: string;
  timestamp: string;
  onPress?: () => void;
  icon?: React.ReactNode;
  isLast?: boolean;
}

const makeStyles = (colors: ColorsType, isDark: boolean) => StyleSheet.create({
  container: {
    paddingVertical: 14,
    backgroundColor: colors.white,
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
    // subtle border for elevation in dark mode
    borderWidth: isDark ? 1 : 0,
    borderColor: colors.border,
  },
  detailsContainer: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
    marginRight: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 3,
  },
  description: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '400',
  },
  rightContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    flexShrink: 0,
    gap: 4,
    paddingRight: 4,
  },
  amount: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  timestamp: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
});

const ActivityItem: React.FC<ActivityItemProps> = ({
  type,
  title,
  description,
  amount,
  timestamp,
  onPress,
  isLast,
}) => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const config = ICON_CONFIG[type] ?? ICON_CONFIG.booking;
  const iconColor = isDark ? config.darkColor : config.lightColor;
  // icon bg: in dark mode use a subtle tinted surface
  const iconBg = isDark ? colors.surfaceBg : `${config.lightColor}18`;

  return (
    <TouchableOpacity
      style={[styles.container, !isLast && styles.borderBottom]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
          <config.Icon size={17} color={iconColor} strokeWidth={2} />
        </View>

        <View style={styles.detailsContainer}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          <Text style={styles.description} numberOfLines={1}>{description}</Text>
        </View>

        <View style={styles.rightContainer}>
          {(amount ?? 0) > 0 && (
            <Text style={styles.amount}>₹{amount}</Text>
          )}
          <Text style={styles.timestamp}>{timestamp}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default ActivityItem;
