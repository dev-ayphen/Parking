import React, { useState, useEffect, useCallback } from 'react';
import {View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  ScrollView} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { User, Car, Clock } from 'lucide-react-native';
import PageHeader from '../../components/PageHeader';
import { api } from '../../services/api';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, ExtendedColors } from '../../theme';

export default function ExitVerificationScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const bookingId = params.bookingId as string;

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [useCurrentTime, setUseCurrentTime] = useState(true);
  const [manualTime, setManualTime] = useState(''); // HH:MM

  const fetchBooking = useCallback(async () => {
    try {
      const data = await api.get(`/bookings/${bookingId}`);
      setBooking(data.booking || data.data || data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  const getExitDate = () => {
    if (useCurrentTime) return new Date();
    
    if (!manualTime.match(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)) return null;
    
    // Parse manual time (assuming today)
    const [h, m] = manualTime.split(':').map(Number);
    const date = new Date();
    date.setHours(h, m, 0, 0);
    return date;
  };

  const getDurationStats = () => {
    if (!booking?.sessionStartedAt) return { hours: 0, amount: 0, durationStr: '—', isMinCharge: false };
    const exitDate = getExitDate();
    if (!exitDate) return { hours: 0, amount: 0, durationStr: 'Invalid Time', isMinCharge: false };

    const entryDate = new Date(booking.sessionStartedAt);
    let diffMs = exitDate.getTime() - entryDate.getTime();
    if (diffMs < 0) diffMs = 0;

    const diffMins = Math.floor(diffMs / 60000);
    const h = Math.floor(diffMins / 60);
    const m = diffMins % 60;
    const actualStr = diffMins === 0 ? '< 1 min' : `${h > 0 ? `${h}h ` : ''}${m}m`;

    const hoursDecimal = diffMins / 60;
    const isMinCharge = hoursDecimal < 0.5; // minimum 30-min billing
    const billableHours = Math.max(0.5, hoursDecimal);
    const rate = booking.space?.hourlyRate || 0;
    const amount = Math.round(billableHours * rate); // matches backend Math.round in releaseSpace
    const durationStr = isMinCharge ? `${actualStr} (min 30 min)` : actualStr;

    return { hours: billableHours, amount, durationStr, isMinCharge };
  };

  const handleCompleteSession = async () => {
    const exitDate = getExitDate();
    if (!exitDate) {
      Alert.alert('Invalid Time', 'Please enter a valid exit time (HH:MM in 24hr format).');
      return;
    }
    
    if (booking?.sessionStartedAt && exitDate.getTime() < new Date(booking.sessionStartedAt).getTime()) {
      Alert.alert('Invalid Time', 'Exit time cannot be before entry time.');
      return;
    }

    try {
      setActionLoading(true);
      const data = await api.put(`/bookings/${bookingId}/release`, { exitTime: exitDate.toISOString() });
      const summary = data.summary || { totalAmount: getDurationStats().amount };
      Alert.alert('Session Completed', `Successfully collected ₹${summary.totalAmount}.`, [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message);
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <PageHeader title="Exit Verification" onBack={() => router.back()} />
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      </SafeAreaView>
    );
  }

  if (error || !booking) {
    return (
      <SafeAreaView style={styles.container}>
        <PageHeader title="Exit Verification" onBack={() => router.back()} />
        <View style={styles.center}>
          <Text style={styles.errorText}>{error || 'Booking not found'}</Text>
          <TouchableOpacity style={styles.btnPrimary} onPress={fetchBooking}>
            <Text style={styles.btnPrimaryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const stats = getDurationStats();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <PageHeader title="Exit Verification" onBack={() => router.back()} />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Session Details Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Session Details</Text>
          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <View style={styles.iconCircleSmall}><User size={16} color={Colors.textPrimary} /></View>
              <View>
                <Text style={styles.infoLabel}>Parker</Text>
                <Text style={styles.infoValue} numberOfLines={1}>{booking.parker?.name || 'Unknown'}</Text>
              </View>
            </View>
            <View style={styles.detailItem}>
              <View style={styles.iconCircleSmall}><Car size={16} color={Colors.textPrimary} /></View>
              <View>
                <Text style={styles.infoLabel}>Vehicle</Text>
                <Text style={styles.infoValue} numberOfLines={1}>{booking.vehicle?.licensePlate || 'N/A'}</Text>
              </View>
            </View>
          </View>
          <View style={[styles.detailItem, { marginTop: Spacing.lg }]}>
            <View style={styles.iconCircleSmall}><Clock size={16} color={Colors.textPrimary} /></View>
            <View>
              <Text style={styles.infoLabel}>Entry Time</Text>
              <Text style={styles.infoValue}>
                {booking.sessionStartedAt 
                  ? new Date(booking.sessionStartedAt).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', hour12:true })
                  : 'N/A'}
              </Text>
            </View>
          </View>
        </View>

        {/* Exit Time Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Exit Time</Text>
          
          <View style={styles.radioRow}>
            <TouchableOpacity 
              style={[styles.radioCardCompact, useCurrentTime && styles.radioCardActive]}
              onPress={() => setUseCurrentTime(true)}
              activeOpacity={0.7}
            >
              <View style={[styles.radioOuter, useCurrentTime && styles.radioOuterActive]}>
                {useCurrentTime && <View style={styles.radioInner} />}
              </View>
              <View>
                <Text style={[styles.radioTitle, useCurrentTime && styles.radioTitleActive]}>Current Time</Text>
                <Text style={styles.radioSub}>{new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', hour12:true })}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.radioCardCompact, !useCurrentTime && styles.radioCardActive]}
              onPress={() => {
                setUseCurrentTime(false);
                if (!manualTime) {
                  const d = new Date();
                  setManualTime(`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`);
                }
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.radioOuter, !useCurrentTime && styles.radioOuterActive]}>
                {!useCurrentTime && <View style={styles.radioInner} />}
              </View>
              <View>
                <Text style={[styles.radioTitle, !useCurrentTime && styles.radioTitleActive]}>Manual Time</Text>
                {!useCurrentTime ? (
                  <TextInput
                    style={styles.timeInputCompact}
                    value={manualTime}
                    onChangeText={setManualTime}
                    placeholder="HH:MM"
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                  />
                ) : (
                  <Text style={styles.radioSub}>Enter Custom</Text>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Calculation Card */}
        <View style={styles.calcCard}>
          <Text style={styles.cardTitle}>Summary</Text>
          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>Duration</Text>
            <Text style={[styles.calcVal, stats.isMinCharge && { color: Colors.amberWarning }]}>{stats.durationStr}</Text>
          </View>
          {stats.isMinCharge && (
            <Text style={styles.minChargeNote}>Minimum 30-min charge applies</Text>
          )}
          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>Hourly Rate</Text>
            <Text style={styles.calcVal}>₹{booking.space?.hourlyRate || 0}/hour</Text>
          </View>
          <View style={styles.calcTotalRow}>
            <Text style={styles.calcTotalLabel}>Total Amount</Text>
            <Text style={styles.calcTotalVal}>₹{stats.amount}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.btnPrimary} onPress={handleCompleteSession} disabled={actionLoading}>
          {actionLoading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.btnPrimaryText}>Complete Session</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: Colors.error, marginBottom: Spacing.lg },

  contentContainer: { padding: Spacing['3xl'], gap: Spacing.xl, paddingBottom: Spacing['7xl'] },

  card: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing['3xl'], borderWidth: 1, borderColor: Colors.borderLight },
  cardTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: Spacing.lg },

  detailsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, flex: 1 },
  iconCircleSmall: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.borderLighter, alignItems: 'center', justifyContent: 'center' },
  infoLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  infoValue: { fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: FontWeight.semibold },

  radioRow: { flexDirection: 'row', gap: Spacing.lg },
  radioCardCompact: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', padding: Spacing.lg, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.borderLight, backgroundColor: Colors.screenBg },
  radioCardActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  radioOuter: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: Colors.borderMedium, marginRight: Spacing.md, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.micro },
  radioOuterActive: { borderColor: Colors.primary },
  radioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },
  radioTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textDark, marginBottom: Spacing.micro },
  radioTitleActive: { color: Colors.primary },
  radioSub: { fontSize: FontSize.xs, color: Colors.textSecondary },
  timeInputCompact: { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.borderLight, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, fontSize: FontSize.sm, color: Colors.textPrimary, marginTop: Spacing.xs, width: 70, textAlign: 'center' },

  calcCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing['3xl'], borderWidth: 1, borderColor: Colors.borderLight },
  calcRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.md },
  calcLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  calcVal: { fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: FontWeight.semibold },
  calcTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.md, paddingTop: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.borderLighter, borderStyle: 'dashed' },
  calcTotalLabel: { fontSize: FontSize.base, color: Colors.textPrimary, fontWeight: FontWeight.bold },
  calcTotalVal: { fontSize: FontSize['3xl'], color: Colors.primary, fontWeight: FontWeight.extrabold },
  minChargeNote: { fontSize: FontSize.xs, color: Colors.warningAlt, fontWeight: FontWeight.semibold, marginTop: -6, marginBottom: Spacing.lg },

  footer: { padding: Spacing['3xl'], backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  btnPrimary: { backgroundColor: Colors.primary, borderRadius: BorderRadius.lg, paddingVertical: Spacing['2xl'], alignItems: 'center' },
  btnPrimaryText: { color: Colors.white, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
});

