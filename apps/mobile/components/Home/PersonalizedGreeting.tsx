import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Spacing, FontSize, FontWeight } from '../../theme/colors';

interface PersonalizedGreetingProps {
  userName: string;
  subtitle?: string;
}

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

const PersonalizedGreeting: React.FC<PersonalizedGreetingProps> = ({ userName }) => {
  const theme = useTheme();

  const dynamicStyles = useMemo(
    () =>
      StyleSheet.create({
        title: { color: theme.colors.textPrimary },
        sub: { color: theme.colors.textSecondary },
      }),
    [theme]
  );

  return (
    <View style={styles.container}>
      <Text style={[styles.title, dynamicStyles.title]}>
        Hello {userName} 👋
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.screenH,
    paddingTop: Spacing.md,
    paddingBottom: Spacing['3xl'],
  },
  greeting: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    letterSpacing: 0.3,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 24,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.3,
  },
});

export default PersonalizedGreeting;
