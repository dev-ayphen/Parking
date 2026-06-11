import React, { useState } from 'react';
import {View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  Alert,
  ActivityIndicator} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { User2, Mail, Phone, Hash, CreditCard, CheckCircle2 } from 'lucide-react-native';
import PageHeader from '../../components/PageHeader';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, ExtendedColors } from '../../theme';

export default function ManageBillingScreen() {
  const router = useRouter();
  const [billingName, setBillingName] = useState('Hariharan S');
  const [billingEmail, setBillingEmail] = useState('hariharan@example.com');
  const [billingPhone, setBillingPhone] = useState('+91 98765 43210');
  const [gstId, setGstId] = useState('');
  const [activeGateway, setActiveGateway] = useState<'razorpay' | 'stripe'>('razorpay');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!billingName.trim() || !billingEmail.trim()) {
      Alert.alert('Validation Error', 'Billing name and email are required.');
      return;
    }
    setSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1200));
    setSaving(false);
    Alert.alert('Saved', 'Your billing details have been updated successfully.', [
      { text: 'OK', onPress: () => router.back() }
    ]);
  };

  const PaymentGatewayCard = ({
    id,
    name,
    tagline,
    color,
  }: {
    id: 'razorpay' | 'stripe';
    name: string;
    tagline: string;
    color: string;
  }) => (
    <TouchableOpacity
      style={[styles.gatewayCard, activeGateway === id && styles.gatewayCardActive]}
      onPress={() => setActiveGateway(id)}
      activeOpacity={0.8}
    >
      <View style={[styles.gatewayIcon, { backgroundColor: color + '18' }]}>
        <CreditCard size={20} color={color} />
      </View>
      <View style={styles.gatewayInfo}>
        <Text style={styles.gatewayName}>{name}</Text>
        <Text style={styles.gatewayTagline}>{tagline}</Text>
      </View>
      {activeGateway === id ? (
        <CheckCircle2 size={22} color={Colors.primary} />
      ) : (
        <View style={styles.radioEmpty} />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <PageHeader title="Manage Billing" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Billing Info Section */}
        <Text style={styles.sectionTitle}>Billing Information</Text>
        <View style={styles.card}>
          {/* Billing Name */}
          <View style={styles.inputWrapper}>
            <View style={styles.inputIconBox}>
              <User2 size={16} color={Colors.textSecondary} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Billing Name</Text>
              <TextInput
                style={styles.input}
                value={billingName}
                onChangeText={setBillingName}
                placeholder="Full name"
                placeholderTextColor={Colors.borderMuted}
                returnKeyType="next"
              />
            </View>
          </View>

          <View style={styles.rowDivider} />

          {/* Billing Email */}
          <View style={styles.inputWrapper}>
            <View style={styles.inputIconBox}>
              <Mail size={16} color={Colors.textSecondary} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Billing Email</Text>
              <TextInput
                style={styles.input}
                value={billingEmail}
                onChangeText={setBillingEmail}
                placeholder="email@example.com"
                placeholderTextColor={Colors.borderMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
              />
            </View>
          </View>

          <View style={styles.rowDivider} />

          {/* Phone */}
          <View style={styles.inputWrapper}>
            <View style={styles.inputIconBox}>
              <Phone size={16} color={Colors.textSecondary} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={billingPhone}
                onChangeText={setBillingPhone}
                placeholder="+91 00000 00000"
                placeholderTextColor={Colors.borderMuted}
                keyboardType="phone-pad"
                returnKeyType="next"
              />
            </View>
          </View>

          <View style={styles.rowDivider} />

          {/* GST ID */}
          <View style={styles.inputWrapper}>
            <View style={styles.inputIconBox}>
              <Hash size={16} color={Colors.textSecondary} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>GST / Tax ID <Text style={styles.optionalTag}>(optional)</Text></Text>
              <TextInput
                style={styles.input}
                value={gstId}
                onChangeText={setGstId}
                placeholder="e.g. 29ABCDE1234F1Z5"
                placeholderTextColor={Colors.borderMuted}
                autoCapitalize="characters"
                returnKeyType="done"
              />
            </View>
          </View>
        </View>

        {/* Payment Gateway Section */}
        <Text style={styles.sectionTitle}>Payment Gateway</Text>
        <Text style={styles.sectionSubtitle}>
          Select the gateway used for your subscription payments.
        </Text>

        <PaymentGatewayCard
          id="razorpay"
          name="Razorpay"
          tagline="Recommended for India · UPI, Cards, Netbanking"
          color={ExtendedColors.razorpayBlue}
        />
        <PaymentGatewayCard
          id="stripe"
          name="Stripe"
          tagline="International payments · Cards & more"
          color={ExtendedColors.stripePurple}
        />

        {/* Info Note */}
        <View style={styles.infoNote}>
          <Text style={styles.infoNoteText}>
            Changing the gateway will take effect on your next billing cycle. Existing subscriptions will not be interrupted.
          </Text>
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={styles.saveContainer}>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          activeOpacity={0.85}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator size="small" color={Colors.white} />
            : <Text style={styles.saveButtonText}>Save Changes</Text>
          }
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
  content: {
    padding: Spacing.screenH,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: FontSize['2xl'],                      // 18 = 2xl ✓
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  sectionSubtitle: {
    fontSize: FontSize.base,                        // 13 = base ✓
    color: Colors.textSecondary,
    marginBottom: Spacing['3xl'],
    lineHeight: 18,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,                  // 16 = lg ✓
    paddingHorizontal: Spacing['3xl'],
    marginBottom: Spacing['5xl'],
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: Spacing['3xl'],
    gap: Spacing.xl,
  },
  inputIconBox: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.input,               // 10 = input ✓
    backgroundColor: Colors.screenBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.micro,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: FontSize.sm,                          // 12 = sm ✓
    fontWeight: FontWeight.semibold,
    color: Colors.textMuted,
    letterSpacing: 0,
    marginBottom: Spacing.sm,
  },
  optionalTag: {
    fontWeight: FontWeight.normal,
    textTransform: 'lowercase',
    letterSpacing: 0,
  },
  input: {
    fontSize: FontSize.lg,                          // 15 = lg ✓
    fontWeight: FontWeight.medium,
    color: Colors.textPrimary,
    padding: 0,
  },
  rowDivider: {
    height: 1,
    backgroundColor: Colors.surfaceBg,
    marginLeft: 48,
  },
  gatewayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2xl'],
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,                  // 16 = lg ✓
    padding: Spacing['3xl'],
    marginBottom: Spacing.xl,
    borderWidth: 2,
    borderColor: 'transparent',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  gatewayCardActive: {
    borderColor: Colors.primary,
    backgroundColor: ExtendedColors.primaryTint2,   // '#FFF5F9' ✓
  },
  gatewayIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,                  // 12 = md ✓
    alignItems: 'center',
    justifyContent: 'center',
  },
  gatewayInfo: {
    flex: 1,
  },
  gatewayName: {
    fontSize: FontSize.lg,                          // 15 = lg ✓
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: 3,                                // no Spacing token for 3
  },
  gatewayTagline: {
    fontSize: FontSize.sm,                          // 12 = sm ✓
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  radioEmpty: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.borderMuted,
  },
  infoNote: {
    backgroundColor: Colors.infoBg,
    borderRadius: BorderRadius.md,                  // 12 = md ✓
    padding: Spacing['2xl'],
    marginTop: Spacing.md,
  },
  infoNoteText: {
    fontSize: FontSize.base,                        // 13 = base ✓
    color: Colors.info,
    lineHeight: 18,
  },
  saveContainer: {
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
  saveButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing['3xl'],
    borderRadius: BorderRadius.button,              // 14 = button ✓
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: ExtendedColors.disabledPink,   // '#F3A0B5' ✓
  },
  saveButtonText: {
    fontSize: FontSize.xl,                          // 16 = xl ✓
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
});
