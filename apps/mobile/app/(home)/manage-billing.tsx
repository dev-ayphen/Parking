import React, { useState, useEffect, useCallback } from 'react';
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
import { Colors, FontSize, FontWeight, BorderRadius, Spacing } from '../../theme';

interface Billing {
  billingName: string;
  billingEmail: string;
  billingAddress: string;
  gstin: string;
}

export default function ManageBillingScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [billingName, setBillingName] = useState('');
  const [billingEmail, setBillingEmail] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [gstin, setGstin] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/users/me/billing');
      const b: Billing = res.billing || {};
      setBillingName(b.billingName || '');
      setBillingEmail(b.billingEmail || '');
      setBillingAddress(b.billingAddress || '');
      setGstin(b.gstin || '');
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
        <PageHeader title="Billing Details" onBack={() => router.back()} />
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <PageHeader title="Billing Details" onBack={() => router.back()} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.infoCard}>
            <Receipt size={18} color={Colors.primary} />
            <Text style={styles.infoText}>These details appear on your subscription invoices and GST receipts.</Text>
          </View>

          <Text style={styles.label}>Billing Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Name or company name"
            placeholderTextColor={Colors.textMuted}
            value={billingName}
            onChangeText={setBillingName}
          />

          <Text style={styles.label}>Billing Email</Text>
          <TextInput
            style={styles.input}
            placeholder="invoices@yourcompany.com"
            placeholderTextColor={Colors.textMuted}
            value={billingEmail}
            onChangeText={setBillingEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Billing Address</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Street, city, state, PIN"
            placeholderTextColor={Colors.textMuted}
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
            placeholderTextColor={Colors.textMuted}
            value={gstin}
            onChangeText={(t) => setGstin(t.toUpperCase())}
            autoCapitalize="characters"
            maxLength={15}
          />
          <View style={styles.hintRow}>
            <Info size={12} color={Colors.textMuted} />
            <Text style={styles.hint}>Add your GSTIN to claim input tax credit on subscription payments.</Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.saveBtnText}>Save Billing Details</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1, backgroundColor: Colors.screenBg },
  content: { padding: Spacing.screenH, paddingBottom: Spacing['4xl'] },
  infoCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.primaryBg, borderRadius: BorderRadius.lg,
    padding: Spacing.xl, marginBottom: Spacing['2xl'],
  },
  infoText: { flex: 1, fontSize: FontSize.sm, color: Colors.textBody, lineHeight: 18 },
  label: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textSecondary, marginBottom: Spacing.sm, marginTop: Spacing.lg },
  optional: { fontWeight: FontWeight.normal, color: Colors.textMuted },
  input: {
    backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border,
    borderRadius: BorderRadius.md, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg,
    fontSize: FontSize.base, color: Colors.textPrimary,
  },
  multiline: { minHeight: 76 },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: Spacing.sm, paddingHorizontal: 2 },
  hint: { flex: 1, fontSize: FontSize.xs, color: Colors.textMuted, lineHeight: 15 },
  footer: { padding: Spacing.screenH, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.button, paddingVertical: Spacing['3xl'], alignItems: 'center' },
  saveBtnText: { color: Colors.white, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
});
