import { Tabs, Redirect } from 'expo-router';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../store/authStore';
import { LayoutDashboard, Building2, CheckCircle, Clock, ClipboardList } from 'lucide-react-native';
import { Platform, View, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, BorderRadius, Spacing, ExtendedColors } from '../../theme';

// Full-screen action pages that should hide the entire tab bar (so their
// footer buttons aren't covered by the floating nav).
const FULLSCREEN_ROUTES = ['booking-request', 'exit-verification', 'analytics', 'manage-subscription', 'billing-history'];

// Floating tab-bar geometry lives in constants/tabBar.ts so the global
// SessionBar can clear the bar without importing this route module. The styles
// below (height 64, paddingBottom iOS 32 / Android 20) must stay in sync with it.

function CustomTabBar({ state, descriptors, navigation }: any) {
  // Hide the whole tab bar on full-screen action pages
  const activeRoute = state.routes[state.index]?.name;
  if (FULLSCREEN_ROUTES.includes(activeRoute)) {
    return null;
  }

  return (
    <View style={styles.tabBarContainer}>
      <View style={styles.tabBarBackground}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];

          // Hide auxiliary screens from tab bar.
          // We use a strict whitelist so that any newly added files don't create invisible slots.
          const VISIBLE_TABS = ['index', 'spaces', 'verify', 'active', 'history'];
          if (!VISIBLE_TABS.includes(route.name)) {
            return null;
          }

          const isFocused = state.index === index;
          const isVerify = route.name === 'verify';

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          let icon;
          const color = isFocused ? Colors.white : Colors.textMuted;
          const strokeWidth = isFocused ? 2.5 : 2;

          if (route.name === 'index') icon = <LayoutDashboard size={22} color={color} strokeWidth={strokeWidth} />;
          if (route.name === 'spaces') icon = <Building2 size={22} color={color} strokeWidth={strokeWidth} />;
          if (route.name === 'active') icon = <Clock size={22} color={color} strokeWidth={strokeWidth} />;
          if (route.name === 'history') icon = <ClipboardList size={22} color={color} strokeWidth={strokeWidth} />;

          if (isVerify) {
            return (
              <TouchableOpacity
                key={route.key}
                onPress={onPress}
                activeOpacity={0.8}
                style={styles.verifyButtonWrapper}
              >
                <View style={[styles.verifyButton, !isFocused && styles.verifyButtonInactive]}>
                  <CheckCircle size={28} color={isFocused ? Colors.white : Colors.primary} strokeWidth={isFocused ? 2.5 : 2} />
                </View>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={styles.tabItem}
            >
              {icon}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function MySpacesLayout() {
  const theme = useTheme();
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);

  // Wait for hydration before deciding (no flicker), then guard on missing auth.
  if (!isHydrated) return null;
  if (!token || !user) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        animation: 'slide_from_right',
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="spaces" options={{ title: 'Spaces' }} />
      <Tabs.Screen name="verify" options={{ title: 'Verify' }} />
      <Tabs.Screen name="active" options={{ title: 'Active' }} />
      <Tabs.Screen name="history" options={{ title: 'History' }} />

      {/* Hide other screens from the tab bar */}
      <Tabs.Screen name="analytics" options={{ href: null }} />
      <Tabs.Screen name="manage-subscription" options={{ href: null }} />
      <Tabs.Screen name="subscription-plans" options={{ href: null }} />
      <Tabs.Screen name="billing-history" options={{ href: null }} />
      <Tabs.Screen name="exit-verification" options={{ href: null }} />
      <Tabs.Screen name="booking-request" options={{ href: null }} />
      <Tabs.Screen name="recent-requests" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
    paddingHorizontal: Spacing.screenH,
    backgroundColor: 'transparent',
  },
  tabBarBackground: {
    flexDirection: 'row',
    backgroundColor: ExtendedColors.darkCard,       // '#1E293B' ✓
    borderRadius: BorderRadius.circleLg,            // 32 = circleLg ✓
    height: 64,
    alignItems: 'center',
    // Every slot is flex:1 and centered, so the five items are perfectly even
    // and the center Verify button sits dead-center. No extra horizontal padding —
    // the flex slots already fill the bar evenly; padding would skew the spacing.
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 64,
  },
  verifyButtonWrapper: {
    flex: 1,                                          // equal slot → button sits dead-center
    alignItems: 'center',
    justifyContent: 'center',
    height: 64, // Matches the tab bar height to ensure vertical alignment of surrounding elements
  },
  verifyButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -32,
    borderWidth: 4,
    borderColor: Colors.screenBg,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  verifyButtonInactive: {
    backgroundColor: '#2D3748',
    borderColor: Colors.primary,
    shadowOpacity: 0,
    elevation: 0,
  },
});
