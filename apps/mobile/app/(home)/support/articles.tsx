import React, { useState } from 'react';
import {View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Platform,
  TextInput,
  Modal} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Search, ChevronRight, BookOpen, Car, Home, CreditCard, User, Clock, X } from 'lucide-react-native';
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

const ARTICLES_DATA: ArticleCategory[] = [
  {
    title: 'Booking',
    icon: <Car size={20} color={Colors.info} />,
    color: Colors.info,
    bg: Colors.infoBg,
    articles: [
      { id: 'b1', title: 'How to Book a Parking Space', snippet: 'Step-by-step guide to finding and booking a perfect parking spot near you.', readTime: '3 min',
        content: `Booking a parking space on ParkSwift takes less than a minute.

1. Set your location
Open Find Space and either search for an area or tap the map to drop a pin. Nearby verified spaces appear as price pins.

2. Pick a space
Tap a pin to see the price, available spots, rating, and photos. Tap "View Details" to read the full description, amenities, and risk level.

3. Choose your vehicle and time
Select which of your saved vehicles you're parking, then set your arrival time (ETA) and how long you'll stay.

4. Review the declarations
Confirm the parking declarations (you've verified the surroundings, local rules apply, etc.) and agree to the Terms.

5. Send the request
Tap "Request Booking". The owner is notified instantly. Once they approve, you'll get an OTP to share at check-in.

Tip: Set a vehicle as ACTIVE in My Vehicles so it's pre-selected at checkout.` },
      { id: 'b2', title: 'Understanding Cancellation Policies', snippet: 'Learn about our cancellation and refund policies for bookings.', readTime: '4 min',
        content: `We keep cancellations simple and fair.

Before approval
If you cancel a request the owner hasn't approved yet, there's no charge at all.

After approval, before check-in
You can cancel up to your scheduled arrival time. Since ParkSwift doesn't pre-charge for parking, no fee applies — the spot is simply released back to the owner.

No-shows
If you don't arrive and don't cancel, the owner may mark the booking as a no-show, which can affect your reliability rating.

Owner cancellations
If an owner cancels an approved booking, you're notified immediately and free to book another nearby space at no cost.

Refunds
ParkSwift currently coordinates parking without holding payment for the parking itself, so there's nothing to refund for a cancelled parking booking. Subscription refunds are handled separately (see Subscription Refund Policy).` },
      { id: 'b3', title: 'Extending Your Parking Session', snippet: 'How to extend your session and what charges apply for overtime.', readTime: '2 min',
        content: `Need more time? You can extend an active session.

How to extend
Open your active booking and tap "Extend Session". Choose how much extra time you need. If the space is still free for that period, the extension is confirmed instantly.

Overtime charges
Extra time is billed at the same hourly rate shown on the space. The new total updates on your booking summary.

If the space isn't available
If the owner has another booking right after yours, extension may be limited. In that case, please exit on time to avoid being marked as overstaying.

At exit
When you leave, the owner verifies your exit (often via OTP). Your final duration and total are then locked in.` },
    ],
  },
  {
    title: 'Space Owner',
    icon: <Home size={20} color={Colors.successAlt} />,
    color: Colors.successAlt,
    bg: Colors.successBg,
    articles: [
      { id: 's1', title: 'Getting Started as a Space Owner', snippet: 'Complete guide to listing your first parking space on ParkSwift.', readTime: '5 min',
        content: `Listing your space is a 5-step flow under My Spaces → Add Space.

Step 1 — Basic details
Name your space, choose its type (Independent House, Apartment Owner Slot, etc.), what vehicles it fits, and how many spots.

Step 2 — Location
Search or tap the map to pin the exact spot, then confirm the auto-filled address.

Step 3 — Pricing & timing
Set your hourly rate (and optional daily/monthly rates) and availability hours.

Step 4 — Photos & documents
Upload a front photo (required), an optional area photo/video, and the ownership proof for your space type.

Step 5 — Compliance
Confirm the ownership and legal declarations, then submit.

After submitting, an admin reviews your listing (usually 1–2 business days). Once approved, it goes live and parkers can book it.` },
      { id: 's2', title: 'Verification Process Explained', snippet: 'What documents are needed and how long the verification takes.', readTime: '3 min',
        content: `Every space is verified before it goes live to keep the platform trustworthy.

Documents by space type
Each space type needs specific proof — for example:
• Independent House: EB Bill / Property Tax / Water Bill
• Apartment Owner Slot: Maintenance Bill or Parking Allocation Photo
• Rented House: Rental Agreement + Owner Permission
The app shows the exact "Required Proof" for your selected type on Step 4.

How long it takes
Admin review usually completes within 1–2 business days. You'll get a notification when your space is approved or if more information is needed.

If rejected
You'll see the reason and can edit your space and re-submit. Common reasons are unclear photos or mismatched documents.

Your documents are stored securely and only used for verification.` },
      { id: 's3', title: 'Managing Your Earnings', snippet: 'Track your revenue, understand payouts, and optimize pricing.', readTime: '4 min',
        content: `Track everything from My Spaces → Analytics.

Revenue dashboard
See total earnings, bookings count, and trends over time for each space.

Pricing tips
• Check nearby spaces to stay competitive.
• Offer daily/monthly rates to attract longer stays.
• Spaces with clear photos and complete details get more bookings.

Payouts
Earnings from completed bookings accumulate to your account. Keep your payout details up to date in your profile.

Optimizing occupancy
Wider availability hours and accurate location pins improve how often your space is found and booked.` },
      { id: 's4', title: 'OTP Verification for Check-ins', snippet: 'How the OTP-based verification system works for secure check-ins.', readTime: '2 min',
        content: `OTP verification ensures only the right parker uses your space.

At check-in
When the approved parker arrives, they share a one-time code (OTP) generated for that booking. You enter it in the booking screen to confirm their arrival and start the session.

At exit
A similar verification confirms when they leave, locking in the final duration and total.

Why it matters
This prevents unauthorized parking and gives both sides a clear, tamper-proof record of arrival and exit times.

If the OTP doesn't work
Make sure you're verifying the correct booking and that the code hasn't expired. The parker can refresh their code from their active booking screen.` },
    ],
  },
  {
    title: 'Subscription & Payments',
    icon: <CreditCard size={20} color={Colors.warningAlt} />,
    color: Colors.warningAlt,
    bg: Colors.warningBg,
    articles: [
      { id: 'p1', title: 'Subscription Plans Overview', snippet: 'Compare Basic, Pro, and Premium plans and their features.', readTime: '4 min',
        content: `Subscriptions unlock owner tools for listing and managing spaces.

Basic
Great for getting started — list your space, accept bookings, and see core stats.

Pro
Adds advanced analytics, higher listing limits, and priority placement in search.

Premium
Everything in Pro plus the highest limits, priority support, and the best visibility for your spaces.

Billing
Plans are billed monthly or yearly (yearly saves more). You can compare the exact features and prices under Manage Subscription → View Plans.

Changing plans
You can upgrade or downgrade anytime. Upgrades take effect immediately; downgrades apply at the next billing cycle.` },
      { id: 'p2', title: 'Payment Methods & Security', snippet: 'All supported payment options and how we keep your data safe.', readTime: '3 min',
        content: `We support common Indian payment methods and keep your data protected.

Supported methods
UPI, credit/debit cards, and net banking through our secure payment gateway.

Security
Card and payment details are handled by the payment provider — ParkSwift never stores your full card number. All transactions run over encrypted connections.

Receipts
Every subscription payment generates a receipt you can view in your account history.

Trouble paying?
If a payment fails, no amount is deducted in most cases (any temporary hold is auto-reversed by your bank). Try another method or contact support if it persists.` },
      { id: 'p3', title: 'Subscription Refund Policy', snippet: 'When and how you can get a refund on your subscription payment.', readTime: '3 min',
        content: `Here's how subscription refunds work.

Cooling-off
If you cancel shortly after subscribing and haven't used paid features, you may be eligible for a full refund — contact support with your payment reference.

Mid-cycle cancellation
If you cancel partway through a billing cycle, your plan stays active until the cycle ends; it simply won't renew. Partial refunds for unused days are handled case by case.

Failed or duplicate charges
If you were charged twice or for a failed transaction, we refund the extra amount in full.

How to request
Go to Help & Support → Create Ticket, choose "Subscription & Payments", and include your payment reference. Refunds are processed back to the original payment method.` },
    ],
  },
  {
    title: 'Account & Security',
    icon: <User size={20} color={Colors.errorAlt} />,
    color: Colors.errorAlt,
    bg: Colors.errorBg,
    articles: [
      { id: 'a1', title: 'Updating Your Profile', snippet: 'How to change your name, email, phone number, and profile picture.', readTime: '2 min',
        content: `Keep your profile current from the Profile screen.

Edit details
Tap "Edit Profile" to update your first name, last name, email, and emergency contact. Tap Save to apply.

Profile picture
Tap your avatar to pick a new photo from your library. It uploads instantly.

Phone number
Your mobile number is verified and tied to your account login, so it's shown as read-only. To change it, contact support.

Emergency contact
Adding an emergency contact name and number helps us reach someone on your behalf if needed during a parking session.` },
      { id: 'a2', title: 'Managing Your Vehicles', snippet: 'Add, edit, or remove vehicles from your ParkSwift account.', readTime: '2 min',
        content: `Manage your vehicles under Find Space → My Vehicles.

Add a vehicle
Tap "Add Vehicle", enter the brand/model, registration number, type (Car/Bike), and capacity. Optionally upload front/side photos and the RC book to earn a VERIFIED badge.

Set active
Tap any vehicle card to mark it ACTIVE — the active vehicle is auto-selected at checkout.

Edit
Open a vehicle to update its details or photos. Existing photos show as previews; tap to replace them.

Remove
Tap the trash icon on a vehicle card to delete it.

The RC book is stored privately and only used for verification.` },
      { id: 'a3', title: 'Account Deletion Guide', snippet: 'Steps to permanently delete your account and what happens to your data.', readTime: '3 min',
        content: `You can permanently delete your ParkSwift account.

Before you delete
• Complete or cancel any active bookings.
• Owners: make sure no upcoming bookings depend on your spaces.
Deletion is permanent and can't be undone.

How to delete
Go to Profile → Account settings → Delete Account, and confirm. You may be asked to verify it's really you.

What happens to your data
Your profile, vehicles, and spaces are removed from the app. Some records (e.g. completed transactions) may be retained where required by law, in line with our Privacy Policy and India's DPDP Act.

Changed your mind?
If you only want a break, simply log out instead of deleting — your data stays intact for when you return.` },
    ],
  },
];

export default function ArticlesScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>('Booking');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

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
