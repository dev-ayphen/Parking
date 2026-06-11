import React from 'react';
import {View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Platform} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import PageHeader from '../../components/PageHeader';
import { Search, HelpCircle, FileText, MessageCircle } from 'lucide-react-native';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, ExtendedColors } from '../../theme';

export default function HelpSupportScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <PageHeader title="Help & Support" />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.searchContainer}>
          <Search size={20} color={Colors.textMuted} />
          <Text style={styles.searchPlaceholder}>Search for help...</Text>
        </View>

        <View style={styles.gridContainer}>
          <TouchableOpacity
            style={styles.gridItem}
            onPress={() => router.push('/(home)/support/faq')}
          >
            <View style={[styles.iconContainer, { backgroundColor: Colors.infoBg }]}>
              <HelpCircle size={24} color={Colors.info} />
            </View>
            <Text style={styles.gridTitle}>View FAQ</Text>
            <Text style={styles.gridDesc}>Common questions</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.gridItem}
            onPress={() => router.push('/(home)/support/articles')}
          >
            <View style={[styles.iconContainer, { backgroundColor: Colors.successBg }]}>
              <FileText size={24} color={Colors.successAlt} />
            </View>
            <Text style={styles.gridTitle}>Articles</Text>
            <Text style={styles.gridDesc}>Detailed guides</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.gridItem, styles.gridItemFull]}
            onPress={() => router.push('/(home)/support/chat')}
          >
            <View style={[styles.iconContainer, { backgroundColor: Colors.errorBg }]}>
              <MessageCircle size={24} color={Colors.errorAlt} />
            </View>
            <Text style={styles.gridTitle}>Live Chat</Text>
            <Text style={styles.gridDesc}>Talk to an agent</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.contactCard}>
          <Text style={styles.contactTitle}>Still need help?</Text>
          <Text style={styles.contactDesc}>
            Our support team is always ready to assist you with any issues.
          </Text>
          <TouchableOpacity
            style={styles.contactButton}
            onPress={() => router.push('/(home)/support/create-ticket')}
          >
            <Text style={styles.contactButtonText}>Contact Support</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  scrollView: { backgroundColor: Colors.screenBg },
  content: {
    padding: Spacing.screenH,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing['3xl'],
    paddingVertical: Spacing['2xl'],
    borderRadius: BorderRadius.md,                  // 12 = md ✓
    gap: Spacing.xl,
    marginBottom: Spacing['4xl'],
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchPlaceholder: {
    color: Colors.textMuted,
    fontSize: FontSize.xl,                          // 16 = xl ✓
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing['3xl'],
    marginBottom: Spacing['6xl'],
  },
  gridItem: {
    width: '47%',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,                  // 16 = lg ✓
    padding: Spacing['3xl'],
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  gridItemFull: {
    width: '100%',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,                  // 12 = md ✓
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  gridTitle: {
    fontSize: FontSize.xl,                          // 16 = xl ✓
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  gridDesc: {
    fontSize: FontSize.sm,                          // 12 = sm ✓
    color: Colors.textSecondary,
  },
  contactCard: {
    backgroundColor: ExtendedColors.darkCard,       // '#1E293B' ✓
    borderRadius: BorderRadius.lg,                  // 16 = lg ✓
    padding: Spacing['4xl'],
    alignItems: 'center',
    marginBottom: Spacing.screenH,
  },
  contactTitle: {
    fontSize: FontSize['2xl'],                      // 18 = 2xl ✓
    fontWeight: FontWeight.bold,
    color: Colors.white,
    marginBottom: Spacing.md,
  },
  contactDesc: {
    fontSize: FontSize.md,                          // 14 = md ✓
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.screenH,
    lineHeight: 20,
  },
  contactButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing['4xl'],
    paddingVertical: Spacing.xl,
    borderRadius: BorderRadius.sm,                  // 8 = sm ✓
    width: '100%',
    alignItems: 'center',
  },
  contactButtonText: {
    color: Colors.white,
    fontSize: FontSize.xl,                          // 16 = xl ✓
    fontWeight: FontWeight.semibold,
  },
});
