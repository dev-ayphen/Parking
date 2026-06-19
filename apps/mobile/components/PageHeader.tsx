import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing } from '../theme';

interface PageHeaderProps {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
  backgroundColor?: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  onBack,
  right,
  backgroundColor = Colors.white,
}) => {
  const router = useRouter();
  return (
    <View style={[styles.header, { backgroundColor }]}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={onBack ?? (() => router.back())}
        activeOpacity={0.7}
      >
        <ChevronLeft size={20} color={Colors.textDark} strokeWidth={2.5} />
      </TouchableOpacity>
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      <View style={styles.right}>
        {right ?? null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenH,
    paddingVertical: Spacing.md,
    borderBottomWidth: 0,
  },
  backButton: {
    width: 44,
    height: 44,
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
  title: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  right: {
    minWidth: 38,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});

export default PageHeader;
