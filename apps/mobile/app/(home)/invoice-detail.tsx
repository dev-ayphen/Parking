import React from 'react';
import {View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Download, CheckCircle2, Share2 } from 'lucide-react-native';
import PageHeader from '../../components/PageHeader';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, ExtendedColors } from '../../theme';

export default function InvoiceDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const invoiceId = (params.invoiceId as string) || 'INV-001';
  const plan = (params.plan as string) || 'Pro Plan - Monthly';
  const date = (params.date as string) || '01 Oct, 2023';
  const amount = (params.amount as string) || '₹499';

  const handleDownload = () => {
    Alert.alert('Download Invoice', `Invoice ${invoiceId} will be downloaded as a PDF.`);
  };

  const handleShare = () => {
    Alert.alert('Share Invoice', `Sharing invoice ${invoiceId}...`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <PageHeader
        title="Invoice"
        onBack={() => router.back()}
        right={
          <TouchableOpacity style={styles.shareButton} onPress={handleShare} activeOpacity={0.7}>
            <Share2 size={20} color={Colors.textDark} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Status Banner */}
        <View style={styles.statusBanner}>
          <CheckCircle2 size={20} color={Colors.successAlt} />
          <Text style={styles.statusText}>Payment Successful</Text>
        </View>

        {/* Invoice Card */}
        <View style={styles.invoiceCard}>
          {/* Branding */}
          <View style={styles.brandHeader}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoLetter}>P</Text>
            </View>
            <View>
              <Text style={styles.brandName}>ParkSwift</Text>
              <Text style={styles.brandTagline}>Admin Dashboard</Text>
            </View>
          </View>

          <View style={styles.dividerLine} />

          {/* Invoice Meta */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Invoice No.</Text>
              <Text style={styles.metaValue}>{invoiceId}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Invoice Date</Text>
              <Text style={styles.metaValue}>{date}</Text>
            </View>
          </View>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Status</Text>
              <View style={styles.paidBadge}>
                <Text style={styles.paidBadgeText}>PAID</Text>
              </View>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Payment Method</Text>
              <Text style={styles.metaValue}>Razorpay</Text>
            </View>
          </View>

          <View style={styles.dividerLine} />

          {/* Billed To */}
          <Text style={styles.sectionLabel}>Billed To</Text>
          <Text style={styles.billedName}>Space Owner Account</Text>
          <Text style={styles.billedDetail}>owner@parkswift.com</Text>
          <Text style={styles.billedDetail}>+91 98765 43210</Text>

          <View style={styles.dividerLine} />

          {/* Line Items */}
          <Text style={styles.sectionLabel}>Items</Text>
          <View style={styles.lineItem}>
            <View style={styles.lineItemLeft}>
              <Text style={styles.lineItemName}>{plan}</Text>
              <Text style={styles.lineItemDesc}>Subscription • 1 month</Text>
            </View>
            <Text style={styles.lineItemAmount}>{amount}</Text>
          </View>

          <View style={styles.dividerDashed} />

          {/* Totals */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{amount}</Text>
          </View>
          <View style={styles.dividerLine} />

          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>{amount}</Text>
          </View>
        </View>

        {/* Footer Note */}
        <Text style={styles.footerNote}>
          Thank you for your subscription. This invoice was generated automatically by ParkSwift.
        </Text>
      </ScrollView>

      {/* Download Button */}
      <View style={styles.downloadContainer}>
        <TouchableOpacity style={styles.downloadButton} onPress={handleDownload} activeOpacity={0.85}>
          <Download size={20} color={Colors.white} />
          <Text style={styles.downloadText}>Download PDF</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.screenBg,
  },
  shareButton: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.circle,              // 19 = circle ✓
    backgroundColor: Colors.screenBg,
    borderWidth: 1,
    borderColor: Colors.surfaceBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: Spacing.screenH,
    paddingBottom: 100,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.successBgAlt,           // '#ECFDF5' ✓
    borderWidth: 1,
    borderColor: ExtendedColors.greenBorderAlt,     // '#A7F3D0' ✓
    borderRadius: BorderRadius.md,                  // 12 = md ✓
    padding: Spacing['2xl'],
    marginBottom: Spacing.screenH,
  },
  statusText: {
    fontSize: FontSize.lg,                          // 15 = lg ✓
    fontWeight: FontWeight.semibold,
    color: ExtendedColors.greenInvoice,             // '#065F46' ✓
  },
  invoiceCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.circleXl,            // 20 = circleXl ✓
    padding: Spacing['4xl'],
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16 },
      android: { elevation: 5 },
    }),
  },
  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xl,
    marginBottom: Spacing.screenH,
  },
  logoCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoLetter: {
    fontSize: FontSize['3xl'],                      // 20 = 3xl ✓
    fontWeight: FontWeight.extrabold,
    color: Colors.white,
  },
  brandName: {
    fontSize: FontSize['2xl'],                      // 18 = 2xl ✓
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  brandTagline: {
    fontSize: FontSize.sm,                          // 12 = sm ✓
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  dividerLine: {
    height: 1,
    backgroundColor: Colors.surfaceBg,
    marginVertical: Spacing.screenH,
  },
  dividerDashed: {
    height: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    marginVertical: Spacing['3xl'],
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing['3xl'],
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    fontSize: FontSize.sm,                          // 12 = sm ✓
    color: Colors.textMuted,
    fontWeight: FontWeight.medium,
    marginBottom: Spacing.xs,
    letterSpacing: 0,
  },
  metaValue: {
    fontSize: FontSize.md,                          // 14 = md ✓
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  paidBadge: {
    backgroundColor: Colors.successBgAlt,           // '#ECFDF5' ✓
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.badge,               // 6 = badge ✓
    alignSelf: 'flex-start',
  },
  paidBadgeText: {
    fontSize: FontSize.sm,                          // 12 = sm ✓
    fontWeight: FontWeight.bold,
    color: ExtendedColors.greenInvoice,             // '#065F46' ✓
    letterSpacing: 0,
  },
  sectionLabel: {
    fontSize: FontSize.sm,                          // 12 = sm ✓
    color: Colors.textMuted,
    fontWeight: FontWeight.semibold,
    letterSpacing: 0,
    marginBottom: Spacing.lg,
  },
  billedName: {
    fontSize: FontSize.lg,                          // 15 = lg ✓
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  billedDetail: {
    fontSize: FontSize.base,                        // 13 = base ✓
    color: Colors.textSecondary,
    marginBottom: Spacing.micro,
  },
  lineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  lineItemLeft: {
    flex: 1,
    paddingRight: Spacing.xl,
  },
  lineItemName: {
    fontSize: FontSize.lg,                          // 15 = lg ✓
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  lineItemDesc: {
    fontSize: FontSize.base,                        // 13 = base ✓
    color: Colors.textSecondary,
  },
  lineItemAmount: {
    fontSize: FontSize.xl,                          // 16 = xl ✓
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  totalLabel: {
    fontSize: FontSize.md,                          // 14 = md ✓
    color: Colors.textSecondary,
  },
  totalValue: {
    fontSize: FontSize.md,                          // 14 = md ✓
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  grandTotalLabel: {
    fontSize: FontSize['2xl'],                      // 18 = 2xl ✓
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  grandTotalValue: {
    fontSize: FontSize['3xl'],                      // 20 = 3xl ✓
    fontWeight: FontWeight.extrabold,
    color: Colors.primary,
  },
  footerNote: {
    fontSize: FontSize.sm,                          // 12 = sm ✓
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: Spacing.screenH,
    paddingHorizontal: Spacing.md,
  },
  downloadContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.screenH,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBg,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.06, shadowRadius: 12 },
      android: { elevation: 12 },
    }),
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing['3xl'],
    borderRadius: BorderRadius.button,              // 14 = button ✓
  },
  downloadText: {
    fontSize: FontSize.xl,                          // 16 = xl ✓
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
});
