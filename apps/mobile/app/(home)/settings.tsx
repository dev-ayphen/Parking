import React, { useState, useEffect } from 'react';
import {View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Switch,
  Platform,
  ActivityIndicator,
  Alert} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Bell, Lock, Globe, Moon, Shield } from 'lucide-react-native';
import { PageHeader } from '../../components';
import { api } from '../../services/api';
import { toast } from '../../utils/toast';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing } from '../../theme';
import { useThemeStore } from '../../store/themeStore';

export default function SettingsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(true);

  // Theme — driven by themeStore so the whole app reacts
  const { mode: themeMode, setMode: setThemeMode } = useThemeStore();
  const darkTheme = themeMode === 'dark';

  // Fetch saved preferences from API on mount
  useEffect(() => {
    (async () => {
      try {
        const json = await api.get('/user-preferences');
        if (json.success && json.preferences) {
          const p = json.preferences;
          setPushEnabled(p.pushNotifications ?? true);
          setEmailEnabled(p.emailNotifications ?? false);
          setLocationEnabled(p.locationServices ?? true);
          // Sync API preference → themeStore on load
          if (p.darkTheme === true) setThemeMode('dark');
        }
      } catch (e) {
        if (__DEV__) console.log('[SETTINGS] load error', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Persist a toggle change to the backend.
  // Returns true on success; on failure we revert the switch so the UI never lies.
  const updatePreference = async (key: string, value: boolean): Promise<boolean> => {
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
    setter(next); // optimistic
    const ok = await updatePreference(key, next);
    if (!ok) {
      // Revert and tell the user it didn't save.
      setter(current);
      toast.error('Could not save. Check your connection.');
      return;
    }
    // One helpful note when location is turned off — it affects parking search.
    if (key === 'locationServices' && next === false) {
      Alert.alert(
        'Location Services Off',
        'Parking search will use a default area instead of your current location. You can turn this back on anytime.',
      );
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <PageHeader title="Settings" />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <PageHeader title="Settings" />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.settingsGroup}>
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.iconContainer}><Bell size={20} color={Colors.textSecondary} /></View>
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Push Notifications</Text>
                <Text style={styles.settingDesc}>Get updates about your bookings</Text>
              </View>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={() => toggle('pushNotifications', setPushEnabled, pushEnabled)}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor={Colors.white}
            />
          </View>
          <View style={styles.separator} />
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.iconContainer}><Shield size={20} color={Colors.textSecondary} /></View>
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Email Notifications</Text>
                <Text style={styles.settingDesc}>Receive email updates</Text>
              </View>
            </View>
            <Switch
              value={emailEnabled}
              onValueChange={() => toggle('emailNotifications', setEmailEnabled, emailEnabled)}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor={Colors.white}
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Appearance</Text>
        <View style={styles.settingsGroup}>
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.iconContainer}><Moon size={20} color={Colors.textSecondary} /></View>
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Dark Theme</Text>
                <Text style={styles.settingDesc}>Switch to dark mode</Text>
              </View>
            </View>
            <Switch
              value={darkTheme}
              onValueChange={async (val) => {
                setThemeMode(val ? 'dark' : 'light'); // apply immediately for instant feedback
                const ok = await updatePreference('darkTheme', val);
                if (!ok) {
                  setThemeMode(val ? 'light' : 'dark'); // revert
                  toast.error('Could not save. Check your connection.');
                }
              }}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor={Colors.white}
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Privacy</Text>
        <View style={styles.settingsGroup}>
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.iconContainer}><Globe size={20} color={Colors.textSecondary} /></View>
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Location Services</Text>
                <Text style={styles.settingDesc}>Allow location access for parking search</Text>
              </View>
            </View>
            <Switch
              value={locationEnabled}
              onValueChange={() => toggle('locationServices', setLocationEnabled, locationEnabled)}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor={Colors.white}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  _unusedHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenH, paddingVertical: Spacing['3xl'], backgroundColor: Colors.white,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 4 },
    }),
  },
  backButton: {
    width: 38, height: 38, borderRadius: BorderRadius.circle, backgroundColor: Colors.screenBg,   // 19 = circle ✓
    borderWidth: 1, borderColor: Colors.surfaceBg, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: FontSize['3xl'], fontWeight: FontWeight.bold, color: Colors.textPrimary },  // 20 = 3xl ✓
  scrollView: { backgroundColor: Colors.screenBg },
  content: { padding: Spacing.screenH },
  sectionTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 0, marginBottom: Spacing.lg, marginTop: Spacing.screenH },  // 13 = base ✓
  settingsGroup: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, overflow: 'hidden' },  // 16 = lg ✓
  settingItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing['3xl'], gap: Spacing.xl },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xl, flex: 1 },
  settingText: { flex: 1 },
  iconContainer: { width: 40, height: 40, borderRadius: BorderRadius.md, backgroundColor: Colors.screenBg, alignItems: 'center', justifyContent: 'center' },  // 12 = md ✓
  settingLabel: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, color: Colors.textPrimary, marginBottom: Spacing.micro },  // 15 = lg ✓
  settingDesc: { fontSize: FontSize.sm, color: Colors.textMuted },  // 12 = sm ✓
  separator: { height: 1, backgroundColor: Colors.surfaceBg, marginLeft: 68 },
});
