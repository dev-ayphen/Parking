import React, { useMemo } from 'react';
import {View,
  ScrollView,
  StyleSheet,
  Text,
  Image,
  TouchableOpacity,
  Dimensions} from 'react-native';
import {
  Home,
  MapPin,
  Car,
  Settings,
  HelpCircle,
  LogOut,
  X,
  User,
  ChevronRight,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import DrawerItem from './DrawerItem';
import { Spacing, Typography } from '../../theme/colors';

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
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  // Use a standard gray/slate color for all inactive icons
  const standardIconColor = '#64748B';

  const defaultItems: DrawerMenuItem[] = [
    {
      id: 'home',
      icon: <Home size={22} color={activeRoute === 'home' ? theme.colors.primary : standardIconColor} strokeWidth={2.5} />,
      label: 'Home',
      onPress: () => {
        onMenuItemPress?.('home');
        onClose();
      },
    },
    {
      id: 'find-parking',
      icon: <MapPin size={22} color={activeRoute === 'find-parking' ? theme.colors.primary : standardIconColor} strokeWidth={2.5} />,
      label: 'Find Parking',
      onPress: () => {
        onMenuItemPress?.('find-parking');
        onClose();
      },
    },
    {
      id: 'my-vehicles',
      icon: <Car size={22} color={activeRoute === 'my-vehicles' ? theme.colors.primary : standardIconColor} strokeWidth={2.5} />,
      label: 'My Vehicles',
      onPress: () => {
        onMenuItemPress?.('my-vehicles');
        onClose();
      },
    },
    {
      id: 'my-spaces',
      icon: <MapPin size={22} color={activeRoute === 'my-spaces' ? theme.colors.primary : standardIconColor} strokeWidth={2.5} />,
      label: 'My Spaces',
      onPress: () => {
        onMenuItemPress?.('my-spaces');
        onClose();
      },
      badge: userRole === 'owner' || userRole === 'both' ? undefined : undefined,
    },
    {
      id: 'settings',
      icon: <Settings size={22} color={activeRoute === 'settings' ? theme.colors.primary : standardIconColor} strokeWidth={2.5} />,
      label: 'Settings',
      onPress: () => {
        onMenuItemPress?.('settings');
        onClose();
      },
    },
    {
      id: 'help',
      icon: <HelpCircle size={22} color={activeRoute === 'help' ? theme.colors.primary : standardIconColor} strokeWidth={2.5} />,
      label: 'Help & Support',
      onPress: () => {
        onMenuItemPress?.('help');
        onClose();
      },
    },
  ];

  const menuItems = items || defaultItems;

  const dynamicStyles = useMemo(
    () =>
      StyleSheet.create({
        drawer: {
          backgroundColor: '#FFFFFF',
          borderRightColor: theme.colors.borderLight,
        },
        userNameText: {
          color: theme.colors.textPrimary,
        },
        userRoleText: {
          color: theme.colors.textSecondary,
        },
        divider: {
          backgroundColor: 'rgba(0,0,0,0.05)',
        },
        footerText: {
          color: theme.colors.textMuted,
        },
      }),
    [theme]
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <TouchableOpacity
        style={styles.overlay}
        onPress={onClose}
        activeOpacity={1}
      />

      {/* Drawer */}
      <View style={[styles.drawer, dynamicStyles.drawer]}>
        
        <ScrollView
          style={styles.content}
          contentContainerStyle={{ flexGrow: 1, paddingTop: Math.max(insets.top, 24) }}
          showsVerticalScrollIndicator={false}
        >
          {/* User Section — single tappable row */}
          <TouchableOpacity
            style={styles.userSection}
            activeOpacity={0.7}
            onPress={() => { onMenuItemPress?.('profile'); onClose(); }}
          >
            {userImage ? (
              <Image source={{ uri: userImage }} style={styles.userAvatar} />
            ) : (
              <View style={styles.userAvatarPlaceholder}>
                <User size={22} color="#94A3B8" strokeWidth={2} />
              </View>
            )}

            <View style={styles.userInfo}>
              <Text style={[styles.userName, dynamicStyles.userNameText]} numberOfLines={1}>
                {userName}
              </Text>
              <Text style={[styles.userRole, dynamicStyles.userRoleText]} numberOfLines={1}>
                {userRole === 'both' ? 'Driver & Space Owner' : userRole === 'parker' ? 'Driver' : 'Space Owner'}
              </Text>
            </View>

            <ChevronRight size={18} color="#94A3B8" strokeWidth={2} />
          </TouchableOpacity>

          <View style={[styles.divider, dynamicStyles.divider]} />

          {/* Menu Items */}
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

          {/* Bottom Section (Logout & Footer) */}
          <View style={styles.bottomContainer}>
            <DrawerItem
              icon={<LogOut size={22} color="#EF4444" strokeWidth={2.5} />}
              label="Logout"
              isActive={false}
              onPress={() => {
                onMenuItemPress?.('logout');
                onClose();
              }}
            />
            
            <View style={[styles.divider, dynamicStyles.divider, { marginVertical: 12 }]} />
            
            <View style={styles.footer}>
              <Text style={[styles.footerText, dynamicStyles.footerText]}>
                ParkSwift v1.0.0
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 99,
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: width * 0.75,
    borderRightWidth: 1,
    zIndex: 100,
  },
  content: {
    flex: 1,
  },
  headerTop: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xs,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    flexShrink: 0,
  },
  userAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  userRole: {
    fontSize: 12,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginVertical: Spacing.md,
    marginHorizontal: Spacing.lg,
  },
  menuSection: {
    gap: 4,
  },
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
  },
});

export default NavigationDrawer;
