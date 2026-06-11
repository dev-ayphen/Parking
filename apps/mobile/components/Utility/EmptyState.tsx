import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Spacing, Typography } from '../../theme/colors';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  size?: 'small' | 'medium' | 'large';
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  size = 'medium',
}) => {
  const theme = useTheme();

  const dynamicStyles = useMemo(
    () =>
      StyleSheet.create({
        title: {
          color: theme.colors.textPrimary,
        },
        description: {
          color: theme.colors.textSecondary,
        },
      }),
    [theme]
  );

  const sizeStyles = {
    small: {
      paddingVertical: Spacing.lg,
      iconSize: 48,
      titleFontSize: Typography.body.fontSize,
    },
    medium: {
      paddingVertical: Spacing.xl,
      iconSize: 64,
      titleFontSize: Typography.heading3.fontSize,
    },
    large: {
      paddingVertical: Spacing['6xl'],
      iconSize: 80,
      titleFontSize: Typography.heading2.fontSize,
    },
  };

  const currentSize = sizeStyles[size];

  return (
    <View
      style={[
        styles.container,
        { paddingVertical: currentSize.paddingVertical },
      ]}
    >
      {icon && (
        <View style={styles.iconContainer}>
          {icon}
        </View>
      )}

      <Text
        style={[
          styles.title,
          dynamicStyles.title,
          { fontSize: currentSize.titleFontSize },
        ]}
      >
        {title}
      </Text>

      {description && (
        <Text
          style={[styles.description, dynamicStyles.description]}
        >
          {description}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  iconContainer: {
    marginBottom: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontWeight: '600',
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  description: {
    fontSize: Typography.body.fontSize,
    fontWeight: Typography.body.fontWeight as any,
    textAlign: 'center',
  },
});

export default EmptyState;
