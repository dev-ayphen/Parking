import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import {
  Car,
  IndianRupee,
  ShieldCheck,
  CalendarCheck,
} from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';

const ICON_CONFIG: Record<string, { Icon: any; color: string; bg: string }> = {
  booking:  { Icon: Car,           color: '#3B82F6', bg: '#EFF6FF' },
  payment:  { Icon: IndianRupee,   color: '#10B981', bg: '#ECFDF5' },
  otp:      { Icon: ShieldCheck,   color: '#8B5CF6', bg: '#F5F3FF' },
  approval: { Icon: CalendarCheck, color: '#F59E0B', bg: '#FFFBEB' },
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

const ActivityItem: React.FC<ActivityItemProps> = ({
  type,
  title,
  description,
  amount,
  timestamp,
  onPress,
  isLast,
}) => {
  useTheme();

  const { Icon, color, bg } = ICON_CONFIG[type] ?? ICON_CONFIG.booking;

  return (
    <TouchableOpacity
      style={[styles.container, !isLast && styles.borderBottom]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.content}>
        {/* Left: Icon */}
        <View style={[styles.iconContainer, { backgroundColor: bg }]}>
          <Icon size={16} color={color} strokeWidth={2} />
        </View>

        {/* Center: Details */}
        <View style={styles.detailsContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.description} numberOfLines={1}>
            {description}
          </Text>
        </View>

        {/* Right: Amount and Timestamp */}
        <View style={styles.rightContainer}>
          {(amount ?? 0) > 0 && (
            <Text style={styles.amount}>
              ₹{amount}
            </Text>
          )}
          <Text style={styles.timestamp}>{timestamp}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
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
    color: '#0F172A',
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    color: '#64748B',
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
    color: '#0F172A',
  },
  timestamp: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
});

export default ActivityItem;
