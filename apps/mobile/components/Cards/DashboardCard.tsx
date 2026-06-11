import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Spacing, Typography } from '../../theme/colors';

interface StatItem {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
}

interface DashboardCardProps {
  sectionLabel: string;
  title: string;
  description: string;
  illustration: React.ReactNode;
  stats: StatItem[];
  primaryButtonText: string;
  secondaryButtonText: string;
  onPrimaryPress: () => void;
  onSecondaryPress: () => void;
  primaryColor?: string;
  secondaryColor?: string;
}

const { width } = Dimensions.get('window');

const DashboardCard: React.FC<DashboardCardProps> = ({
  sectionLabel,
  title,
  description,
  illustration,
  stats,
  primaryButtonText,
  secondaryButtonText,
  onPrimaryPress,
  onSecondaryPress,
  primaryColor = '#FF7A3F',
  secondaryColor = '#FFF5F0',
}) => {
  const theme = useTheme();

  const dynamicStyles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          backgroundColor: secondaryColor,
        },
        sectionLabel: {
          color: primaryColor,
        },
        title: {
          color: theme.colors.textPrimary,
        },
        description: {
          color: theme.colors.textSecondary,
        },
        primaryButton: {
          backgroundColor: primaryColor,
        },
        secondaryButton: {
          borderColor: primaryColor,
        },
        secondaryButtonText: {
          color: primaryColor,
        },
        statValue: {
          color: primaryColor,
        },
      }),
    [theme, primaryColor, secondaryColor]
  );

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      {/* Section Label */}
      <Text style={[styles.sectionLabel, dynamicStyles.sectionLabel]}>
        {sectionLabel}
      </Text>

      {/* Main Content Row */}
      <View style={styles.contentRow}>
        {/* Left Column - Text Content */}
        <View style={styles.leftColumn}>
          <Text style={[styles.title, dynamicStyles.title]}>{title}</Text>
          <Text style={[styles.description, dynamicStyles.description]}>
            {description}
          </Text>

          {/* Buttons */}
          <View style={styles.buttonsRow}>
            <TouchableOpacity
              style={[styles.primaryButton, dynamicStyles.primaryButton]}
              onPress={onPrimaryPress}
            >
              <Text style={styles.primaryButtonText}>{primaryButtonText}</Text>
              <Text style={styles.arrow}>→</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryButton, dynamicStyles.secondaryButton]}
              onPress={onSecondaryPress}
            >
              <Text style={[styles.secondaryButtonText, dynamicStyles.secondaryButtonText]}>
                +
              </Text>
              <Text style={[styles.secondaryButtonText, dynamicStyles.secondaryButtonText]}>
                {secondaryButtonText}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Right Column - Illustration & Stats */}
        <View style={styles.rightColumn}>
          {/* Illustration */}
          <View style={styles.illustrationContainer}>{illustration}</View>

          {/* Stats */}
          <View style={styles.statsContainer}>
            {stats.map((stat, index) => (
              <View key={index} style={styles.statItem}>
                <Text style={[styles.statValue, dynamicStyles.statValue]}>
                  {stat.value}
                </Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    padding: Spacing.lg,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  contentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  leftColumn: {
    flex: 1,
    marginRight: Spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: Spacing.sm,
  },
  description: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: 16,
    gap: Spacing.sm,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  arrow: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: 16,
    borderWidth: 1.5,
    backgroundColor: '#FFF',
    gap: Spacing.sm,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  rightColumn: {
    width: 140,
    alignItems: 'center',
  },
  illustrationContainer: {
    width: 120,
    height: 120,
    marginBottom: Spacing.md,
  },
  statsContainer: {
    width: '100%',
    gap: Spacing.sm,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
});

export default DashboardCard;
