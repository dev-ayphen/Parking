import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
  LayoutAnimation} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronDown, ChevronUp, Car, Home, CreditCard, User, HelpCircle } from 'lucide-react-native';
import { api } from '../../../services/api';
import PageHeader from '../../../components/PageHeader';
import { useTheme } from '../../../hooks/useTheme';
import { FontSize, FontWeight, BorderRadius, Spacing } from '../../../theme';
import type { ColorsType } from '../../../theme';

interface FAQItem {
  q: string;
  a: string;
}

interface FAQCategory {
  title: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  items: FAQItem[];
}

// Per-category presentation (icon/colour) — UI metadata the API doesn't carry.
// Keyed by the server's category `title`; falls back to a neutral default.
// Built from theme `colors` so icons/tints respond to dark/light mode.
const buildCategoryStyle = (colors: ColorsType): Record<string, { icon: React.ReactNode; color: string; bg: string }> => ({
  Booking: { icon: <Car size={20} color={colors.info} />, color: colors.info, bg: colors.infoBg },
  'Space Owner': { icon: <Home size={20} color={colors.successAlt} />, color: colors.successAlt, bg: colors.successBg },
  Subscription: { icon: <CreditCard size={20} color={colors.warningAlt} />, color: colors.warningAlt, bg: colors.warningBg },
  Account: { icon: <User size={20} color={colors.errorAlt} />, color: colors.errorAlt, bg: colors.errorBg },
});
const buildStyleFor = (colors: ColorsType) => {
  const map = buildCategoryStyle(colors);
  return (title: string) =>
    map[title] ?? { icon: <HelpCircle size={20} color={colors.textSecondary} />, color: colors.textSecondary, bg: colors.surfaceBg };
};

export default function FAQScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const styleFor = useMemo(() => buildStyleFor(colors), [colors]);
  const [categories, setCategories] = useState<FAQCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategory, setExpandedCategory] = useState<number | null>(0);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const fetchFaq = useCallback(async () => {
    try {
      const res = await api.get('/help/faq');
      const raw: Array<{ title: string; items: FAQItem[] }> = res?.faq ?? [];
      // Attach UI metadata (icon/colour) by category title.
      const mapped: FAQCategory[] = raw.map((c) => ({
        title: c.title,
        items: c.items ?? [],
        ...styleFor(c.title),
      }));
      setCategories(mapped);
    } catch {
      // Leave empty → empty state shown; FAQ is non-critical.
    } finally {
      setLoading(false);
    }
  }, [styleFor]);

  useEffect(() => {
    fetchFaq();
  }, [fetchFaq]);

  const toggleCategory = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedCategory(expandedCategory === index ? null : index);
    setExpandedItem(null);
  };

  const toggleItem = (key: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedItem(expandedItem === key ? null : key);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <PageHeader title="FAQ" onBack={() => router.replace('/(home)/help-support')} />

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : categories.length === 0 ? (
        <View style={styles.center}>
          <HelpCircle size={40} color={colors.textMuted} strokeWidth={1.5} />
          <Text style={styles.emptyText}>FAQs are unavailable right now. Please try again later.</Text>
        </View>
      ) : (
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>Find quick answers grouped by topic</Text>

        {categories.map((cat, catIdx) => {
          const isCatOpen = expandedCategory === catIdx;
          return (
            <View key={cat.title} style={styles.categoryCard}>
              <TouchableOpacity
                style={styles.categoryHeader}
                onPress={() => toggleCategory(catIdx)}
                activeOpacity={0.7}
              >
                <View style={styles.categoryLeft}>
                  <View style={[styles.categoryIcon, { backgroundColor: cat.bg }]}>
                    {cat.icon}
                  </View>
                  <Text style={styles.categoryTitle}>{cat.title}</Text>
                  <View style={styles.countBadge}>
                    <Text style={styles.countText}>{cat.items.length}</Text>
                  </View>
                </View>
                {isCatOpen ? (
                  <ChevronUp size={20} color={colors.textMuted} />
                ) : (
                  <ChevronDown size={20} color={colors.textMuted} />
                )}
              </TouchableOpacity>

              {isCatOpen && (
                <View style={styles.categoryBody}>
                  {cat.items.map((item, itemIdx) => {
                    const key = `${catIdx}-${itemIdx}`;
                    const isOpen = expandedItem === key;
                    return (
                      <View key={key}>
                        <TouchableOpacity
                          style={[styles.faqQuestion, itemIdx === 0 && { borderTopWidth: 0 }]}
                          onPress={() => toggleItem(key)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.faqQuestionText, isOpen && { color: cat.color }]}>
                            {item.q}
                          </Text>
                          {isOpen ? (
                            <ChevronUp size={18} color={cat.color} />
                          ) : (
                            <ChevronDown size={18} color={colors.borderMuted} />
                          )}
                        </TouchableOpacity>
                        {isOpen && (
                          <View style={[styles.faqAnswer, { borderLeftColor: cat.color }]}>
                            <Text style={styles.faqAnswerText}>{item.a}</Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}

        <View style={styles.bottomPad} />
      </ScrollView>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors: ColorsType) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    padding: Spacing.screenH,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg, padding: Spacing['4xl'] },
  emptyText: { fontSize: FontSize.base, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  subtitle: {
    fontSize: FontSize.lg,                          // 15 = lg ✓
    color: colors.textSecondary,
    marginBottom: Spacing['4xl'],
  },
  categoryCard: {
    backgroundColor: colors.white,
    borderRadius: BorderRadius.lg,                  // 16 = lg ✓
    marginBottom: Spacing['3xl'],
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8 },
      android: { elevation: 1 },
    }),
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing['3xl'],
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xl,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.input,               // 10 = input ✓
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryTitle: {
    fontSize: FontSize.xl,                          // 16 = xl ✓
    fontWeight: FontWeight.semibold,
    color: colors.textPrimary,
  },
  countBadge: {
    backgroundColor: colors.surfaceBg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.micro,
    borderRadius: BorderRadius.input,               // 10 = input ✓
  },
  countText: {
    fontSize: FontSize.sm,                          // 12 = sm ✓
    fontWeight: FontWeight.semibold,
    color: colors.textSecondary,
  },
  categoryBody: {
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBg,
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing['3xl'],
    paddingVertical: Spacing['2xl'],
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBg,
  },
  faqQuestionText: {
    fontSize: FontSize.md,                          // 14 = md ✓
    fontWeight: FontWeight.medium,
    color: colors.textDark,
    flex: 1,
    marginRight: Spacing.xl,
    lineHeight: 20,
  },
  faqAnswer: {
    paddingHorizontal: Spacing['3xl'],
    paddingBottom: Spacing['3xl'],
    paddingTop: Spacing.xs,
    marginLeft: Spacing['3xl'],
    borderLeftWidth: 3,
    borderLeftColor: colors.info,
  },
  faqAnswerText: {
    fontSize: FontSize.md,                          // 14 = md ✓
    color: colors.textSecondary,
    lineHeight: 22,
  },
  bottomPad: {
    height: 40,
  },
});
