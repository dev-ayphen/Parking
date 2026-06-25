import React, { useState, useEffect } from 'react';
import {StyleSheet, ScrollView, Text, View, StatusBar, ActivityIndicator} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PageHeader } from '../../components';
import { api } from '../../services/api';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing } from '../../theme';

const PrivacyScreen = () => {
  // Prefer the live server policy; fall back to bundled copy if unseeded.
  const [serverContent, setServerContent] = useState<string | null>(null);
  const [serverVersion, setServerVersion] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/legal/documents/privacy');
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
        <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
        <PageHeader title="Privacy Policy"  onBack={() => router.replace('/(auth)/login')} />
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      </SafeAreaView>
    );
  }

  if (serverContent) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
        <PageHeader title="Privacy Policy"  onBack={() => router.replace('/(auth)/login')} />
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
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <PageHeader title="Privacy Policy"  onBack={() => router.replace('/(auth)/login')} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.textContainer}>
          <Text style={styles.heading}>1. Information We Collect</Text>
          <Text style={styles.paragraph}>
            We collect information you provide directly to us, such as your name, email address, phone number, and vehicle details when you create an account. We also collect location data to help you find nearby parking spaces or to verify you are at the correct location.
          </Text>

          <Text style={styles.heading}>2. How We Use Your Information</Text>
          <Text style={styles.paragraph}>
            We use the information we collect to operate and improve our platform, process your transactions, communicate with you about your account or bookings, and to ensure the safety and security of our users.
          </Text>

          <Text style={styles.heading}>3. Sharing of Information</Text>
          <Text style={styles.paragraph}>
            We share relevant information between parking space owners and drivers (such as vehicle details and booking times) to facilitate the parking transaction. We do not sell your personal data to third parties.
          </Text>

          <Text style={styles.heading}>4. Data Security</Text>
          <Text style={styles.paragraph}>
            We take reasonable measures to help protect information about you from loss, theft, misuse, unauthorized access, disclosure, alteration, and destruction. However, no internet transmission is completely secure.
          </Text>

          <Text style={styles.heading}>5. Your Choices</Text>
          <Text style={styles.paragraph}>
            You can access and modify your account information at any time within the app settings. You can also disable location services, though this may limit your ability to use certain features of ParkSwift.
          </Text>

          <Text style={styles.heading}>6. Contact Us</Text>
          <Text style={styles.paragraph}>
            If you have any questions about this Privacy Policy, please contact our support team through the Help & Support section in the app.
          </Text>
          
          <View style={styles.spacer} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  version: { fontSize: FontSize.sm, color: Colors.textMuted, fontWeight: FontWeight.semibold, marginBottom: Spacing.xl },
  docBody: { fontSize: FontSize.base, lineHeight: 24, color: Colors.textDark },
  content: {
    flex: 1,
    backgroundColor: Colors.screenBg,
  },
  textContainer: {
    padding: Spacing['4xl'],
  },
  heading: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    marginTop: Spacing['3xl'],
  },
  paragraph: {
    fontSize: FontSize.base,
    lineHeight: 24,
    color: Colors.textDark,
    marginBottom: Spacing.md,
  },
  spacer: {
    height: Spacing['5xl'],
  }
});

export default PrivacyScreen;
