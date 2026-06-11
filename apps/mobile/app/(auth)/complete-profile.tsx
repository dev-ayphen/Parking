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

  const handleCompleteProfile = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      alert('Please fill in all fields');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      await api.put('/users/me/complete-profile', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
      });

      // Save session before navigating so the token is available on home load
      await setSession(String(token), { id: Number(userId), isProfileComplete: true }, Number(expiresIn));
      setLoading(false);
      alert('Profile completed successfully!');
      router.replace('/(home)');
    } catch (error) {
      setLoading(false);
      alert('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
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
              style={styles.input}
              value={firstName}
              onChangeText={setFirstName}
              editable={!loading}
            />
          </View>

          {/* Last Name */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Last Name</Text>
            <TextInput
              placeholder="Enter your last name"
              placeholderTextColor={Colors.textMuted}
              style={styles.input}
              value={lastName}
              onChangeText={setLastName}
              editable={!loading}
            />
          </View>

          {/* Email */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              placeholder="Enter your email"
              placeholderTextColor={Colors.textMuted}
              keyboardType="email-address"
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              editable={!loading}
            />
          </View>

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
});
