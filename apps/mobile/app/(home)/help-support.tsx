import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Platform,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import PageHeader from '../../components/PageHeader';
import {
  Search,
  HelpCircle,
  FileText,
  Ticket,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react-native';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing } from '../../theme';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_DATA: FAQItem[] = [
  {
    question: 'How do I cancel my booking?',
    answer: "Go to your Bookings tab, select the active booking you wish to cancel, and click 'Cancel Booking'. Refunds are processed automatically based on the cancellation policy.",
  },
  {
    question: 'How to request a refund?',
    answer: 'Refunds for eligible cancellations are credited directly to your source payment method within 5-7 business days. You can track refund status in the Wallet section.',
  },
  {
    question: 'How to add a new parking space?',
    answer: "Navigate to 'My Spaces' and click 'Add Space'. Follow the step-by-step wizard to upload photos, set pricing, define availability, and submit for verification.",
  },
  {
    question: 'What are the payout cycles for hosts?',
    answer: 'Payouts are aggregated weekly and deposited directly into your linked bank account every Monday. You can update bank details in host settings.',
  },
];

export default function HelpSupportScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const filteredFaqs = FAQ_DATA.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <PageHeader title="Help & Support" />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.searchContainer}>
          <Search size={20} color={Colors.textMuted} style={styles.searchIcon} />
          <TextInput
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              setExpandedIndex(null);
            }}
            placeholder="Search for help..."
            placeholderTextColor={Colors.textMuted}
            style={styles.searchInput}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
              <X size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
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
            onPress={() => router.push('/(home)/support/create-ticket')}
          >
            <View style={[styles.iconContainer, { backgroundColor: Colors.errorBg }]}>
              <Ticket size={24} color={Colors.errorAlt} />
            </View>
            <Text style={styles.gridTitle}>Contact Support</Text>
            <Text style={styles.gridDesc}>Raise a support ticket</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.myTicketsRow}
          onPress={() => router.push('/(home)/support/tickets')}
          activeOpacity={0.7}
        >
          <View style={styles.myTicketsLeft}>
            <FileText size={18} color={Colors.textSecondary} />
            <Text style={styles.myTicketsText}>My Support Tickets</Text>
          </View>
          <ChevronDown size={18} color={Colors.textMuted} style={{ transform: [{ rotate: '-90deg' }] }} />
        </TouchableOpacity>

        <View style={styles.faqSection}>
          <Text style={styles.faqSectionTitle}>Popular Topics</Text>
          {filteredFaqs.length > 0 ? (
            filteredFaqs.map((faq, index) => {
              const isExpanded = expandedIndex === index;
              return (
                <View key={index} style={styles.faqCard}>
                  <TouchableOpacity
                    style={styles.faqHeader}
                    onPress={() => handleToggleExpand(index)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.faqQuestion}>{faq.question}</Text>
                    {isExpanded ? (
                      <ChevronUp size={20} color={Colors.textSecondary} />
                    ) : (
                      <ChevronDown size={20} color={Colors.textSecondary} />
                    )}
                  </TouchableOpacity>
                  {isExpanded && (
                    <View style={styles.faqAnswerContainer}>
                      <Text style={styles.faqAnswer}>{faq.answer}</Text>
                    </View>
                  )}
                </View>
              );
            })
          ) : (
            <View style={styles.emptySearchContainer}>
              <Text style={styles.emptySearchText}>No matching questions found.</Text>
            </View>
          )}
        </View>

        <View style={styles.contactCard}>
          <Text style={styles.contactTitle}>Still need help?</Text>
          <Text style={styles.contactDesc}>
            Our support team is always ready to assist you with any issues.
          </Text>
          <TouchableOpacity
            style={styles.contactButton}
            onPress={() => router.push('/(home)/support/create-ticket')}
            activeOpacity={0.8}
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
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
    marginBottom: Spacing['4xl'],
    borderWidth: 1.5,
    borderColor: Colors.border,
    height: 48,
  },
  searchIcon: {
    marginRight: Spacing.xs,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    fontWeight: FontWeight.medium,
    padding: 0,
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
    borderRadius: BorderRadius.lg,
    padding: Spacing['3xl'],
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
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
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  gridTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  gridDesc: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  myTicketsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.button,
    paddingVertical: Spacing['3xl'],
    paddingHorizontal: Spacing.screenH,
    marginBottom: Spacing['4xl'],
    borderWidth: 1,
    borderColor: Colors.border,
  },
  myTicketsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xl,
  },
  myTicketsText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  faqSection: {
    marginBottom: Spacing['6xl'],
  },
  faqSectionTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing['3xl'],
  },
  faqCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: Spacing.xl,
    overflow: 'hidden',
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing['3xl'],
    gap: Spacing.lg,
  },
  faqQuestion: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    flex: 1,
  },
  faqAnswerContainer: {
    paddingHorizontal: Spacing['3xl'],
    paddingBottom: Spacing['3xl'],
    borderTopWidth: 1,
    borderTopColor: Colors.borderLighter,
  },
  faqAnswer: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginTop: Spacing.md,
  },
  emptySearchContainer: {
    alignItems: 'center',
    paddingVertical: Spacing['4xl'],
  },
  emptySearchText: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
  },
  contactCard: {
    backgroundColor: Colors.surfaceBg,
    borderRadius: BorderRadius.lg,
    padding: Spacing['4xl'],
    alignItems: 'center',
    marginBottom: Spacing['7xl'],
  },
  contactTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  contactDesc: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing['4xl'],
    lineHeight: 20,
  },
  contactButton: {
    backgroundColor: Colors.primaryBg,
    paddingHorizontal: Spacing['4xl'],
    paddingVertical: Spacing.xl,
    borderRadius: BorderRadius.button,
    width: '100%',
    alignItems: 'center',
  },
  contactButtonText: {
    color: Colors.primary,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
});
