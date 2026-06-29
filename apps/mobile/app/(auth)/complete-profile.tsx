import React, { useState, useMemo } from 'react';
import {View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  ScrollView} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Alert } from 'react-native';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { FontSize, FontWeight, BorderRadius, Spacing } from '../../theme';
import type { ColorsType } from '../../theme';
import { useTheme } from '../../hooks/useTheme';

const CompleteProfileScreen = () => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const { userId } = useLocalSearchParams();
  const setSession = useAuthStore((s) => s.setSession);
  const logout = useAuthStore((s) => s.logout);
  const storeToken = useAuthStore((s) => s.token);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [upiId, setUpiId] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ firstName?: string; lastName?: string; email?: string; upiId?: string; general?: string }>({});

  const canSubmit = firstName.trim().length > 0 && lastName.trim().length > 0 && email.trim().length > 0 && !loading;

  // Back here can't skip the profile gate — completing it is mandatory. So "back"
  // means "cancel sign-up" → log out and return to login, rather than sneaking
  // into the app with an incomplete profile.
  const handleBack = () => {
    Alert.alert(
      'Cancel profile setup?',
      'You need to complete your profile to use ParkSwift. Going back will sign you out.',
      [
        { text: 'Stay', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => { await logout(); router.replace('/(auth)'); },
        },
      ],
    );
  };

  const handleCompleteProfile = async () => {
    const errs: typeof errors = {};
    if (!firstName.trim()) errs.firstName = 'First name is required.';
    if (!lastName.trim()) errs.lastName = 'Last name is required.';
    if (!email.trim()) {
      errs.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = 'Please enter a valid email address.';
    }
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setErrors({});
    setLoading(true);
    try {
      await api.put('/users/me/complete-profile', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        upiId: upiId.trim() || undefined,
      });
      // Token is already in the store (set in verify-otp before routing here).
      // Update the user object to reflect the completed profile without re-issuing tokens.
      if (storeToken) {
        await setSession(storeToken, { id: Number(userId), isProfileComplete: true });
      }
      setLoading(false);
      router.replace('/(home)');
    } catch (err) {
      setLoading(false);
      setErrors({ general: typeof (err as any)?.message === 'string' ? (err as any).message : 'Something went wrong. Please try again.' });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={colors.white} barStyle={isDark ? 'light-content' : 'dark-content'} />

      <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
        <ChevronLeft size={20} color={colors.textDark} strokeWidth={2.5} />
      </TouchableOpacity>

      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.title}>Complete Your Profile</Text>

          <Text style={styles.subtitle}>
            Tell us a bit about yourself to get started with ParkSwift
          </Text>

          {/* First Name */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>First Name</Text>
            <TextInput
              placeholder="Enter your first name"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, !!errors.firstName && styles.inputError]}
              value={firstName}
              onChangeText={(v) => { setFirstName(v); setErrors((e) => ({ ...e, firstName: undefined })); }}
              editable={!loading}
            />
            {!!errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
          </View>

          {/* Last Name */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Last Name</Text>
            <TextInput
              placeholder="Enter your last name"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, !!errors.lastName && styles.inputError]}
              value={lastName}
              onChangeText={(v) => { setLastName(v); setErrors((e) => ({ ...e, lastName: undefined })); }}
              editable={!loading}
            />
            {!!errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
          </View>

          {/* Email */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              placeholder="Enter your email"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              style={[styles.input, !!errors.email && styles.inputError]}
              value={email}
              onChangeText={(v) => { setEmail(v); setErrors((e) => ({ ...e, email: undefined })); }}
              editable={!loading}
            />
            {!!errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          {/* UPI ID — optional, for owners who want instant scan-to-pay QR for parkers.
              Can be set now or skipped and added later in Manage Billing. */}
          <View style={styles.inputContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <Text style={styles.label}>UPI ID (Optional)</Text>
              <Text style={styles.labelHint}>For payment QR</Text>
            </View>
            <TextInput
              placeholder="name@okhdfcbank"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              style={[styles.input, !!errors.upiId && styles.inputError]}
              value={upiId}
              onChangeText={(v) => { setUpiId(v); setErrors((e) => ({ ...e, upiId: undefined })); }}
              editable={!loading}
            />
            {!!errors.upiId && <Text style={styles.errorText}>{errors.upiId}</Text>}
            {!errors.upiId && (
              <Text style={styles.helperText}>
                Your UPI ID (e.g. yourname@okhdfcbank). Parkers can scan a QR to pay you directly.
              </Text>
            )}
          </View>

          {!!errors.general && <Text style={[styles.errorText, { marginBottom: Spacing['3xl'] }]}>{errors.general}</Text>}

          {/* Submit Button — disabled until first + last name are filled */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleCompleteProfile}
            disabled={!canSubmit}
          >
            <LinearGradient
              colors={canSubmit ? [colors.primaryLight, colors.primary] : [colors.borderMuted, colors.borderMuted]}
              style={styles.button}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} size="large" />
              ) : (
                <Text style={styles.buttonText}>Complete Profile</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.note}>
            You can update your profile photo later in settings
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default CompleteProfileScreen;

const makeStyles = (colors: ColorsType) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.circle,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
    marginLeft: Spacing.screenH,
    // Match the canonical PageHeader.backButton shadow.
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },

  scrollView: {
    flex: 1,
  },

  content: {
    paddingHorizontal: Spacing['4xl'],
    paddingVertical: Spacing['5xl'],
  },

  title: {
    fontSize: FontSize['6xl'],
    fontWeight: FontWeight.black,
    color: colors.textDark,
  },

  subtitle: {
    fontSize: FontSize.lg,
    color: colors.textSecondary,
    marginTop: Spacing.lg,
    marginBottom: 45,
  },

  inputContainer: {
    marginBottom: Spacing['4xl'],
  },

  label: {
    fontSize: FontSize.base,
    color: colors.textDark,
    marginBottom: Spacing.lg,
    fontWeight: FontWeight.semibold,
  },

  input: {
    height: 58,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing['3xl'],
    fontSize: FontSize.lg,
    color: colors.textDark,
    backgroundColor: colors.screenBg,
  },

  button: {
    height: 58,
    borderRadius: BorderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.screenH,
  },

  buttonText: {
    color: colors.white,
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.bold,
  },

  note: {
    textAlign: 'center',
    marginTop: Spacing['4xl'],
    color: colors.textPlaceholder,
    fontSize: FontSize.sm,
    fontStyle: 'italic',
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    color: colors.error,
    fontSize: FontSize.sm,
    marginTop: Spacing.sm,
  },
  labelHint: {
    fontSize: FontSize.xs,
    color: colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  helperText: {
    fontSize: FontSize.xs,
    color: colors.textSecondary,
    marginTop: Spacing.sm,
    lineHeight: 14,
  },
});
