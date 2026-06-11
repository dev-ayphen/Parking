import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import {
  MapPin,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Shield,
  Clock,
  ChevronRight,
} from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { Spacing } from '../../theme/colors';

export type ActivityType = 'booking' | 'otp' | 'payment' | 'approval';

interface ActivityItemProps {
  type: ActivityType;
  title: string;
  description: string;
  amount?: number;
  status: 'active' | 'completed' | 'pending' | 'failed';
  timestamp: string;
  onPress?: () => void;
  icon?: React.ReactNode;
}

const ActivityItem: React.FC<ActivityItemProps> = ({
  type,
  title,
  description,
  amount,
  status,
  timestamp,
  onPress,
  icon,
}) => {
  const theme = useTheme();

  const getDefaultIcon = () => {
    switch (type) {
      case 'booking':
        return <MapPin size={22} color="#10B981" strokeWidth={2} />;
      case 'payment':
        return <MapPin size={22} color="#64748B" strokeWidth={2} />;
      default:
        return <MapPin size={22} color="#64748B" strokeWidth={2} />;
    }
  };

  const getIconBg = () => {
    switch (type) {
      case 'booking':
        return 'rgba(16, 185, 129, 0.1)';
      case 'payment':
        return 'rgba(100, 116, 139, 0.1)';
      default:
        return 'rgba(100, 116, 139, 0.1)';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'active':
        return '#10B981';
      case 'completed':
        return '#64748B';
      case 'pending':
        return '#F59E0B';
      case 'failed':
        return '#EF4444';
      default:
        return '#64748B';
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'completed':
        return 'Completed';
      case 'pending':
        return 'Pending';
      case 'failed':
        return 'Failed';
      default:
        return status;
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.content}>
        {/* Left: Icon */}
        <View style={[styles.iconContainer, { backgroundColor: getIconBg() }]}>
          {icon || getDefaultIcon()}
        </View>

        {/* Center: Details */}
        <View style={styles.detailsContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <View style={styles.descRow}>
            <Clock size={12} color="#94A3B8" style={{ marginRight: 4 }} />
            <Text style={styles.description} numberOfLines={1}>
              {description}
            </Text>
          </View>
        </View>

        {/* Right: Amount only */}
        <View style={styles.rightContainer}>
          {(amount ?? 0) > 0 && (
            <Text style={styles.amount}>
              ₹{amount}
            </Text>
          )}
        </View>
        
        <ChevronRight size={16} color="#CBD5E1" style={{ marginLeft: 4 }} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: Spacing.lg,
    marginVertical: 4,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
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
    marginRight: 10,
    flexShrink: 0,
  },
  detailsContainer: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
    marginRight: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 3,
  },
  descRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  description: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  rightContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    flexShrink: 0,
    gap: 3,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  amount: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
});

export default ActivityItem;
