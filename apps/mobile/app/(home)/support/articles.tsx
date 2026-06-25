import React, { useState, useEffect, useCallback } from 'react';
import {View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Platform,
  TextInput,
  ActivityIndicator,
  Modal} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Search, ChevronRight, BookOpen, Car, Home, CreditCard, User, Clock, X } from 'lucide-react-native';
import { api } from '../../../services/api';
import PageHeader from '../../../components/PageHeader';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing } from '../../../theme';

interface Article {
  id: string;
  title: string;
  snippet: string;
  readTime: string;
  content: string;
}

interface ArticleCategory {
  title: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  articles: Article[];
}

// Per-category presentation (icon/colour) keyed by the server's category title.
const CATEGORY_STYLE: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  Booking: { icon: <Car size={20} color={Colors.info} />, color: Colors.info, bg: Colors.infoBg },
  'Space Owner': { icon: <Home size={20} color={Colors.successAlt} />, color: Colors.successAlt, bg: Colors.successBg },
  'Subscription & Payments': { icon: <CreditCard size={20} color={Colors.warningAlt} />, color: Colors.warningAlt, bg: Colors.warningBg },
  'Account & Security': { icon: <User size={20} color={Colors.errorAlt} />, color: Colors.errorAlt, bg: Colors.errorBg },
};
const styleFor = (title: string) =>
  CATEGORY_STYLE[title] ?? { icon: <BookOpen size={20} color={Colors.textSecondary} />, color: Colors.textSecondary, bg: Colors.surfaceBg };

export default function ArticlesScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState<ArticleCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>('Booking');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  const fetchArticles = useCallback(async () => {
    try {
      const res = await api.get('/help/articles');
      const raw: Array<{ title: string; articles: Article[] }> = res?.articles ?? [];
      const mapped: ArticleCategory[] = raw.map((c) => ({
        title: c.title,
        articles: c.articles ?? [],
        ...styleFor(c.title),
      }));
      setCategories(mapped);
    } catch {
      // leave empty → empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const filteredData = search.trim()
    ? categories.map(cat => ({
        ...cat,
        articles: cat.articles.filter(
          a => a.title.toLowerCase().includes(search.toLowerCase()) || a.snippet.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter(cat => cat.articles.length > 0)
    : categories;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <PageHeader title="Articles" onBack={() => router.replace('/(home)/help-support')} />

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

        {loading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : filteredData.length === 0 ? (
          <View style={styles.emptyState}>
            <BookOpen size={40} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>{search.trim() ? 'No articles found' : 'Articles unavailable'}</Text>
            <Text style={styles.emptyDesc}>{search.trim() ? 'Try a different search term' : 'Please try again later'}</Text>
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
                      <TouchableOpacity
                        key={article.id}
                        style={styles.articleCard}
                        activeOpacity={0.7}
                        onPress={() => setSelectedArticle(article)}
                      >
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

      {/* Article detail modal */}
      <Modal
        visible={selectedArticle !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedArticle(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={2}>{selectedArticle?.title}</Text>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setSelectedArticle(null)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalMeta}>
              <Clock size={13} color={Colors.textMuted} />
              <Text style={styles.modalReadTime}>{selectedArticle?.readTime} read</Text>
            </View>
            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={{ paddingBottom: 32 }}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.modalContent}>{selectedArticle?.content}</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing['3xl'],
    paddingTop: Spacing.lg,
    maxHeight: '85%',
  },
  modalHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    marginBottom: Spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.xl,
  },
  modalTitle: {
    flex: 1,
    fontSize: FontSize['2xl'],                       // 18 = 2xl ✓
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.screenBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
  },
  modalReadTime: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    fontWeight: FontWeight.medium,
  },
  modalBody: {
    flexGrow: 0,
  },
  modalContent: {
    fontSize: FontSize.lg,                           // 15 = lg ✓
    lineHeight: 24,
    color: Colors.textSecondary,
  },
});
