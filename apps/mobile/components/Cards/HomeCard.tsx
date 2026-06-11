import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FontSize, FontWeight, Spacing } from '../../theme/colors';

interface Stat {
  value: string | number | React.ReactNode;
  label: string;
}

interface HomeCardProps {
  icon: React.ReactNode;
  iconBgColor: string;
  title: string;
  subtitle: string;
  illustration?: React.ReactNode;
  stats: Stat[];
  buttonText: string;
  buttonColor: string;
  buttonVariant?: 'solid' | 'outline';
  onPressButton: () => void;
  cardBgColor?: string;
  // unused legacy props
  gradientColors?: string[];
  photo?: any;
  buttonTextColor?: string;
  liveChip?: string;
}

const HomeCard: React.FC<HomeCardProps> = ({
  icon,
  iconBgColor,
  title,
  subtitle,
  illustration,
  stats,
  buttonText,
  buttonColor,
  buttonVariant = 'solid',
  onPressButton,
  cardBgColor = '#FFFFFF',
}) => {
  const isOutline = buttonVariant === 'outline';

  return (
    <View style={[styles.card, { backgroundColor: cardBgColor }]}>

      {/* ── Top row: icon + text left, illustration right ── */}
      <View style={styles.topRow}>
        <View style={styles.leftCol}>
          <View style={[styles.iconBadge, { backgroundColor: iconBgColor }]}>
            {icon}
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        {illustration ? (
          <View style={styles.illustrationBox}>
            {illustration}
          </View>
        ) : null}
      </View>

      {/* ── Stats — plain horizontal row ── */}
      <View style={styles.statsRow}>
        {stats.map((stat, i) => (
          <View key={i} style={styles.statItem}>
            {typeof stat.value === 'string' || typeof stat.value === 'number' ? (
              <Text style={styles.statValue}>{stat.value}</Text>
            ) : (
              <>{stat.value}</>
            )}
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* ── Button ── */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPressButton}
        style={[
          styles.btn,
          isOutline
            ? { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: buttonColor }
            : { backgroundColor: buttonColor },
        ]}
      >
        <Text style={[styles.btnText, { color: isOutline ? buttonColor : '#FFFFFF' }]}>
          {buttonText}
        </Text>
      </TouchableOpacity>

    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    marginHorizontal: Spacing.screenH,
    marginBottom: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  leftCol: {
    flex: 1,
    paddingRight: 8,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.extrabold,
    color: '#0F172A',
    letterSpacing: -0.3,
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: FontWeight.normal,
    lineHeight: 17,
  },
  illustrationBox: {
    width: 100,
    height: 80,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    flexShrink: 0,
  },

  // ── Stats ───────────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    marginBottom: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  statItem: {
    flex: 1,
  },
  statValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.extrabold,
    color: '#0F172A',
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: FontWeight.medium,
  },

  // ── Button ──────────────────────────────────────────────────────
  btn: {
    height: 46,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.1,
  },
});

export default HomeCard;
