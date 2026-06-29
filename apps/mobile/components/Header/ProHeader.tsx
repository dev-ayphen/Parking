import React, { useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Bell, Menu } from 'lucide-react-native';
import Svg, { Path, Defs, RadialGradient, Stop } from 'react-native-svg';
import { useTheme } from '../../hooks/useTheme';
import type { ColorsType } from '../../theme';
import { FontSize, FontWeight, BorderRadius, Spacing } from '../../theme';

const PinIcon = ({ primaryDark, isDark }: { primaryDark: string; isDark: boolean }) => (
  <Svg width={22} height={22} viewBox="0 0 512 512">
    <Defs>
      <RadialGradient id="pinGradHeader" cx="40%" cy="30%" r="70%">
        <Stop offset="0%" stopColor="#FF3D7F" />
        <Stop offset="100%" stopColor={primaryDark} />
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

const makeStyles = (colors: ColorsType, isDark: boolean) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenH,
    paddingVertical: Spacing.xl,
    backgroundColor: colors.white,
    borderBottomWidth: isDark ? 1 : 0,
    borderBottomColor: colors.borderLight,
  },
  iconButtonWrapper: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.circle,
    // In dark: use surfaceBg so it pops above the header card
    backgroundColor: isDark ? colors.surfaceBg : colors.screenBg,
    borderWidth: 1,
    borderColor: isDark ? colors.border : colors.borderLight,
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
    color: colors.textPrimary,
  },
  logoPink: {
    color: colors.primary,
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
    backgroundColor: colors.primary,
    width: 14,
    height: 14,
    borderRadius: BorderRadius.bell,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  bellBadgeText: {
    color: colors.white,
    fontSize: FontSize.tiny,
    fontWeight: FontWeight.boldAlias,
  },
});

const ProHeader: React.FC<ProHeaderProps> = ({
  onMenuPress,
  onNotificationPress,
  notificationCount = 0,
}) => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  // In dark mode use a brighter icon color so they're clearly visible
  const iconColor = isDark ? colors.textPrimary : colors.textDark;

  return (
    <View style={styles.container}>
      <TouchableOpacity activeOpacity={0.7} onPress={onMenuPress} style={styles.iconButtonWrapper}>
        <Menu size={20} color={iconColor} strokeWidth={2.5} />
      </TouchableOpacity>

      <View style={styles.logoContainer}>
        <PinIcon primaryDark={colors.primaryDark} isDark={isDark} />
        <Text style={styles.logoText}>
          <Text style={styles.logoBlack}>Park</Text>
          <Text style={styles.logoPink}>Swift</Text>
        </Text>
      </View>

      <View style={styles.rightActions}>
        <TouchableOpacity activeOpacity={0.7} onPress={onNotificationPress} style={styles.iconButtonWrapper}>
          <Bell size={20} color={iconColor} strokeWidth={2.5} />
          {notificationCount > 0 && (
            <View style={styles.bellBadge}>
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

export default ProHeader;
