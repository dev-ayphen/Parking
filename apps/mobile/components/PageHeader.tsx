import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronLeft, MapPin, Menu } from 'lucide-react-native';
import { FontSize, FontWeight, BorderRadius, Spacing } from '../theme';
import type { ColorsType } from '../theme';
import { useTheme } from '../hooks/useTheme';

interface PageHeaderProps {
  title?: string;
  logo?: boolean;
  onBack?: () => void;
  onMenu?: () => void;
  right?: React.ReactNode;
  backgroundColor?: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  logo = false,
  onBack,
  onMenu,
  right,
  backgroundColor,
}) => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  return (
    <View style={[styles.header, { backgroundColor: backgroundColor ?? colors.white }]}>
      <View style={styles.row}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onMenu ?? onBack}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          {onMenu
            ? <Menu size={18} color={isDark ? colors.textPrimary : colors.textDark} strokeWidth={2.5} />
            : <ChevronLeft size={18} color={isDark ? colors.textPrimary : colors.textDark} strokeWidth={2.5} />
          }
        </TouchableOpacity>

        {logo ? (
          <View style={styles.centerAbsolute} pointerEvents="none">
            <MapPin size={16} color={colors.primary} strokeWidth={2.5} />
            <Text style={styles.logoText}>
              Park<Text style={{ color: colors.primary }}>Swift</Text>
            </Text>
          </View>
        ) : (
          <View style={styles.centerAbsolute} pointerEvents="none">
            <Text style={styles.titleText} numberOfLines={1}>{title}</Text>
          </View>
        )}

        <View style={styles.right}>{right ?? null}</View>
      </View>
    </View>
  );
};

const makeStyles = (colors: ColorsType, isDark: boolean) => StyleSheet.create({
  header: {
    paddingHorizontal: Spacing.screenH,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: isDark ? 1 : 0,
    borderBottomColor: colors.borderLight,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 46,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.circle,
    // Dark: surfaceBg so it stands out from the card-colored header
    backgroundColor: isDark ? colors.surfaceBg : colors.screenBg,
    borderWidth: 1,
    borderColor: isDark ? colors.border : colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0 : 0.06,
    shadowRadius: 4,
    elevation: isDark ? 0 : 2,
  },
  centerAbsolute: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  logoText: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.black,
    color: colors.textPrimary,
    letterSpacing: -0.6,
  },
  titleText: {
    textAlign: 'center',
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.bold,
    color: colors.textPrimary,
  },
  right: {
    minWidth: 38,
    minHeight: 38,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});

export default PageHeader;
