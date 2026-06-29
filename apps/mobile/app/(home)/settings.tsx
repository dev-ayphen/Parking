import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Bell, Globe, Moon, Shield, Trash2, Sun, Smartphone } from 'lucide-react-native';
import { PageHeader } from '../../components';
import { api } from '../../services/api';
import { toast } from '../../utils/toast';
import { FontSize, FontWeight, BorderRadius, Spacing } from '../../theme';
import type { ColorsType } from '../../theme';
import { useTheme } from '../../hooks/useTheme';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';

type ThemeOption = 'light' | 'dark' | 'system';

const THEME_OPTIONS: { value: ThemeOption; label: string; desc: string }[] = [
  { value: 'light', label: 'Light', desc: 'Always light' },
  { value: 'dark',  label: 'Dark',  desc: 'Always dark' },
  { value: 'system', label: 'System', desc: 'Follow device' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [loading, setLoading] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(true);

  const { mode: themeMode, setMode: setThemeMode } = useThemeStore();
  const logout = useAuthStore((s) => s.logout);
  const [deleting, setDeleting] = useState(false);
  // Whether the user currently has a paid subscription — drives the delete-dialog copy.
  const [hasPaidPlan, setHasPaidPlan] = useState(false);

  const runDelete = async () => {
    try {
      setDeleting(true);
      await api.delete('/users/me');
      await logout();
      Alert.alert(
        'Account Deleted',
        'Your ParkSwift account has been deactivated. You have been signed out from all devices.',
        [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }],
      );
    } catch (e: any) {
      setDeleting(false);
      Alert.alert('Could not delete', e?.message || 'Please try again.');
    }
  };

  const handleDeleteAccount = () => {
    // Accurate copy: this is a deactivation/soft-delete. Records are retained for
    // legal/financial purposes; an active subscription is cancelled (no future charges).
    const subLine = hasPaidPlan
      ? '\n• Your active subscription will be cancelled — you will not be charged for future renewals.'
      : '';
    Alert.alert(
      'Delete Your Account?',
      'This will permanently deactivate your ParkSwift account.\n' +
        '\n• You will be signed out from all devices.' +
        '\n• Your parking spaces will be removed from public listings.' +
        subLine +
        '\n• Past bookings, payments, and transaction records are retained for legal and financial purposes.' +
        '\n\nThis action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete Account', style: 'destructive', onPress: runDelete },
      ],
    );
  };

  useEffect(() => {
    (async () => {
      try {
        const json = await api.get('/user-preferences');
        if (json.success && json.preferences) {
          const p = json.preferences;
          setPushEnabled(p.pushNotifications ?? true);
          setEmailEnabled(p.emailNotifications ?? false);
          setLocationEnabled(p.locationServices ?? true);
          // Sync saved theme mode → store on load
          if (p.themeMode && ['light', 'dark', 'system'].includes(p.themeMode)) {
            setThemeMode(p.themeMode as ThemeOption);
          } else if (p.darkTheme === true) {
            // legacy boolean field — upgrade to string
            setThemeMode('dark');
          }
        }
      } catch (e) {
        if (__DEV__) console.log('[SETTINGS] load error', e);
        Alert.alert('Could not load settings', 'Your preferences could not be loaded. Defaults shown.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Detect a paid subscription so the delete dialog can warn it will be cancelled.
  // Best-effort: failure just falls back to the no-subscription copy.
  useEffect(() => {
    (async () => {
      try {
        const json = await api.get('/subscriptions/me');
        const plan = json?.currentPlan;
        setHasPaidPlan(!!(plan && plan.id && plan.price > 0));
      } catch {
        /* ignore — default to no paid plan */
      }
    })();
  }, []);

  const updatePreference = async (key: string, value: boolean | string): Promise<boolean> => {
    try {
      await api.put('/user-preferences', { [key]: value });
      return true;
    } catch (e) {
      if (__DEV__) console.log('[SETTINGS] save error', e);
      return false;
    }
  };

  const toggle = async (
    key: string,
    setter: (v: boolean) => void,
    current: boolean,
  ) => {
    const next = !current;
    setter(next);
    const ok = await updatePreference(key, next);
    if (!ok) {
      setter(current);
      toast.error('Could not save. Check your connection.');
      return;
    }
    if (key === 'locationServices' && next === false) {
      Alert.alert(
        'Location Services Off',
        'Parking search will use a default area instead of your current location. You can turn this back on anytime.',
      );
    }
  };

  const selectTheme = async (option: ThemeOption) => {
    const prev = themeMode;
    setThemeMode(option); // apply immediately
    const ok = await updatePreference('themeMode', option);
    if (!ok) {
      setThemeMode(prev); // revert
      toast.error('Could not save. Check your connection.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <PageHeader title="Settings" onBack={() => router.replace('/(home)')} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <PageHeader title="Settings" onBack={() => router.replace('/(home)')} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.settingsGroup}>
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.iconContainer}>
                <Bell size={20} color={colors.textSecondary} />
              </View>
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Push Notifications</Text>
                <Text style={styles.settingDesc}>Get updates about your bookings</Text>
              </View>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={() => toggle('pushNotifications', setPushEnabled, pushEnabled)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>
          <View style={styles.separator} />
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.iconContainer}>
                <Shield size={20} color={colors.textSecondary} />
              </View>
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Email Notifications</Text>
                <Text style={styles.settingDesc}>Receive email updates</Text>
              </View>
            </View>
            <Switch
              value={emailEnabled}
              onValueChange={() => toggle('emailNotifications', setEmailEnabled, emailEnabled)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Appearance</Text>
        <View style={styles.settingsGroup}>
          {THEME_OPTIONS.map((opt, i) => {
            const selected = themeMode === opt.value;
            const Icon = opt.value === 'light' ? Sun : opt.value === 'dark' ? Moon : Smartphone;
            return (
              <React.Fragment key={opt.value}>
                {i > 0 && <View style={styles.separator} />}
                <TouchableOpacity
                  style={styles.settingItem}
                  onPress={() => selectTheme(opt.value)}
                  activeOpacity={0.7}
                >
                  <View style={styles.settingLeft}>
                    <View style={[styles.iconContainer, selected && styles.iconContainerActive]}>
                      <Icon size={20} color={selected ? colors.primary : colors.textSecondary} />
                    </View>
                    <View style={styles.settingText}>
                      <Text style={[styles.settingLabel, selected && styles.settingLabelActive]}>
                        {opt.label}
                      </Text>
                      <Text style={styles.settingDesc}>{opt.desc}</Text>
                    </View>
                  </View>
                  <View style={[styles.radioOuter, selected && styles.radioOuterActive]}>
                    {selected && <View style={styles.radioInner} />}
                  </View>
                </TouchableOpacity>
              </React.Fragment>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Privacy</Text>
        <View style={styles.settingsGroup}>
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.iconContainer}>
                <Globe size={20} color={colors.textSecondary} />
              </View>
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Location Services</Text>
                <Text style={styles.settingDesc}>Allow location access for parking search</Text>
              </View>
            </View>
            <Switch
              value={locationEnabled}
              onValueChange={() => toggle('locationServices', setLocationEnabled, locationEnabled)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.settingsGroup}>
          <TouchableOpacity
            style={styles.dangerRow}
            onPress={handleDeleteAccount}
            disabled={deleting}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.iconContainer, { backgroundColor: colors.errorBg }]}>
                <Trash2 size={20} color={colors.error} />
              </View>
              <View style={styles.settingText}>
                <Text style={[styles.settingLabel, { color: colors.error }]}>Delete Account</Text>
                <Text style={styles.settingDesc}>Permanently delete your account and data</Text>
              </View>
            </View>
            {deleting && <ActivityIndicator size="small" color={colors.error} />}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ColorsType) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  scrollView: { backgroundColor: colors.screenBg },
  content: { padding: Spacing.screenH },
  sectionTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: colors.textMuted,
    letterSpacing: 0,
    marginBottom: Spacing.lg,
    marginTop: Spacing.screenH,
  },
  settingsGroup: {
    backgroundColor: colors.white,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing['3xl'],
    gap: Spacing.xl,
  },
  dangerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing['3xl'],
    gap: Spacing.xl,
  },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xl, flex: 1 },
  settingText: { flex: 1 },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: colors.screenBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerActive: {
    backgroundColor: colors.primaryBg,
  },
  settingLabel: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: Spacing.micro,
  },
  settingLabelActive: {
    color: colors.primary,
  },
  settingDesc: { fontSize: FontSize.sm, color: colors.textMuted },
  separator: { height: 1, backgroundColor: colors.surfaceBg, marginLeft: 68 },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
});
