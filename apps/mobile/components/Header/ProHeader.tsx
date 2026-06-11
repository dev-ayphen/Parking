import React, { useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Text,
} from 'react-native';
import { Bell, Menu } from 'lucide-react-native';
import Svg, { Path, Defs, RadialGradient, Stop } from 'react-native-svg';
import { useTheme } from '../../hooks/useTheme';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing } from '../../theme';

const PinIcon = ({ size = 24 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 512 512">
    <Defs>
      <RadialGradient id="pinGradHeader" cx="40%" cy="30%" r="70%">
        <Stop offset="0%" stopColor="#FF3D7F" />
        <Stop offset="100%" stopColor={Colors.primaryDark} />
      </RadialGradient>
    </Defs>
    <Path
      fill="url(#pinGradHeader)"
      d="M256 32C167.6 32 96 103.6 96 192c0 112 160 288 160 288s160-176 160-288C416 103.6 344.4 32 256 32zm0 224c-35.3 0-64-28.7-64-64s28.7-64 64-64 64 28.7 64 64-28.7 64-64 64z"
    />
  </Svg>
);

interface ProHeaderProps {
  onMenuPress: () => void;
  onNotificationPress: () => void;
  notificationCount?: number;
  profileImage?: string;
}

const ProHeader: React.FC<ProHeaderProps> = ({
  onMenuPress,
  onNotificationPress,
  notificationCount = 0,
}) => {
  const theme = useTheme();

  const dynamicStyles = useMemo(
    () =>
      StyleSheet.create({
        container: { backgroundColor: theme.colors.white },
        badge: { backgroundColor: theme.colors.primary },
        titleBlack: { color: theme.colors.textPrimary },
        titlePink: { color: theme.colors.primary },
      }),
    [theme]
  );

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <TouchableOpacity activeOpacity={0.7} onPress={onMenuPress} style={styles.iconButtonWrapper}>
        <Menu size={20} color={Colors.textDark} strokeWidth={2.5} />
      </TouchableOpacity>

      <View style={styles.logoContainer}>
        <PinIcon size={22} />
        <Text style={styles.logoText}>
          <Text style={[styles.logoBlack, dynamicStyles.titleBlack]}>Park</Text>
          <Text style={[styles.logoPink, dynamicStyles.titlePink]}>Swift</Text>
        </Text>
      </View>

      <View style={styles.rightActions}>
        <TouchableOpacity activeOpacity={0.7} onPress={onNotificationPress} style={styles.iconButtonWrapper}>
          <Bell size={20} color={Colors.textDark} strokeWidth={2.5} />
          {notificationCount > 0 && (
            <View style={[styles.bellBadge, dynamicStyles.badge]}>
              <Text style={styles.bellBadgeText}>
                {notificationCount > 99 ? '99+' : notificationCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenH,
    paddingVertical: Spacing.xl,
    backgroundColor: Colors.white,
    borderBottomWidth: 0,
  },
  iconButtonWrapper: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.circle,
    backgroundColor: Colors.screenBg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  logoText: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.black,
    letterSpacing: -0.6,
  },
  logoBlack: {
    color: Colors.textPrimary,
  },
  logoPink: {
    color: Colors.primary,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  bellBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: Colors.primary,
    width: 14,
    height: 14,
    borderRadius: BorderRadius.bell,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
  bellBadgeText: {
    color: Colors.white,
    fontSize: FontSize.tiny,
    fontWeight: FontWeight.boldAlias,
  },
});

export default ProHeader;
