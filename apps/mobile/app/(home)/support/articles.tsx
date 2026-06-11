import React, { useState } from 'react';
import {View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Platform,
  TextInput} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Search, ChevronRight, BookOpen, Car, Home, CreditCard, User, Clock } from 'lucide-react-native';
import PageHeader from '../../../components/PageHeader';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing } from '../../../theme';

interface Article {
  id: string;
  title: string;
  snippet: string;
  readTime: string;
}

interface ArticleCategory {
  title: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  articles: Article[];
}

const ARTICLES_DATA: ArticleCategory[] = [
  {
    title: 'Booking',
    icon: <Car size={20} color={Colors.info} />,
    color: Colors.info,
    bg: Colors.infoBg,
    articles: [
      { id: 'b1', title: 'How to Book a Parking Space', snippet: 'Step-by-step guide to finding and booking a perfect parking spot near you.', readTime: '3 min' },
      { id: 'b2', title: 'Understanding Cancellation Policies', snippet: 'Learn about our cancellation and refund policies for bookings.', readTime: '4 min' },
      { id: 'b3', title: 'Extending Your Parking Session', snippet: 'How to extend your session and what charges apply for overtime.', readTime: '2 min' },
    ],
  },
  {
    title: 'Space Owner',
    icon: <Home size={20} color={Colors.successAlt} />,
    color: Colors.successAlt,
    bg: Colors.successBg,
    articles: [
      { id: 's1', title: 'Getting Started as a Space Owner', snippet: 'Complete guide to listing your first parking space on ParkSwift.', readTime: '5 min' },
      { id: 's2', title: 'Verification Process Explained', snippet: 'What documents are needed and how long the verification takes.', readTime: '3 min' },
      { id: 's3', title: 'Managing Your Earnings', snippet: 'Track your revenue, understand payouts, and optimize pricing.', readTime: '4 min' },
      { id: 's4', title: 'OTP Verification for Check-ins', snippet: 'How the OTP-based verification system works for secure check-ins.', readTime: '2 min' },
    ],
  },
  {
    title: 'Subscription & Payments',
    icon: <CreditCard size={20} color={Colors.warningAlt} />,
    color: Colors.warningAlt,
    bg: Colors.warningBg,
    articles: [
      { id: 'p1', title: 'Subscription Plans Overview', snippet: 'Compare Basic, Pro, and Premium plans and their features.', readTime: '4 min' },
      { id: 'p2', title: 'Payment Methods & Security', snippet: 'All supported payment options and how we keep your data safe.', readTime: '3 min' },
      { id: 'p3', title: 'Subscription Refund Policy', snippet: 'When and how you can get a refund on your subscription payment.', readTime: '3 min' },
    ],
  },
  {
    title: 'Account & Security',
    icon: <User size={20} color={Colors.errorAlt} />,
    color: Colors.errorAlt,
    bg: Colors.errorBg,
    articles: [
      { id: 'a1', title: 'Updating Your Profile', snippet: 'How to change your name, email, phone number, and profile picture.', readTime: '2 min' },
      { id: 'a2', title: 'Managing Your Vehicles', snippet: 'Add, edit, or remove vehicles from your ParkSwift account.', readTime: '2 min' },
      { id: 'a3', title: 'Account Deletion Guide', snippet: 'Steps to permanently delete your account and what happens to your data.', readTime: '3 min' },
    ],
  },
];

export default function ArticlesScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>('Booking');

  const filteredData = search.trim()
    ? ARTICLES_DATA.map(cat => ({
        ...cat,
        articles: cat.articles.filter(
          a => a.title.toLowerCase().includes(search.toLowerCase()) || a.snippet.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter(cat => cat.articles.length > 0)
    : ARTICLES_DATA;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <PageHeader title="Articles" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.searchContainer}>
          <Search size={20} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search articles..."
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {filteredData.length === 0 ? (
          <View style={styles.emptyState}>
            <BookOpen size={40} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No articles found</Text>
            <Text style={styles.emptyDesc}>Try a different search term</Text>
          </View>
        ) : (
          filteredData.map((cat) => {
            const isOpen = expandedCategory === cat.title || search.trim().length > 0;
            return (
              <View key={cat.title} style={styles.categorySection}>
                <TouchableOpacity
                  style={styles.categoryHeader}
                  onPress={() => setExpandedCategory(isOpen ? null : cat.title)}
                  activeOpacity={0.7}
                >
                  <View style={styles.categoryLeft}>
                    <View style={[styles.categoryIconBox, { backgroundColor: cat.bg }]}>
                      {cat.icon}
                    </View>
                    <Text style={styles.categoryTitle}>{cat.title}</Text>
                  </View>
                  <Text style={styles.articleCount}>{cat.articles.length} articles</Text>
                </TouchableOpacity>

                {isOpen && (
                  <View style={styles.articlesList}>
                    {cat.articles.map((article) => (
                      <TouchableOpacity key={article.id} style={styles.articleCard} activeOpacity={0.7}>
                        <View style={styles.articleContent}>
                          <Text style={styles.articleTitle}>{article.title}</Text>
                          <Text style={styles.articleSnippet} numberOfLines={2}>{article.snippet}</Text>
                          <View style={styles.articleMeta}>
                            <Clock size={12} color={Colors.textMuted} />
                            <Text style={styles.readTime}>{article.readTime} read</Text>
                          </View>
                        </View>
                        <ChevronRight size={18} color={Colors.borderMuted} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            );
          })
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.screenBg,
  },
  content: {
    padding: Spacing.screenH,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing['3xl'],
    paddingVertical: Spacing.xl,
    borderRadius: BorderRadius.md,                  // 12 = md ✓
    gap: Spacing.xl,
    marginBottom: Spacing['4xl'],
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.xl,                          // 16 = xl ✓
    color: Colors.textPrimary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: FontSize['2xl'],                      // 18 = 2xl ✓
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginTop: Spacing['3xl'],
    marginBottom: Spacing.md,
  },
  emptyDesc: {
    fontSize: FontSize.md,                          // 14 = md ✓
    color: Colors.textSecondary,
  },
  categorySection: {
    marginBottom: Spacing.screenH,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xl,
  },
  categoryIconBox: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.input,               // 10 = input ✓
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryTitle: {
    fontSize: FontSize.xl,                          // 16 = xl ✓
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  articleCount: {
    fontSize: FontSize.base,                        // 13 = base ✓
    color: Colors.textMuted,
    fontWeight: FontWeight.medium,
  },
  articlesList: {
    gap: Spacing.lg,
  },
  articleCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.button,              // 14 = button ✓
    padding: Spacing['3xl'],
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.02, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  articleContent: {
    flex: 1,
    marginRight: Spacing.xl,
  },
  articleTitle: {
    fontSize: FontSize.lg,                          // 15 = lg ✓
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  articleSnippet: {
    fontSize: FontSize.base,                        // 13 = base ✓
    color: Colors.textSecondary,
    lineHeight: 19,
    marginBottom: Spacing.md,
  },
  articleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  readTime: {
    fontSize: FontSize.sm,                          // 12 = sm ✓
    color: Colors.textMuted,
  },
});
