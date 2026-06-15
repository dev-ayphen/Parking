import React, { useState, useEffect } from 'react';
import {View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform} from 'react-native';
import { toast } from '../../utils/toast';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { api } from '../../services/api';
import { PageHeader, ScreenLoader } from '../../components';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, ExtendedColors } from '../../theme';

interface UserProfile {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

const EditProfileScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await api.get('/users/me');
      if (data.success && data.user) {
        setFirstName(data.user.firstName || '');
        setLastName(data.user.lastName || '');
        setEmail(data.user.email || '');
        setEmergencyContactName(data.user.emergencyContactName || '');
        setEmergencyContactPhone(data.user.emergencyContactPhone || '');
      }
    } catch (error) {
      console.error('[EDIT_PROFILE] Error loading:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!firstName.trim()) {
      newErrors.firstName = 'First name is required';
    } else if (firstName.trim().length < 2) {
      newErrors.firstName = 'First name must be at least 2 characters';
    } else if (!/^[a-zA-Z ]+$/.test(firstName)) {
      newErrors.firstName = 'First name can only contain letters and spaces';
    }

    if (!lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    } else if (!/^[a-zA-Z ]+$/.test(lastName)) {
      newErrors.lastName = 'Last name can only contain letters and spaces';
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Invalid email format';
    }

    if (emergencyContactPhone.trim() && !/^[6-9]\d{9}$/.test(emergencyContactPhone.replace(/^\+91/, ''))) {
      newErrors.emergencyContactPhone = 'Enter a valid 10-digit mobile number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      if (__DEV__) console.log('[EDIT_PROFILE] Validation failed');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        emergencyContactName: emergencyContactName.trim() || null,
        emergencyContactPhone: emergencyContactPhone.trim() || null,
      };

      if (__DEV__) console.log('[EDIT_PROFILE] Saving with payload:', payload);

      const data = await api.put('/users/me', payload);
      if (__DEV__) console.log('[EDIT_PROFILE] API Success:', data);

      if (data.success) {
        if (__DEV__) console.log('[EDIT_PROFILE] ✅ Profile updated successfully');
        toast.success('Profile updated successfully!');
        router.back();
      }
    } catch (error) {
      console.error('[EDIT_PROFILE] Error saving:', error);
      toast.error((error as Error).message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: Colors.white }]}>
        <StatusBar barStyle="dark-content" />
        <PageHeader title="Edit Profile" />
        <ScrollView showsVerticalScrollIndicator={false}>
          <ScreenLoader />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors.white }]}>
      <StatusBar barStyle="dark-content" />

      <PageHeader title="Edit Profile" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={[styles.content, { backgroundColor: Colors.screenBg }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.form}>
            {/* First Name Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>First Name *</Text>
              <TextInput
                style={[styles.input, errors.firstName ? styles.inputError : null]}
                placeholder="Enter first name"
                placeholderTextColor={Colors.textMuted}
                value={firstName}
                onChangeText={(text) => {
                  setFirstName(text);
                  if (errors.firstName) {
                    setErrors({ ...errors, firstName: '' });
                  }
                }}
                editable={!saving}
              />
              {errors.firstName && (
                <Text style={styles.errorText}>{errors.firstName}</Text>
              )}
            </View>

            {/* Last Name Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Last Name *</Text>
              <TextInput
                style={[styles.input, errors.lastName ? styles.inputError : null]}
                placeholder="Enter last name"
                placeholderTextColor={Colors.textMuted}
                value={lastName}
                onChangeText={(text) => {
                  setLastName(text);
                  if (errors.lastName) {
                    setErrors({ ...errors, lastName: '' });
                  }
                }}
                editable={!saving}
              />
              {errors.lastName && (
                <Text style={styles.errorText}>{errors.lastName}</Text>
              )}
            </View>

            {/* Email Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email Address *</Text>
              <TextInput
                style={[styles.input, errors.email ? styles.inputError : null]}
                placeholder="Enter email address"
                placeholderTextColor={Colors.textMuted}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errors.email) {
                    setErrors({ ...errors, email: '' });
                  }
                }}
                keyboardType="email-address"
                editable={!saving}
              />
              {errors.email && (
                <Text style={styles.errorText}>{errors.email}</Text>
              )}
            </View>

            {/* Emergency Contact Section */}
            <View style={styles.sectionDivider}>
              <Text style={styles.sectionTitle}>Emergency Contact</Text>
              <Text style={styles.sectionSubtitle}>Used during parking-related incidents (optional)</Text>
            </View>

            {/* Emergency Contact Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Contact Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Father, Spouse, Friend"
                placeholderTextColor={Colors.textMuted}
                value={emergencyContactName}
                onChangeText={setEmergencyContactName}
                editable={!saving}
                maxLength={100}
              />
            </View>

            {/* Emergency Contact Phone */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Contact Phone</Text>
              <TextInput
                style={[styles.input, errors.emergencyContactPhone ? styles.inputError : null]}
                placeholder="10-digit mobile number"
                placeholderTextColor={Colors.textMuted}
                value={emergencyContactPhone}
                onChangeText={(text) => {
                  setEmergencyContactPhone(text.replace(/[^0-9]/g, ''));
                  if (errors.emergencyContactPhone) {
                    setErrors({ ...errors, emergencyContactPhone: '' });
                  }
                }}
                keyboardType="phone-pad"
                maxLength={10}
                editable={!saving}
              />
              {errors.emergencyContactPhone && (
                <Text style={styles.errorText}>{errors.emergencyContactPhone}</Text>
              )}
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing['3xl'],
    paddingTop: Spacing.screenH,
  },
  form: {
    paddingBottom: Spacing['7xl'],
  },
  fieldGroup: {
    marginBottom: Spacing.screenH,
  },
  sectionDivider: {
    marginTop: Spacing.xl,
    marginBottom: Spacing['3xl'],
    paddingTop: Spacing['3xl'],
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  sectionTitle: {
    fontSize: FontSize.xl,                          // 16 = xl ✓
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  sectionSubtitle: {
    fontSize: FontSize.sm,                          // 12 = sm ✓
    color: Colors.textSecondary,
  },
  label: {
    fontSize: FontSize.md,                          // 14 = md ✓
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,                  // 12 = md ✓
    paddingHorizontal: Spacing['3xl'],
    paddingVertical: Spacing.xl,
    fontSize: FontSize.lg,                          // 15 = lg ✓
    color: Colors.textPrimary,
    backgroundColor: Colors.white,
  },
  inputError: {
    borderColor: Colors.errorAlt,
    backgroundColor: ExtendedColors.primaryTint3,   // '#FFF5F5' ✓
  },
  errorText: {
    fontSize: FontSize.sm,                          // 12 = sm ✓
    color: Colors.errorAlt,
    marginTop: Spacing.sm,
    fontWeight: FontWeight.medium,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,                  // 12 = md ✓
    paddingVertical: Spacing['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: Colors.white,
    fontSize: FontSize.xl,                          // 16 = xl ✓
    fontWeight: FontWeight.bold,
  },
});

export default EditProfileScreen;
