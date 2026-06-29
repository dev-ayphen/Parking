import React, { useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {
  LayoutDashboard,
  Navigation,
  Car,
  Settings,
  HelpCircle,
  LogOut,
  User,
  ChevronRight,
  FileWarning,
  AlertTriangle,
  Building2,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import type { ColorsType } from '../../theme';
import DrawerItem from './DrawerItem';
import { Spacing } from '../../theme/colors';

const { width } = Dimensions.get('window');

interface DrawerMenuItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  badge?: number | string;
}

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  userImage?: string;
  userRole: 'parker' | 'owner' | 'both';
  activeRoute?: string;
  onMenuItemPress?: (menuId: string) => void;
  items?: DrawerMenuItem[];
}

const makeStyles = (colors: ColorsType, isDark: boolean) => StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: isDark ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.5)',
    zIndex: 99,
  },
  drawer: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: width * 0.75,
    backgroundColor: colors.white,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    zIndex: 100,
    // subtle shadow to lift from screen
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: isDark ? 0.6 : 0.15,
    shadowRadius: 16,
    elevation: 16,
  },
  content: { flex: 1 },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 14,
    backgroundColor: colors.surfaceBg,
  },
  userAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    flexShrink: 0,
  },
  userInfo: { flex: 1 },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  userRole: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: Spacing.md,
    marginHorizontal: Spacing.lg,
  },
  menuSection: { gap: 2 },
  bottomContainer: {
    marginTop: 'auto',
    paddingTop: 16,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textMuted,
  },
});

const NavigationDrawer: React.FC<NavigationDrawerProps> = ({
  isOpen,
  onClose,
  userName,
  userImage,
  userRole,
  activeRoute = '',
  onMenuItemPress,
  items,
}) => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const insets = useSafeAreaInsets();

  const iconColor = isDark ? colors.textDark : '#64748B';

  const defaultItems: DrawerMenuItem[] = [
    {
      id: 'home',
      icon: <LayoutDashboard size={22} color={activeRoute === 'home' ? colors.primary : iconColor} strokeWidth={2.5} />,
      label: 'Home',
      onPress: () => { onMenuItemPress?.('home'); onClose(); },
    },
    {
      id: 'find-parking',
      icon: <Navigation size={22} color={activeRoute === 'find-parking' ? colors.primary : iconColor} strokeWidth={2.5} />,
      label: 'Find Parking',
      onPress: () => { onMenuItemPress?.('find-parking'); onClose(); },
    },
    {
      id: 'my-vehicles',
      icon: <Car size={22} color={activeRoute === 'my-vehicles' ? colors.primary : iconColor} strokeWidth={2.5} />,
      label: 'My Vehicles',
      onPress: () => { onMenuItemPress?.('my-vehicles'); onClose(); },
    },
    {
      id: 'my-spaces',
      icon: <Building2 size={22} color={activeRoute === 'my-spaces' ? colors.primary : iconColor} strokeWidth={2.5} />,
      label: 'My Spaces',
      onPress: () => { onMenuItemPress?.('my-spaces'); onClose(); },
    },
    {
      id: 'my-reports',
      icon: <FileWarning size={22} color={activeRoute === 'my-reports' ? colors.primary : iconColor} strokeWidth={2.5} />,
      label: 'My Reports',
      onPress: () => { onMenuItemPress?.('my-reports'); onClose(); },
    },
    {
      id: 'my-incidents',
      icon: <AlertTriangle size={22} color={activeRoute === 'my-incidents' ? colors.primary : iconColor} strokeWidth={2.5} />,
      label: 'My Incidents',
      onPress: () => { onMenuItemPress?.('my-incidents'); onClose(); },
    },
    {
      id: 'settings',
      icon: <Settings size={22} color={activeRoute === 'settings' ? colors.primary : iconColor} strokeWidth={2.5} />,
      label: 'Settings',
      onPress: () => { onMenuItemPress?.('settings'); onClose(); },
    },
    {
      id: 'help',
      icon: <HelpCircle size={22} color={activeRoute === 'help' ? colors.primary : iconColor} strokeWidth={2.5} />,
      label: 'Help & Support',
      onPress: () => { onMenuItemPress?.('help'); onClose(); },
    },
  ];

  const menuItems = items || defaultItems;

  if (!isOpen) return null;

  return (
    <>
      <TouchableOpacity style={styles.overlay} onPress={onClose} activeOpacity={1} />
      <View style={styles.drawer}>
        <ScrollView
          style={styles.content}
          contentContainerStyle={{ flexGrow: 1, paddingTop: Math.max(insets.top, 24) }}
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            style={styles.userSection}
            activeOpacity={0.7}
            onPress={() => { onMenuItemPress?.('profile'); onClose(); }}
          >
            {userImage ? (
              <Image source={{ uri: userImage }} style={styles.userAvatar} onError={() => {}} />
            ) : (
              <View style={styles.userAvatarPlaceholder}>
                <User size={22} color={colors.textSecondary} strokeWidth={2} />
              </View>
            )}
            <View style={styles.userInfo}>
              <Text style={styles.userName} numberOfLines={1}>{userName}</Text>
              <Text style={styles.userRole} numberOfLines={1}>Tap to view profile</Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} strokeWidth={2} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <View style={styles.menuSection}>
            {menuItems.map((item) => (
              <DrawerItem
                key={item.id}
                icon={item.icon}
                label={item.label}
                isActive={activeRoute === item.id}
                badge={item.badge}
                onPress={item.onPress}
              />
            ))}
          </View>

          <View style={{ flex: 1 }} />

          <View style={styles.bottomContainer}>
            <DrawerItem
              icon={<LogOut size={22} color={colors.error} strokeWidth={2.5} />}
              label="Logout"
              isActive={false}
              onPress={() => { onMenuItemPress?.('logout'); onClose(); }}
            />
            <View style={[styles.divider, { marginVertical: 12 }]} />
            <View style={styles.footer}>
              <Text style={styles.footerText}>ParkSwift v1.0.0</Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </>
  );
};

export default NavigationDrawer;
