import React, { useState, useEffect, useCallback } from 'react';
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
import { Colors, FontSize, FontWeight, BorderRadius, Spacing } from '../../../theme';

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
const CATEGORY_STYLE: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  Booking: { icon: <Car size={20} color={Colors.info} />, color: Colors.info, bg: Colors.infoBg },
  'Space Owner': { icon: <Home size={20} color={Colors.successAlt} />, color: Colors.successAlt, bg: Colors.successBg },
  Subscription: { icon: <CreditCard size={20} color={Colors.warningAlt} />, color: Colors.warningAlt, bg: Colors.warningBg },
  Account: { icon: <User size={20} color={Colors.errorAlt} />, color: Colors.errorAlt, bg: Colors.errorBg },
};
const styleFor = (title: string) =>
  CATEGORY_STYLE[title] ?? { icon: <HelpCircle size={20} color={Colors.textSecondary} />, color: Colors.textSecondary, bg: Colors.surfaceBg };

export default function FAQScreen() {
  const router = useRouter();
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
  }, []);

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
      <StatusBar barStyle="dark-content" />
      <PageHeader title="FAQ" onBack={() => router.replace('/(home)/help-support')} />

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      ) : categories.length === 0 ? (
        <View style={styles.center}>
          <HelpCircle size={40} color={Colors.textMuted} strokeWidth={1.5} />
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
                  <ChevronUp size={20} color={Colors.textMuted} />
                ) : (
                  <ChevronDown size={20} color={Colors.textMuted} />
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
                            <ChevronDown size={18} color={Colors.borderMuted} />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  content: {
    padding: Spacing.screenH,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg, padding: Spacing['4xl'] },
  emptyText: { fontSize: FontSize.base, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  subtitle: {
    fontSize: FontSize.lg,                          // 15 = lg ✓
    color: Colors.textSecondary,
    marginBottom: Spacing['4xl'],
  },
  categoryCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,                  // 16 = lg ✓
    marginBottom: Spacing['3xl'],
    borderWidth: 1,
    borderColor: Colors.border,
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
    color: Colors.textPrimary,
  },
  countBadge: {
    backgroundColor: Colors.surfaceBg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.micro,
    borderRadius: BorderRadius.input,               // 10 = input ✓
  },
  countText: {
    fontSize: FontSize.sm,                          // 12 = sm ✓
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  categoryBody: {
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBg,
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing['3xl'],
    paddingVertical: Spacing['2xl'],
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBg,
  },
  faqQuestionText: {
    fontSize: FontSize.md,                          // 14 = md ✓
    fontWeight: FontWeight.medium,
    color: Colors.textDark,
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
    borderLeftColor: Colors.info,
  },
  faqAnswerText: {
    fontSize: FontSize.md,                          // 14 = md ✓
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  bottomPad: {
    height: 40,
  },
});
