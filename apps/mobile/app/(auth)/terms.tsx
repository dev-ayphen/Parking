import React, { useState, useEffect, useMemo } from 'react';
import {StyleSheet, ScrollView, Text, View, StatusBar, ActivityIndicator} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { PageHeader } from '../../components';
import { api } from '../../services/api';
import { FontSize, FontWeight, BorderRadius, Spacing } from '../../theme';
import type { ColorsType } from '../../theme';
import { useTheme } from '../../hooks/useTheme';

const TermsScreen = () => {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  // Prefer the server's live terms (so legal copy can be updated without an app
  // release). Fall back to the bundled copy if the server has no doc yet.
  const [serverContent, setServerContent] = useState<string | null>(null);
  const [serverVersion, setServerVersion] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/legal/documents/terms');
        if (!cancelled && res?.document?.content) {
          setServerContent(res.document.content);
          setServerVersion(res.document.version ?? null);
        }
      } catch {
        // no server doc → use bundled fallback below
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.white} />
        <PageHeader title="Terms of Service"  onBack={() => router.replace('/(auth)/login')} />
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  // Server doc available → render it (plain text, preserving line breaks).
  if (serverContent) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.white} />
        <PageHeader title="Terms of Service"  onBack={() => router.replace('/(auth)/login')} />
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.textContainer}>
            {serverVersion ? <Text style={styles.version}>Version {serverVersion}</Text> : null}
            <Text style={styles.docBody}>{serverContent}</Text>
            <View style={styles.spacer} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.white} />
      <PageHeader title="Terms of Service"  onBack={() => router.replace('/(auth)/login')} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.textContainer}>
          <Text style={styles.heading}>1. Agreement to Terms</Text>
          <Text style={styles.paragraph}>
            By accessing or using ParkSwift, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, then you do not have permission to access the Service.
          </Text>

          <Text style={styles.heading}>2. Use of Service</Text>
          <Text style={styles.paragraph}>
            ParkSwift provides a platform to connect parking space owners with drivers. You agree to use this service only for lawful purposes and in accordance with these Terms. You are responsible for ensuring that your vehicle and parking activities comply with local laws and regulations.
          </Text>

          <Text style={styles.heading}>3. User Accounts</Text>
          <Text style={styles.paragraph}>
            When you create an account with us, you must provide information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.
          </Text>

          <Text style={styles.heading}>4. Payments and Fees</Text>
          <Text style={styles.paragraph}>
            Users agree to pay all applicable fees for parking spaces booked through the app. ParkSwift acts as a payment collection agent for space owners. Refunds are subject to our cancellation policy.
          </Text>

          <Text style={styles.heading}>5. Liability</Text>
          <Text style={styles.paragraph}>
            ParkSwift is not responsible for any damage, loss, or theft of vehicles or property while using a parking space booked through our platform. Users park at their own risk.
          </Text>

          <Text style={styles.heading}>6. Changes to Terms</Text>
          <Text style={styles.paragraph}>
            We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will try to provide at least 30 days' notice prior to any new terms taking effect.
          </Text>
          
          <View style={styles.spacer} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const makeStyles = (colors: ColorsType) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  version: { fontSize: FontSize.sm, color: colors.textMuted, fontWeight: FontWeight.semibold, marginBottom: Spacing.xl },
  docBody: { fontSize: FontSize.base, lineHeight: 24, color: colors.textDark },
  content: {
    flex: 1,
    backgroundColor: colors.screenBg,
  },
  textContainer: {
    padding: Spacing['4xl'],
  },
  heading: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.bold,
    color: colors.textPrimary,
    marginBottom: Spacing.md,
    marginTop: Spacing['3xl'],
  },
  paragraph: {
    fontSize: FontSize.base,
    lineHeight: 24,
    color: colors.textDark,
    marginBottom: Spacing.md,
  },
  spacer: {
    height: Spacing['5xl'],
  }
});

export default TermsScreen;
