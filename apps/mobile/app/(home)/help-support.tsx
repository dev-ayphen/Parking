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
  MessageSquare,
} from 'lucide-react-native';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing } from '../../theme';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_DATA: FAQItem[] = [
  {
    question: 'How do I book a parking space?',
    answer: "Open the 'Find Parking' tab, search for available spaces, select your vehicle and dates, and confirm your booking. You'll receive a confirmation with space details and entry instructions.",
  },
  {
    question: 'How do I cancel my booking?',
    answer: "Go to 'My Bookings', select the booking you wish to cancel, and tap 'Cancel Booking'. Cancellations made before the booking start time are eligible for refunds based on the cancellation policy.",
  },
  {
    question: 'What if I have an issue during my parking session?',
    answer: "If you experience any issues like vehicle damage or unsafe conditions, you can report an incident immediately from your active session. Go to the session card and tap 'Report Incident' to document the issue with photos and details.",
  },
  {
    question: 'How do I rate and review a space?',
    answer: "After your parking session ends, you'll see the rating screen. Rate the space (1-5 stars) and share your experience. Your reviews help other parkers find quality spaces and help owners improve their listings.",
  },
  {
    question: 'How do I add and manage my vehicles?',
    answer: "Go to 'Find Parking' tab and tap the 'Vehicle' section. You can add, edit, and delete your vehicles here. Make sure to add your primary vehicle before booking so it appears during the booking process.",
  },
  {
    question: 'How do I contact support if I need help?',
    answer: "Visit 'Help & Support' from the menu. You can browse FAQs, read detailed articles, or open a support ticket to reach our team. We typically respond within a few hours.",
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
      <PageHeader title="Help & Support"  onBack={() => router.replace('/(home)')} />

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
          <View style={styles.contactGradient}>
            <View style={styles.contactIcon}>
              <HelpCircle size={32} color={Colors.white} strokeWidth={1.5} />
            </View>
            <View style={styles.contactContent}>
              <Text style={styles.contactTitle}>Can't find the answer?</Text>
              <Text style={styles.contactDesc}>
                Our dedicated support team is available 24/7 to help resolve your issue.
              </Text>
              <TouchableOpacity
                style={styles.contactButton}
                onPress={() => router.push('/(home)/support/create-ticket')}
                activeOpacity={0.85}
              >
                <Ticket size={16} color={Colors.white} style={{ marginRight: Spacing.sm }} />
                <Text style={styles.contactButtonText}>Open Support Ticket</Text>
              </TouchableOpacity>
            </View>
          </View>
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
    marginBottom: Spacing['7xl'],
    paddingHorizontal: Spacing.xs,
  },
  contactGradient: {
    backgroundColor: Colors.primaryBg,
    borderRadius: BorderRadius.xl,
    padding: Spacing['4xl'],
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing['3xl'],
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  contactIcon: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: Spacing.xs,
  },
  contactContent: {
    flex: 1,
  },
  contactTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  contactDesc: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing['3xl'],
    lineHeight: 20,
  },
  contactButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing['3xl'],
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.button,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  contactButtonText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
});
