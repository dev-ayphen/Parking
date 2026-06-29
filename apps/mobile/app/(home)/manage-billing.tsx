import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Receipt, Info } from 'lucide-react-native';
import { api } from '../../services/api';
import { toast } from '../../utils/toast';
import { PageHeader } from '../../components';
import { useNetworkStore } from '../../store/networkStore';
import { useTheme } from '../../hooks/useTheme';
import { FontSize, FontWeight, BorderRadius, Spacing } from '../../theme';
import type { ColorsType } from '../../theme';

interface Billing {
  billingName: string;
  billingEmail: string;
  billingAddress: string;
  gstin: string;
  upiId: string;
}

export default function ManageBillingScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [billingName, setBillingName] = useState('');
  const [billingEmail, setBillingEmail] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [gstin, setGstin] = useState('');
  const [upiId, setUpiId] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/users/me/billing');
      const b: Billing = res.billing || {};
      setBillingName(b.billingName || '');
      setBillingEmail(b.billingEmail || '');
      setBillingAddress(b.billingAddress || '');
      setGstin(b.gstin || '');
      setUpiId(b.upiId || '');
    } catch {
      toast.error('Could not load billing details.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!useNetworkStore.getState().requireOnline()) return;
    if (!billingName.trim()) {
      toast.error('Billing name is required.');
      return;
    }
    try {
      setSaving(true);
      await api.put('/users/me/billing', {
        billingName: billingName.trim(),
        billingEmail: billingEmail.trim(),
        billingAddress: billingAddress.trim(),
        gstin: gstin.trim().toUpperCase(),
        upiId: upiId.trim().toLowerCase(),
      });
      toast.success('Billing details saved.');
      router.back();
    } catch (e: any) {
      toast.error(e?.message || 'Could not save billing details.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <PageHeader title="Billing Details" onBack={() => router.replace('/(home)')} />
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <PageHeader title="Billing Details" onBack={() => router.replace('/(home)')} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.infoCard}>
            <Receipt size={18} color={colors.primary} />
            <Text style={styles.infoText}>These details appear on your subscription invoices and GST receipts.</Text>
          </View>

          <Text style={styles.label}>Billing Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Name or company name"
            placeholderTextColor={colors.textMuted}
            value={billingName}
            onChangeText={setBillingName}
          />

          <Text style={styles.label}>Billing Email</Text>
          <TextInput
            style={styles.input}
            placeholder="invoices@yourcompany.com"
            placeholderTextColor={colors.textMuted}
            value={billingEmail}
            onChangeText={setBillingEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Billing Address</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Street, city, state, PIN"
            placeholderTextColor={colors.textMuted}
            value={billingAddress}
            onChangeText={setBillingAddress}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <Text style={styles.label}>GSTIN <Text style={styles.optional}>(optional)</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 29ABCDE1234F1Z5"
            placeholderTextColor={colors.textMuted}
            value={gstin}
            onChangeText={(t) => setGstin(t.toUpperCase())}
            autoCapitalize="characters"
            maxLength={15}
          />
          <View style={styles.hintRow}>
            <Info size={12} color={colors.textMuted} />
            <Text style={styles.hint}>Add your GSTIN to claim input tax credit on subscription payments.</Text>
          </View>

          {/* UPI ID — so parkers can pay you directly. We generate a QR from this on
              the parker's screen; ParkSwift never holds or processes the money. */}
          <Text style={styles.label}>UPI ID for payments <Text style={styles.optional}>(optional)</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. name@okhdfcbank"
            placeholderTextColor={colors.textMuted}
            value={upiId}
            onChangeText={(t) => setUpiId(t.toLowerCase().trim())}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />
          <View style={styles.hintRow}>
            <Info size={12} color={colors.textMuted} />
            <Text style={styles.hint}>Parkers scan a QR built from this to pay you directly via any UPI app. ParkSwift never holds the money.</Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.saveBtnText}>Save Billing Details</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ColorsType) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1, backgroundColor: colors.screenBg },
  content: { padding: Spacing.screenH, paddingBottom: Spacing['4xl'] },
  infoCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: colors.primaryBg, borderRadius: BorderRadius.lg,
    padding: Spacing.xl, marginBottom: Spacing['2xl'],
  },
  infoText: { flex: 1, fontSize: FontSize.sm, color: colors.textBody, lineHeight: 18 },
  label: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: colors.textSecondary, marginBottom: Spacing.sm, marginTop: Spacing.lg },
  optional: { fontWeight: FontWeight.normal, color: colors.textMuted },
  input: {
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border,
    borderRadius: BorderRadius.md, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg,
    fontSize: FontSize.base, color: colors.textPrimary,
  },
  multiline: { minHeight: 76 },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: Spacing.sm, paddingHorizontal: 2 },
  hint: { flex: 1, fontSize: FontSize.xs, color: colors.textMuted, lineHeight: 15 },
  footer: { padding: Spacing.screenH, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.borderLight },
  saveBtn: { backgroundColor: colors.primary, borderRadius: BorderRadius.button, paddingVertical: Spacing['3xl'], alignItems: 'center' },
  saveBtnText: { color: colors.white, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
});
