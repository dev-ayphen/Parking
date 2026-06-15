import React, { useState } from 'react';
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
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, ExtendedColors } from '../../theme';

const CompleteProfileScreen = () => {
  const router = useRouter();
  const { token, userId, expiresIn } = useLocalSearchParams();
  const setSession = useAuthStore((s) => s.setSession);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ firstName?: string; lastName?: string; email?: string; general?: string }>({});

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
      });
      await setSession(String(token), { id: Number(userId), isProfileComplete: true }, Number(expiresIn));
      setLoading(false);
      router.replace('/(home)');
    } catch (err) {
      setLoading(false);
      setErrors({ general: typeof (err as any)?.message === 'string' ? (err as any).message : 'Something went wrong. Please try again.' });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={Colors.white} barStyle="dark-content" />

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
              placeholderTextColor={Colors.textMuted}
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
              placeholderTextColor={Colors.textMuted}
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
              placeholderTextColor={Colors.textMuted}
              keyboardType="email-address"
              style={[styles.input, !!errors.email && styles.inputError]}
              value={email}
              onChangeText={(v) => { setEmail(v); setErrors((e) => ({ ...e, email: undefined })); }}
              editable={!loading}
            />
            {!!errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          {!!errors.general && <Text style={[styles.errorText, { marginBottom: Spacing['3xl'] }]}>{errors.general}</Text>}

          {/* Submit Button */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleCompleteProfile}
            disabled={loading}
          >
            <LinearGradient
              colors={[Colors.primaryLight, Colors.primary]}
              style={styles.button}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} size="large" />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
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
    color: Colors.textDark,
  },

  subtitle: {
    fontSize: FontSize.lg,
    color: Colors.textSecondary,
    marginTop: Spacing.lg,
    marginBottom: 45,
  },

  inputContainer: {
    marginBottom: Spacing['4xl'],
  },

  label: {
    fontSize: FontSize.base,
    color: Colors.textDark,
    marginBottom: Spacing.lg,
    fontWeight: FontWeight.semibold,
  },

  input: {
    height: 58,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing['3xl'],
    fontSize: FontSize.lg,
    color: Colors.textDark,
    backgroundColor: Colors.screenBg,
  },

  button: {
    height: 58,
    borderRadius: BorderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.screenH,
  },

  buttonText: {
    color: Colors.white,
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.bold,
  },

  note: {
    textAlign: 'center',
    marginTop: Spacing['4xl'],
    color: Colors.textPlaceholder,
    fontSize: FontSize.sm,
    fontStyle: 'italic',
  },
  inputError: {
    borderColor: Colors.error,
  },
  errorText: {
    color: Colors.error,
    fontSize: FontSize.sm,
    marginTop: Spacing.sm,
  },
});
