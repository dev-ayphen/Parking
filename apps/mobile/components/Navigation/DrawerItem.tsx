import React, { useMemo } from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Spacing, Typography } from '../../theme/colors';

interface DrawerItemProps {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  badge?: number | string;
  onPress: () => void;
  testID?: string;
}

const DrawerItem: React.FC<DrawerItemProps> = ({
  icon,
  label,
  isActive = false,
  badge,
  onPress,
  testID,
}) => {
  const theme = useTheme();

  const dynamicStyles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          backgroundColor: isActive ? theme.colors.surfaceBg : 'transparent',
        },
        label: {
          color: isActive ? theme.colors.primary : theme.colors.textPrimary,
        },
        badge: {
          backgroundColor: theme.colors.primary,
        },
      }),
    [theme, isActive]
  );

  return (
    <TouchableOpacity
      style={[styles.container, dynamicStyles.container]}
      onPress={onPress}
      activeOpacity={0.7}
      testID={testID}
    >
      <View style={styles.iconContainer}>
        {icon}
      </View>

      <Text style={[styles.label, dynamicStyles.label]}>
        {label}
      </Text>

      {badge && (
        <View style={[styles.badge, dynamicStyles.badge]}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginVertical: Spacing.xs,
    marginHorizontal: Spacing.md,
    borderRadius: 12,
    gap: Spacing.md,
  },
  iconContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: Typography.body.fontSize,
    fontWeight: Typography.body.fontWeight as any,
    flex: 1,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    color: 'white',
    fontSize: Typography.caption.fontSize,
    fontWeight: '700',
  },
});

export default DrawerItem;
