import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Linking, Alert, Modal, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { CheckCircle2, Smartphone, QrCode, X } from 'lucide-react-native';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing } from '../theme';

interface Props {
  /** Owner's UPI ID, e.g. "name@okhdfcbank". If empty, the card asks to pay cash. */
  upiId?: string | null;
  /** Owner's display name (shown on the QR / payee). */
  payeeName?: string | null;
  /** Amount to pay, in rupees (default/suggested amount). Parker can edit. */
  amount: number;
  /** True once the parker has already marked as paid. */
  alreadyPaid?: boolean;
  /** Called when the parker taps "I've paid". Should hit the mark-paid endpoint. */
  onMarkPaid: () => Promise<void> | void;
  /** Optional: Parker's saved UPI ID for refunds. If provided, no manual entry needed. */
  parkerUpiId?: string | null;
  /** Optional: Called when parker saves/updates their UPI ID. */
  onSaveParkerUpi?: (upiId: string) => Promise<void> | void;
}

// Build the standard UPI deep-link string. Scanning this (or opening it) launches
// any UPI app pre-filled with the payee + amount. The app itself never touches money.
const buildUpiString = (upiId: string, payeeName: string, amount: number) => {
  // UPI spec: pa (UPI ID) must be encoded, but pn/tn should NOT be over-encoded.
  // Use only basic URL encoding for special chars; keep spaces and basic ASCII as-is.
  const sanitizeName = (name: string) => name.replace(/[^a-zA-Z0-9\s\-._]/g, '').substring(0, 60);
  const params = [
    `pa=${upiId}`, // UPI ID is typically lowercase@bank, no special chars needed
    `pn=${sanitizeName(payeeName || 'ParkSwift Owner')}`, // Plain ASCII, no URL encoding
    amount > 0 ? `am=${amount}` : '',
    'cu=INR',
    `tn=Parking fee`, // Simple, no encoding
  ].filter(Boolean);
  return `upi://pay?${params.join('&')}`;
};

/**
 * Shows the owner's UPI QR so the parker can pay them DIRECTLY. ParkSwift does NOT
 * process or hold the money — it only renders a QR generated from the owner's UPI
 * ID, plus an "Open UPI app" deep-link and a self-declared "I've paid" button.
 */
const UpiPayCard: React.FC<Props> = ({ upiId, payeeName, amount, alreadyPaid, onMarkPaid, parkerUpiId, onSaveParkerUpi }) => {
  const [marking, setMarking] = useState(false);
  const [displayAmount, setDisplayAmount] = useState(String(amount)); // Parker can edit amount
  const [parkerUpiModal, setParkerUpiModal] = useState(false);
  const [parkerUpiInput, setParkerUpiInput] = useState(parkerUpiId || ''); // Pre-fill with saved
  const [parkerUpiError, setParkerUpiError] = useState('');
  const [parkerUpiSaving, setParkerUpiSaving] = useState(false);

  // Owner has no UPI ID → check if parker has one saved
  if (!upiId) {
    // If parker HAS a saved UPI → show their QR code so owner can send payment request
    if (parkerUpiId) {
      const parkerUpiString = buildUpiString(parkerUpiId, 'Payment to me', 0); // amount=0 for receive requests
      return (
        <>
          <View style={styles.card}>
            <Text style={styles.title}>Owner payment QR</Text>
            <Text style={styles.subtitle}>Owner can scan to send you a payment request</Text>

            {/* Your UPI QR code */}
            <View style={styles.qrWrap}>
              <QRCode value={parkerUpiString} size={200} backgroundColor="#fff" />
            </View>

            <View style={styles.upiPill}>
              <Text style={styles.upiPillText}>{parkerUpiId}</Text>
            </View>

            {/* Edit your UPI if needed */}
            <TouchableOpacity
              style={styles.manualBtn}
              onPress={() => setParkerUpiModal(true)}
              activeOpacity={0.85}
            >
              <QrCode size={16} color={Colors.primary} strokeWidth={2.2} />
              <Text style={styles.manualBtnText}>Edit My UPI ID</Text>
            </TouchableOpacity>

            <Text style={styles.disclaimer}>
              The owner can scan this to request payment or send you money directly.
            </Text>
          </View>
        </>
      );
    }

    // If parker has NO UPI either → show fallback card with option to add
    return (
      <>
        <View style={styles.card}>
          <Text style={styles.title}>Pay the owner</Text>
          <Text style={styles.cashNote}>
            Please pay ₹{amount} directly to the owner (cash or their UPI). They haven't added a UPI ID for a scan-to-pay QR yet.
          </Text>
          {/* Parker can add their own UPI for future use */}
          <TouchableOpacity
            style={styles.manualBtn}
            onPress={() => setParkerUpiModal(true)}
            activeOpacity={0.85}
          >
            <QrCode size={16} color={Colors.primary} strokeWidth={2.2} />
            <Text style={styles.manualBtnText}>Add My UPI ID</Text>
          </TouchableOpacity>
        </View>

        {/* Parker's UPI ID Modal */}
        <Modal visible={parkerUpiModal} transparent animationType="fade" onRequestClose={() => {
          setParkerUpiModal(false);
          setParkerUpiInput(parkerUpiId || '');
          setParkerUpiError('');
        }}>
          <Pressable style={styles.modalOverlay} onPress={() => {
            setParkerUpiModal(false);
            setParkerUpiInput(parkerUpiId || '');
            setParkerUpiError('');
          }}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
              <Pressable style={styles.modalCard} onPress={() => {}}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Your UPI ID</Text>
                  <TouchableOpacity onPress={() => {
                    setParkerUpiModal(false);
                    setParkerUpiInput(parkerUpiId || '');
                    setParkerUpiError('');
                  }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <X size={20} color={Colors.textSecondary} strokeWidth={2} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalHint}>
                  Save your UPI ID for refunds and payment requests from owners.
                </Text>

                <TextInput
                  style={[styles.modalInput, !!parkerUpiError && styles.modalInputError]}
                  placeholder="name@okhdfcbank"
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="none"
                  value={parkerUpiInput}
                  onChangeText={(v) => {
                    setParkerUpiInput(v);
                    setParkerUpiError('');
                  }}
                />
                {!!parkerUpiError && <Text style={styles.modalErrorText}>{parkerUpiError}</Text>}

                <TouchableOpacity
                  style={[styles.modalBtn, !parkerUpiInput.trim() && styles.modalBtnDisabled]}
                  onPress={async () => {
                    const trimmed = parkerUpiInput.trim().toLowerCase();
                    if (!trimmed) {
                      setParkerUpiError('Please enter your UPI ID');
                      return;
                    }
                    if (!/^[a-z0-9.\-_]{2,256}@[a-z]{2,64}$/.test(trimmed)) {
                      setParkerUpiError('Invalid UPI ID format (e.g. name@okhdfcbank)');
                      return;
                    }
                    // Save to backend
                    setParkerUpiSaving(true);
                    try {
                      if (onSaveParkerUpi) {
                        await onSaveParkerUpi(trimmed);
                      }
                      setParkerUpiInput(trimmed);
                      setParkerUpiModal(false);
                    } catch (err: any) {
                      setParkerUpiError(err?.message || 'Failed to save UPI ID');
                    } finally {
                      setParkerUpiSaving(false);
                    }
                  }}
                  disabled={!parkerUpiInput.trim() || parkerUpiSaving}
                  activeOpacity={0.85}
                >
                  {parkerUpiSaving ? (
                    <ActivityIndicator color={Colors.white} size="small" />
                  ) : (
                    <Text style={styles.modalBtnText}>Save UPI ID</Text>
                  )}
                </TouchableOpacity>
              </Pressable>
            </KeyboardAvoidingView>
          </Pressable>
        </Modal>
      </>
    );
  }

  // Use the provided owner UPI (not for manual entry anymore)
  const effectiveUpiId = upiId;
  const effectivePayeeName = payeeName;
  const effectiveAmount = Math.max(1, Math.floor(Number(displayAmount) || 0)); // At least ₹1, whole rupees only

  const upiString = buildUpiString(effectiveUpiId || '', effectivePayeeName || '', effectiveAmount);

  const openUpiApp = async () => {
    try {
      const ok = await Linking.canOpenURL(upiString);
      if (ok) await Linking.openURL(upiString);
      else Alert.alert('No UPI app found', 'Install GPay, PhonePe or Paytm to pay, or scan the QR with another phone.');
    } catch {
      Alert.alert('Could not open UPI app', 'Try scanning the QR with your UPI app instead.');
    }
  };

  const handleMark = async () => {
    if (marking || alreadyPaid) return;
    setMarking(true);
    try {
      await onMarkPaid();
    } finally {
      setMarking(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Scan to pay</Text>
      <Text style={styles.subtitle}>Pay {effectivePayeeName || 'the owner'} directly via any UPI app</Text>

      {/* Editable amount input */}
      <View style={styles.amountEditWrap}>
        <Text style={styles.amountEditLabel}>Amount (₹)</Text>
        <TextInput
          style={styles.amountInput}
          value={displayAmount}
          onChangeText={setDisplayAmount}
          keyboardType="decimal-pad"
          placeholder="20"
          placeholderTextColor={Colors.textMuted}
        />
      </View>

      <View style={styles.qrWrap}>
        <QRCode value={upiString} size={200} backgroundColor="#fff" />
      </View>

      <View style={styles.upiPill}>
        <Text style={styles.upiPillText}>{effectiveUpiId}</Text>
      </View>


      {/* Open a UPI app directly on this phone (alternative to scanning). */}
      <TouchableOpacity style={styles.openBtn} onPress={openUpiApp} activeOpacity={0.85}>
        <Smartphone size={16} color={Colors.primary} strokeWidth={2.2} />
        <Text style={styles.openBtnText}>Open UPI app</Text>
      </TouchableOpacity>

      {/* Self-declared payment marker (the app does not verify the transfer). */}
      {alreadyPaid ? (
        <View style={styles.paidRow}>
          <CheckCircle2 size={18} color={Colors.success} strokeWidth={2.2} />
          <Text style={styles.paidText}>You marked this as paid</Text>
        </View>
      ) : (
        <TouchableOpacity style={styles.paidBtn} onPress={handleMark} disabled={marking} activeOpacity={0.85}>
          {marking ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <>
              <CheckCircle2 size={18} color={Colors.white} strokeWidth={2.2} />
              <Text style={styles.paidBtnText}>I've paid</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      <Text style={styles.disclaimer}>
        ParkSwift doesn't process this payment — it goes directly to the owner.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.screenH,
    alignItems: 'center',
  },
  title: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  subtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2, textAlign: 'center' },
  amountEditWrap: { marginVertical: Spacing.lg, alignItems: 'center' },
  amountEditLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textSecondary, marginBottom: Spacing.xs },
  amountInput: {
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    backgroundColor: Colors.screenBg,
    width: 120,
    textAlign: 'center',
  },
  qrWrap: {
    padding: Spacing.xl,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginVertical: Spacing.xl,
  },
  upiPill: {
    backgroundColor: Colors.screenBg,
    borderRadius: BorderRadius.circleXl,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
  },
  upiPillText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textBody },
  openBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xl,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.white,
  },
  openBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.primary },
  paidBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    paddingVertical: Spacing.xl,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.success,
    width: '100%',
  },
  paidBtnText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.white },
  paidRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.lg },
  paidText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.success },
  disclaimer: { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.lg, lineHeight: 16 },
  cashNote: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.md, lineHeight: 20 },
  parkerUpiHint: {
    marginVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.screenBg,
    borderRadius: BorderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  parkerUpiHintText: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 16 },
  manualBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.white,
  },
  manualBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.primary },

  // Manual UPI entry modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', paddingHorizontal: Spacing['3xl'] },
  modalCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: Spacing['3xl'] },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg },
  modalTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary, flex: 1 },
  modalHint: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.lg, lineHeight: 18 },
  modalInput: {
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    backgroundColor: Colors.screenBg,
  },
  modalInputError: { borderColor: Colors.error },
  modalErrorText: { fontSize: FontSize.xs, color: Colors.error, marginBottom: Spacing.lg },
  modalBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  modalBtnDisabled: { opacity: 0.5 },
  modalBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.white },
});

export default UpiPayCard;
