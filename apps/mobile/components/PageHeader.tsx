import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, MapPin, Menu } from 'lucide-react-native';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing } from '../theme';

interface PageHeaderProps {
  title?: string;
  logo?: boolean;          // show ParkSwift logo instead of title text
  onBack?: () => void;
  onMenu?: () => void;     // show hamburger instead of back chevron
  right?: React.ReactNode;
  backgroundColor?: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  logo = false,
  onBack,
  onMenu,
  right,
  backgroundColor = Colors.white,
}) => {
  const router = useRouter();
  return (
    <View style={[styles.header, { backgroundColor }]}>
      <View style={styles.row}>
        {/* Left button — hamburger (home) or back chevron (all other screens) */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={onMenu ?? onBack ?? (() => router.back())}
          activeOpacity={0.7}
        >
          {onMenu
            ? <Menu size={18} color={Colors.textDark} strokeWidth={2.5} />
            : <ChevronLeft size={18} color={Colors.textDark} strokeWidth={2.5} />
          }
        </TouchableOpacity>

        {/* Center — either logo or plain title, absolutely positioned so it's
            always in the true screen center regardless of side control widths. */}
        {logo ? (
          <View style={styles.centerAbsolute} pointerEvents="none">
            <MapPin size={16} color={Colors.primary} strokeWidth={2.5} />
            <Text style={styles.logoText}>
              Park<Text style={{ color: Colors.primary }}>Swift</Text>
            </Text>
          </View>
        ) : (
          <Text style={styles.titleAbsolute} numberOfLines={1} pointerEvents="none">
            {title}
          </Text>
        )}

        {/* Right slot — fixed width matches back button to keep center balanced */}
        <View style={styles.right}>
          {right ?? null}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing.screenH,
    paddingVertical: Spacing.md,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) + Spacing.xs : Spacing.md,
    backgroundColor: Colors.white,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.circle,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  centerAbsolute: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 36,
    pointerEvents: 'none',
  },
  logoText: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.black,
    color: Colors.textPrimary,
    letterSpacing: -0.6,
  },
  titleAbsolute: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    height: 36,
    lineHeight: 36,
    textAlignVertical: 'center',
  },
  right: {
    minWidth: 36,
    minHeight: 36,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});

export default PageHeader;
