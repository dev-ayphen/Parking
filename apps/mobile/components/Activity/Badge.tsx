import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Spacing, Typography } from '../../theme/colors';

type BadgeType = 'success' | 'warning' | 'error' | 'info' | 'pending';

interface BadgeProps {
  label: string;
  type?: BadgeType;
  size?: 'small' | 'medium';
  variant?: 'solid' | 'outline';
}

const Badge: React.FC<BadgeProps> = ({
  label,
  type = 'info',
  size = 'small',
  variant = 'solid',
}) => {
  const theme = useTheme();

  const badgeColors = {
    success: { bg: theme.colors.successBg, text: theme.colors.white },
    warning: { bg: theme.colors.warningBg, text: theme.colors.white },
    error: { bg: theme.colors.errorBg, text: theme.colors.white },
    info: { bg: theme.colors.infoBg, text: theme.colors.white },
    pending: { bg: theme.colors.pendingBg, text: theme.colors.white },
  };

  const colors = badgeColors[type];

  const dynamicStyles = useMemo(
    () =>
      StyleSheet.create({
        solidBadge: {
          backgroundColor: colors.bg,
        },
        outlineBadge: {
          backgroundColor: 'transparent',
          borderColor: colors.bg,
          borderWidth: 1,
        },
        text: {
          color: variant === 'solid' ? colors.text : colors.bg,
        },
      }),
    [colors, variant]
  );

  const sizeStyles = {
    small: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: 4,
      fontSize: Typography.caption.fontSize,
    },
    medium: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
      fontSize: Typography.bodySmall.fontSize,
    },
  };

  return (
    <View
      style={[
        styles.badge,
        variant === 'solid' ? dynamicStyles.solidBadge : dynamicStyles.outlineBadge,
        sizeStyles[size],
      ]}
    >
      <Text
        style={[
          styles.text,
          dynamicStyles.text,
          { fontSize: sizeStyles[size].fontSize },
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
  },
});

export default Badge;
