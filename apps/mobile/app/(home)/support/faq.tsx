import React, { useState } from 'react';
import {View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Platform,
  LayoutAnimation} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronDown, ChevronUp, Car, Home, CreditCard, User } from 'lucide-react-native';
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

const FAQ_DATA: FAQCategory[] = [
  {
    title: 'Booking',
    icon: <Car size={20} color={Colors.info} />,
    color: Colors.info,
    bg: Colors.infoBg,
    items: [
      {
        q: 'How do I book a parking space?',
        a: 'Open the ParkSwift app, search for a location, browse available spaces, select your preferred one, choose your time slot, and confirm the booking. Payment will be processed via your saved method.',
      },
      {
        q: 'Can I cancel a booking?',
        a: 'Yes, you can cancel a booking from the "My Bookings" section. Cancellation policies vary by space owner. Please note that booking fees are non-refundable — only subscription-related payments are eligible for refunds.',
      },
      {
        q: 'What happens if I overstay my booked time?',
        a: 'If you exceed your booked duration, additional charges may apply based on the space owner\'s late fee policy. You\'ll receive a notification before your session ends to extend if needed.',
      },
      {
        q: 'How do I extend my parking session?',
        a: 'You can extend your active session from the "Active Booking" screen. Tap "Extend Time" and choose the additional duration. The extra amount will be charged immediately.',
      },
    ],
  },
  {
    title: 'Space Owner',
    icon: <Home size={20} color={Colors.successAlt} />,
    color: Colors.successAlt,
    bg: Colors.successBg,
    items: [
      {
        q: 'How do I list my parking space?',
        a: 'Go to "My Spaces" from the sidebar, tap "Add New Space", fill in details like location, type, pricing, and availability, then submit for verification. Your space will be live once approved.',
      },
      {
        q: 'How long does verification take?',
        a: 'Space verification typically takes 24-48 hours. You\'ll receive a notification once your space is approved or if additional documents are needed.',
      },
      {
        q: 'How do I manage bookings for my space?',
        a: 'All incoming bookings appear in the "My Spaces" dashboard under the Active tab. You can accept, reject, or manage sessions with OTP verification for check-in.',
      },
      {
        q: 'How do I set pricing for my space?',
        a: 'When creating or editing a listing, you can set hourly, daily, and monthly rates. Pricing must fall within the platform\'s minimum and maximum rate boundaries.',
      },
    ],
  },
  {
    title: 'Subscription',
    icon: <CreditCard size={20} color={Colors.warningAlt} />,
    color: Colors.warningAlt,
    bg: Colors.warningBg,
    items: [
      {
        q: 'What subscription plans are available?',
        a: 'ParkSwift offers multiple plans for space owners — Basic (Free), Pro, and Premium. Each tier unlocks additional features like priority listing, analytics, and higher booking limits. Check the "Payments" section for current pricing.',
      },
      {
        q: 'Can I get a refund on my subscription?',
        a: 'Yes, subscription payments are eligible for refunds within 7 days of purchase if you haven\'t used any premium features. Contact support with your invoice details to initiate a refund.',
      },
      {
        q: 'How do I upgrade or downgrade my plan?',
        a: 'Go to Payments from the sidebar. Under "Choose Your Plan", select the tier you want. Upgrades take effect immediately, while downgrades apply at the end of your current billing cycle.',
      },
      {
        q: 'What payment methods are supported?',
        a: 'We support UPI, Credit/Debit Cards, Net Banking, and wallets via Razorpay. All transactions are secured with industry-standard encryption.',
      },
    ],
  },
  {
    title: 'Account',
    icon: <User size={20} color={Colors.errorAlt} />,
    color: Colors.errorAlt,
    bg: Colors.errorBg,
    items: [
      {
        q: 'How do I reset my password?',
        a: 'ParkSwift uses OTP-based login. Simply enter your registered mobile number, request a new OTP, and you\'ll be logged in securely without needing a password.',
      },
      {
        q: 'How do I update my profile information?',
        a: 'Go to your Profile from the sidebar and tap the edit icon on any field (name, email, phone). Changes are saved instantly after editing.',
      },
      {
        q: 'Can I delete my account?',
        a: 'Yes, you can request account deletion from Settings > Account > Delete Account. All your data will be permanently removed within 30 days. Active subscriptions must be cancelled first.',
      },
      {
        q: 'How do I manage my vehicles?',
        a: 'Go to "My Vehicles" from the sidebar. You can add, edit, or remove vehicles. Each vehicle requires the registration number, type, and optionally a photo.',
      },
    ],
  },
];

export default function FAQScreen() {
  const router = useRouter();
  const [expandedCategory, setExpandedCategory] = useState<number | null>(0);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

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
      <PageHeader title="FAQ" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>Find quick answers grouped by topic</Text>

        {FAQ_DATA.map((cat, catIdx) => {
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
