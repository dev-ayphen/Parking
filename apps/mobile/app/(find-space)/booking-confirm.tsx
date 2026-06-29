import React, { useState, useMemo } from 'react';
import Constants from 'expo-constants';
import {View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Platform,
  Animated,
  Alert,
  ActivityIndicator,
  TextInput} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MapPin, Car, Clock, Check } from 'lucide-react-native';
import { api } from '../../services/api';
import { useNetworkStore } from '../../store/networkStore';
import PageHeader from '../../components/PageHeader';
import { FontSize, FontWeight, BorderRadius, Spacing, ExtendedColors } from '../../theme';
import type { ColorsType } from '../../theme';
import { useTheme } from '../../hooks/useTheme';

// Arrival time presets (minutes from now)
const ARRIVAL_PRESETS = [
  { label: '10 min', value: 10 },
  { label: '20 min', value: 20 },
  { label: '30 min', value: 30 },
  { label: '1 hour', value: 60 },
];

// Mandatory declarations the parker must accept before booking
const DECLARATIONS = [
  { key: 'verifiedSurroundings',   text: 'I verified the surroundings before parking' },
  { key: 'acceptLocalParkingRules',text: 'I understand local parking laws and authority regulations still apply' },
  { key: 'acceptFineResponsibility',text: 'I accept responsibility for fines, towing, or violations caused by improper parking' },
  { key: 'acceptPlatformDisclaimer',text: 'ParkSwift only facilitates parking coordination between users' },
  { key: 'acceptParkingTerms',     text: 'I agree to the Parking Terms & Conditions' },
] as const;

type DeclarationKey = (typeof DECLARATIONS)[number]['key'];

const makeStyles = (colors: ColorsType) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    flex: 1,
    backgroundColor: colors.screenBg,
    paddingHorizontal: Spacing['3xl'],
  },
  summaryCard: {
    marginTop: Spacing['3xl'],
    backgroundColor: colors.white,
    borderRadius: BorderRadius.lg,        // 16 = lg ✓
    paddingVertical: Spacing['3xl'],
    borderWidth: 1,
    borderColor: colors.border,           // '#E2E8F0' = border ✓
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summarySection: {
    paddingHorizontal: Spacing['3xl'],
  },
  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.xl,                      // 12 = xl ✓
    alignItems: 'flex-start',
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,        // 12 = md ✓
    backgroundColor: colors.screenBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  summaryContent: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: FontSize.sm,                // 12 = sm ✓
    fontWeight: FontWeight.semibold,
    color: colors.textMuted,
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  summaryValue: {
    fontSize: FontSize.lg,                // 15 = lg ✓
    fontWeight: FontWeight.bold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  summarySubtext: {
    fontSize: FontSize.base,              // 13 = base ✓
    fontWeight: FontWeight.medium,
    color: colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.screenBg,
    marginHorizontal: Spacing['3xl'],
    marginVertical: Spacing.xl,           // 12 = xl ✓
  },
  sectionCard: {
    marginTop: Spacing['3xl'],
    backgroundColor: colors.white,
    borderRadius: BorderRadius.lg,        // 16 = lg ✓
    padding: Spacing['3xl'],
    borderWidth: 1,
    borderColor: colors.border,           // '#E2E8F0' = border ✓
  },
  sectionCardTitle: {
    fontSize: FontSize.lg,                // 15 = lg ✓
    fontWeight: FontWeight.bold,
    color: colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  sectionCardSubtitle: {
    fontSize: FontSize.base,              // 13 = base ✓
    fontWeight: FontWeight.medium,
    color: colors.textSecondary,
    marginBottom: Spacing['2xl'],
  },
  arrivalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  arrivalChip: {
    paddingHorizontal: Spacing['3xl'],
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,        // 12 = md ✓
    borderWidth: 1.5,
    borderColor: colors.border,           // '#E2E8F0' = border ✓
    backgroundColor: colors.white,
  },
  arrivalChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceBg,
  },
  arrivalChipText: {
    fontSize: FontSize.base,              // 13 = base ✓
    fontWeight: FontWeight.semibold,
    color: colors.textSecondary,
  },
  arrivalChipTextActive: {
    color: colors.primary,
  },
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    marginTop: Spacing.xl,                // 12 = xl ✓
  },
  customInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,           // '#E2E8F0' = border ✓
    borderRadius: BorderRadius.md,        // 12 = md ✓
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.xl,          // 12 = xl ✓
    fontSize: FontSize.lg,                // 15 = lg ✓
    fontWeight: FontWeight.semibold,
    color: colors.textPrimary,
  },
  customInputSuffix: {
    fontSize: FontSize.md,                // 14 = md ✓
    fontWeight: FontWeight.semibold,
    color: colors.textSecondary,
  },
  pricingCard: {
    marginTop: Spacing['3xl'],
    backgroundColor: colors.white,
    borderRadius: BorderRadius.lg,        // 16 = lg ✓
    padding: Spacing['3xl'],
    borderWidth: 1,
    borderColor: colors.border,           // '#E2E8F0' = border ✓
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  pricingTitle: {
    fontSize: FontSize.lg,                // 15 = lg ✓
    fontWeight: FontWeight.bold,
    color: colors.textPrimary,
    marginBottom: Spacing.xl,             // 12 = xl ✓
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  breakdownLabel: {
    fontSize: FontSize.base,              // 13 = base ✓
    fontWeight: FontWeight.medium,
    color: colors.textSecondary,
  },
  breakdownValue: {
    fontSize: FontSize.base,              // 13 = base ✓
    fontWeight: FontWeight.bold,
    color: colors.textPrimary,
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: colors.screenBg,
    marginVertical: Spacing.md,
  },
  totalLabel: {
    fontSize: FontSize.lg,                // 15 = lg ✓
    fontWeight: FontWeight.bold,
    color: colors.textPrimary,
  },
  totalValue: {
    fontSize: FontSize['2xl'],            // 18 = 2xl ✓
    fontWeight: FontWeight.extrabold,
    color: colors.primary,
  },
  declarationRow: {
    flexDirection: 'row',
    gap: Spacing.xl,                      // 12 = xl ✓
    alignItems: 'flex-start',
    paddingVertical: Spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: BorderRadius.badge,     // 6 = badge ✓
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  declarationText: {
    flex: 1,
    fontSize: FontSize.base,              // 13 = base ✓
    fontWeight: FontWeight.medium,
    color: colors.textDark,
    lineHeight: 19,
  },
  declarationLink: {
    color: colors.primary,
    fontWeight: FontWeight.semibold,
    textDecorationLine: 'underline',
  },
  stickyFooter: {
    backgroundColor: colors.white,
    paddingHorizontal: Spacing['3xl'],
    paddingVertical: Spacing.xl,          // 12 = xl ✓
    borderTopWidth: 1,
    borderTopColor: colors.border,        // '#E2E8F0' = border ✓
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  confirmButton: {
    backgroundColor: colors.primary,
    borderRadius: BorderRadius.button,    // 14 = button ✓
    paddingVertical: Spacing['3xl'],
    paddingHorizontal: Spacing['3xl'],
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Spacing.md,
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    color: colors.white,
    fontSize: FontSize.xl,                // 16 = xl ✓
    fontWeight: FontWeight.bold,
  },
  confirmButtonPrice: {
    color: colors.white,
    fontSize: FontSize.md,                // 14 = md ✓
    fontWeight: FontWeight.semibold,
  },
});

const BookingConfirmScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [fadeAnim] = useState(new Animated.Value(0));
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  // Parse params
  const spaceId = params.spaceId as string;
  const spaceName = params.spaceName as string;
  const address = params.address as string;
  const vehicleId = params.vehicleId as string;
  const vehicleRegistration = params.vehicleRegistration as string;
  const vehicleType = params.vehicleType as string;
  // Parse safely — a missing/non-numeric param must never render "₹NaN".
  const toNum = (v: unknown): number | null => {
    const n = parseInt(v as string, 10);
    return Number.isFinite(n) ? n : null;
  };
  const durationHours = toNum(params.durationHours) ?? 1;
  const pricePerHour = toNum(params.pricePerHour);
  // Derive base/total from the rate when those params are absent.
  const basePrice = toNum(params.basePrice) ?? (pricePerHour != null ? pricePerHour * durationHours : null);
  const totalPrice = toNum(params.totalPrice) ?? basePrice;
  // Display helper — shows "—" instead of NaN when a value is genuinely unknown.
  const money = (v: number | null) => (v != null ? `₹${v}` : '—');

  // Booking flow state. arrivalMinutes starts NULL — the user must actively pick
  // an arrival time before they can confirm (no silent default).
  const [arrivalMinutes, setArrivalMinutes] = useState<number | null>(null);
  const [customMode, setCustomMode] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const [declarations, setDeclarations] = useState<Record<DeclarationKey, boolean>>({
    verifiedSurroundings: false,
    acceptLocalParkingRules: false,
    acceptFineResponsibility: false,
    acceptPlatformDisclaimer: false,
    acceptParkingTerms: false,
  });
  const [submitting, setSubmitting] = useState(false);

  const allAccepted = DECLARATIONS.every((d) => declarations[d.key]);

  // Arrival time is mandatory: either a preset is selected, or custom mode holds a
  // valid positive number. Confirm stays disabled until this is true.
  const customMinutes = parseInt(customValue, 10);
  const hasArrivalTime = customMode
    ? !isNaN(customMinutes) && customMinutes > 0
    : arrivalMinutes != null;

  // "Now" ticks every 30s so the displayed start time stays current while the
  // user reads the declarations (instead of freezing at mount and drifting from
  // the real eta we send on submit).
  const [now, setNow] = useState(() => new Date());
  React.useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30 * 1000);
    return () => clearInterval(t);
  }, []);

  const bookingDate = now.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const startTime = now.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  const endTime = new Date(now.getTime() + durationHours * 60 * 60 * 1000).toLocaleTimeString(
    'en-IN',
    {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }
  );

  // Animate in
  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const toggleDeclaration = (key: DeclarationKey) => {
    setDeclarations((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const selectPreset = (value: number) => {
    setCustomMode(false);
    setArrivalMinutes(value);
  };

  const selectCustom = () => {
    setCustomMode(true);
    const parsed = parseInt(customValue, 10);
    if (!isNaN(parsed) && parsed > 0) setArrivalMinutes(parsed);
  };

  const handleConfirm = async () => {
    if (!useNetworkStore.getState().requireOnline()) return;
    if (!allAccepted) {
      Alert.alert('Declarations Required', 'Please accept all declarations before confirming your booking.');
      return;
    }
    if (!hasArrivalTime) {
      Alert.alert('Arrival Time Required', 'Please choose when you will arrive before confirming.');
      return;
    }
    const finalMinutes = customMode ? parseInt(customValue, 10) : (arrivalMinutes as number);
    if (isNaN(finalMinutes) || finalMinutes <= 0) {
      Alert.alert('Invalid Arrival Time', 'Please enter a valid number of minutes.');
      return;
    }

    try {
      setSubmitting(true);

      const eta = new Date(Date.now() + finalMinutes * 60 * 1000).toISOString();
      const payload = {
        spaceId: Number(spaceId),
        vehicleId: Number(vehicleId),
        durationHours,
        eta,
      };
      if (__DEV__) console.log('[BOOKING_CONFIRM] Sending payload:', payload);

      // 1. Create the booking
      const json = await api.post('/bookings', payload);
      if (__DEV__) console.log('[BOOKING_CONFIRM] Response:', { json });
      if (!json.success) {
        const errorMsg = typeof json.error === 'object' ? json.error?.message : json.error;
        throw new Error(errorMsg || 'Failed to create booking');
      }

      const bookingId = json.booking?.id;

      // 2. Record the consent / declarations (best-effort — booking already created)
      if (bookingId != null) {
        try {
          await api.post(`/bookings/${bookingId}/consent`, {
            ...declarations,
            platform: Platform.OS,
            appVersion: Constants.expoConfig?.version ?? '1.0.0',
          });
        } catch (consentErr) {
          if (__DEV__) console.log('[BOOKING_CONFIRM] consent error', consentErr);
        }
      }

      // 3. The booking WAS created (json.success was true). If the id is missing
      // for any reason, never show "Booking Failed" — the booking exists. Route to
      // the success screen with the id when we have it, otherwise fall back to the
      // bookings list so the user can see their placed booking.
      if (bookingId != null) {
        router.replace({
          pathname: '/(find-space)/booking-success',
          params: {
            bookingId: String(bookingId),
            spaceName,
            totalAmount: totalPrice != null ? String(totalPrice) : '',
          },
        });
      } else {
        Alert.alert(
          'Booking Placed',
          'Your booking was placed successfully. You can track it in your bookings.',
        );
        router.replace('/(home)/my-bookings');
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      Alert.alert('Booking Failed', errorMsg || 'Unknown error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <PageHeader title="Confirm Booking" onBack={() => router.replace('/(find-space)')} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Summary Card */}
          <View style={styles.summaryCard}>
            {/* Parking Space Section */}
            <View style={styles.summarySection}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryIcon}>
                  <MapPin size={18} color={colors.primary} strokeWidth={2.5} />
                </View>
                <View style={styles.summaryContent}>
                  <Text style={styles.summaryLabel}>Parking Space</Text>
                  <Text style={styles.summaryValue}>{spaceName}</Text>
                  <Text style={styles.summarySubtext}>{address}</Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Date & Time Section */}
            <View style={styles.summarySection}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryIcon}>
                  <Clock size={18} color={ExtendedColors.activeBlueText} strokeWidth={2.5} />
                </View>
                <View style={styles.summaryContent}>
                  <Text style={styles.summaryLabel}>Date & Time</Text>
                  <Text style={styles.summaryValue}>{bookingDate}</Text>
                  <Text style={styles.summarySubtext}>
                    {startTime} to {endTime} ({durationHours}h)
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Vehicle Section */}
            <View style={styles.summarySection}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryIcon}>
                  <Car size={18} color={ExtendedColors.teal} strokeWidth={2.5} />
                </View>
                <View style={styles.summaryContent}>
                  <Text style={styles.summaryLabel}>Vehicle</Text>
                  <Text style={styles.summaryValue}>{vehicleRegistration}</Text>
                  <Text style={styles.summarySubtext}>{vehicleType}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Arrival Time Card */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionCardTitle}>When will you arrive? *</Text>
            <Text style={styles.sectionCardSubtitle}>
              {hasArrivalTime
                ? 'The owner will be notified of your expected arrival.'
                : 'Required — pick your arrival time to continue.'}
            </Text>
            <View style={styles.arrivalRow}>
              {ARRIVAL_PRESETS.map((preset) => {
                const active = !customMode && arrivalMinutes === preset.value;
                return (
                  <TouchableOpacity
                    key={preset.value}
                    style={[styles.arrivalChip, active && styles.arrivalChipActive]}
                    onPress={() => selectPreset(preset.value)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.arrivalChipText, active && styles.arrivalChipTextActive]}>
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                style={[styles.arrivalChip, customMode && styles.arrivalChipActive]}
                onPress={selectCustom}
                activeOpacity={0.7}
              >
                <Text style={[styles.arrivalChipText, customMode && styles.arrivalChipTextActive]}>
                  Custom
                </Text>
              </TouchableOpacity>
            </View>
            {customMode && (
              <View style={styles.customInputRow}>
                <TextInput
                  style={styles.customInput}
                  placeholder="Enter minutes"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  value={customValue}
                  onChangeText={(t) => {
                    setCustomValue(t);
                    const parsed = parseInt(t, 10);
                    if (!isNaN(parsed) && parsed > 0) setArrivalMinutes(parsed);
                  }}
                />
                <Text style={styles.customInputSuffix}>minutes</Text>
              </View>
            )}
          </View>

          {/* Pricing Breakdown Card */}
          <View style={styles.pricingCard}>
            <Text style={styles.pricingTitle}>Price Breakdown</Text>

            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>
                {money(pricePerHour)} × {durationHours}h
              </Text>
              <Text style={styles.breakdownValue}>{money(basePrice)}</Text>
            </View>

            <View style={styles.breakdownDivider} />

            <View style={styles.breakdownRow}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalValue}>{money(totalPrice)}</Text>
            </View>
          </View>

          {/* Declarations Card */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionCardTitle}>Declarations</Text>
            <Text style={styles.sectionCardSubtitle}>Please review the terms to continue.</Text>

            <TouchableOpacity
              style={styles.declarationRow}
              onPress={() => {
                const newState = !allAccepted;
                setDeclarations({
                  verifiedSurroundings: newState,
                  acceptLocalParkingRules: newState,
                  acceptFineResponsibility: newState,
                  acceptPlatformDisclaimer: newState,
                  acceptParkingTerms: newState,
                });
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, allAccepted && styles.checkboxChecked]}>
                {allAccepted && <Check size={14} color={colors.white} strokeWidth={3} />}
              </View>
              <Text style={styles.declarationText}>
                I have read and agree to the{' '}
                <Text
                  style={styles.declarationLink}
                  onPress={() => router.push('/(find-space)/booking-terms')}
                  suppressHighlighting
                >
                  Parking Terms &amp; Conditions
                </Text>
              </Text>
            </TouchableOpacity>
          </View>

          {/* Spacer */}
          <View style={{ height: 100 }} />
        </Animated.View>
      </ScrollView>

      {/* Sticky Footer */}
      <View style={styles.stickyFooter}>
        <TouchableOpacity
          style={[styles.confirmButton, (!allAccepted || !hasArrivalTime || submitting) && styles.confirmButtonDisabled]}
          onPress={handleConfirm}
          activeOpacity={0.8}
          disabled={!allAccepted || !hasArrivalTime || submitting}
        >
          {submitting ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <>
              <Text style={styles.confirmButtonText}>Confirm Booking</Text>
              <Text style={styles.confirmButtonPrice}>{money(totalPrice)}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default BookingConfirmScreen;
