import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Animated, Vibration, Alert,
  DeviceEventEmitter,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Clock, User, Car, MapPin, CheckCircle2, XCircle } from 'lucide-react-native';
import { API_BASE } from '../config/api.config';
import { getAuthToken } from '../utils/secureStorage';
import { useAuthStore } from '../store/authStore';

const APPROVAL_WINDOW_SEC = 120;

// Strong initial burst, then repeat every 15 seconds (not spam)
const INITIAL_VIBRATION = [0, 500, 150, 500, 150, 500];
const REPEAT_VIBRATION  = [0, 300, 100, 300];

const fmt = (sec: number) =>
  `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

const etaLabel = (etaIso: string, createdIso: string) => {
  const mins = Math.round((new Date(etaIso).getTime() - new Date(createdIso).getTime()) / 60000);
  if (mins <= 0) return 'Immediate';
  return mins < 60 ? `${mins} mins` : `${Math.floor(mins / 60)}h ${mins % 60 > 0 ? `${mins % 60}m` : ''}`.trim();
};

type AlertState = 'pending' | 'accepted' | 'rejected' | 'expired' | 'cancelled';

interface BookingDetails {
  id: string;
  totalAmount: number;
  duration: number;
  eta: string;
  createdAt: string;
  status: string;
  parker: { firstName?: string; lastName?: string };
  vehicle: { licensePlate: string; vehicleType: string };
  space: { name: string; ownerId: number };
}

export default function OwnerBookingAlert() {
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.user);

  const [visible, setVisible]     = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [booking, setBooking]     = useState<BookingDetails | null>(null);
  const [loading, setLoading]     = useState(false);
  const [actioning, setActioning] = useState(false);
  const [alertState, setAlertState] = useState<AlertState>('pending');
  const [nowTs, setNowTs]         = useState(Date.now());

  const vibIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const slideAnim      = useRef(new Animated.Value(400)).current;

  // ── Vibration helpers ─────────────────────────────────────────────────
  const stopVibration = useCallback(() => {
    Vibration.cancel();
    if (vibIntervalRef.current) {
      clearInterval(vibIntervalRef.current);
      vibIntervalRef.current = null;
    }
  }, []);

  const startVibration = useCallback(() => {
    Vibration.vibrate(INITIAL_VIBRATION);
    // Repeat every 15 seconds — not every 4
    vibIntervalRef.current = setInterval(() => {
      Vibration.vibrate(REPEAT_VIBRATION);
    }, 15_000);
  }, []);

  // ── Slide-up / slide-down ─────────────────────────────────────────────
  const slideIn = useCallback(() => {
    Animated.spring(slideAnim, {
      toValue: 0, useNativeDriver: true, damping: 14, stiffness: 110,
    }).start();
  }, [slideAnim]);

  const slideOut = useCallback((onDone?: () => void) => {
    Animated.timing(slideAnim, {
      toValue: 400, duration: 280, useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      setBooking(null);
      setBookingId(null);
      setAlertState('pending');
      onDone?.();
    });
  }, [slideAnim]);

  // ── Listen: new booking request ───────────────────────────────────────
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('booking:new', async (payload: any) => {
      const id = String(payload?.bookingId || payload?.id || '');
      if (!id) return;

      setBookingId(id);
      setLoading(true);
      setAlertState('pending');
      setNowTs(Date.now());
      setVisible(true);
      slideAnim.setValue(400); // reset before slide-in

      try {
        const token = await getAuthToken();
        const res   = await fetch(`${API_BASE}/bookings/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        const b: BookingDetails = data.booking || data.data || data;

        if (b.space?.ownerId !== currentUser?.id) {
          setVisible(false);
          return;
        }

        setBooking(b);
        slideIn();
        startVibration();
      } catch {
        setVisible(false);
      } finally {
        setLoading(false);
      }
    });

    return () => sub.remove();
  }, [currentUser?.id, slideAnim, slideIn, startVibration]);

  // ── Listen: parker cancels while modal is open ────────────────────────
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('booking:cancelled', (payload: any) => {
      if (bookingId && String(payload?.bookingId) === bookingId) {
        stopVibration();
        setAlertState('cancelled');
        // Auto-close after 2.5 seconds
        setTimeout(() => slideOut(), 2500);
      }
    });
    return () => sub.remove();
  }, [bookingId, stopVibration, slideOut]);

  // ── Countdown ticker ──────────────────────────────────────────────────
  useEffect(() => {
    if (!visible || alertState !== 'pending') return;
    const t = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(t);
  }, [visible, alertState]);

  const createdAt    = booking?.createdAt ? new Date(booking.createdAt).getTime() : null;
  const elapsedSec   = createdAt ? Math.floor((nowTs - createdAt) / 1000) : 0;
  const remainingSec = Math.max(0, APPROVAL_WINDOW_SEC - elapsedSec);
  const isExpired    = elapsedSec >= APPROVAL_WINDOW_SEC;
  const urgency      = remainingSec < 30 && !isExpired;

  // ── Auto-handle expiry ────────────────────────────────────────────────
  useEffect(() => {
    if (visible && isExpired && alertState === 'pending' && booking) {
      stopVibration();
      setAlertState('expired');
      // Show "Expired" for 2 seconds then close
      setTimeout(() => slideOut(), 2000);
    }
  }, [isExpired, visible, alertState, booking, stopVibration, slideOut]);

  // ── Accept / Reject ───────────────────────────────────────────────────
  const handleAction = async (action: 'accept' | 'decline') => {
    if (!bookingId || isExpired || actioning) return;
    stopVibration();
    try {
      setActioning(true);
      const token = await getAuthToken();
      const res = await fetch(`${API_BASE}/bookings/${bookingId}/${action}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const d = await res.json();
        Alert.alert('Error', typeof d.error === 'object' ? d.error?.message : d.error || 'Action failed');
        return;
      }

      if (action === 'accept') {
        // Show success state for 1.5s then navigate to active bookings
        setAlertState('accepted');
        setTimeout(() => {
          slideOut(() => router.push('/(my-spaces)/active'));
        }, 1500);
      } else {
        setAlertState('rejected');
        setTimeout(() => slideOut(), 1500);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Action failed');
    } finally {
      setActioning(false);
    }
  };

  if (!visible) return null;

  const parkerName = booking
    ? [booking.parker?.firstName, booking.parker?.lastName].filter(Boolean).join(' ') || 'Parker'
    : '';

  // ── Terminal states (accepted / rejected / expired / cancelled) ───────
  if (alertState === 'accepted') {
    return (
      <Modal visible transparent animationType="none">
        <View style={styles.overlay}>
          <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
            <View style={[styles.resultBox, { backgroundColor: '#F0FDF4' }]}>
              <CheckCircle2 size={52} color="#16A34A" />
              <Text style={[styles.resultTitle, { color: '#16A34A' }]}>Booking Accepted!</Text>
              <Text style={styles.resultSub}>Navigating to active bookings…</Text>
            </View>
          </Animated.View>
        </View>
      </Modal>
    );
  }

  if (alertState === 'rejected') {
    return (
      <Modal visible transparent animationType="none">
        <View style={styles.overlay}>
          <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
            <View style={[styles.resultBox, { backgroundColor: '#FEF2F2' }]}>
              <XCircle size={52} color="#DC2626" />
              <Text style={[styles.resultTitle, { color: '#DC2626' }]}>Request Rejected</Text>
              <Text style={styles.resultSub}>Parker has been notified.</Text>
            </View>
          </Animated.View>
        </View>
      </Modal>
    );
  }

  if (alertState === 'expired') {
    return (
      <Modal visible transparent animationType="none">
        <View style={styles.overlay}>
          <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
            <View style={[styles.resultBox, { backgroundColor: '#F1F5F9' }]}>
              <Clock size={52} color="#64748B" />
              <Text style={[styles.resultTitle, { color: '#64748B' }]}>Request Expired</Text>
              <Text style={styles.resultSub}>No response within 2 minutes.</Text>
            </View>
          </Animated.View>
        </View>
      </Modal>
    );
  }

  if (alertState === 'cancelled') {
    return (
      <Modal visible transparent animationType="none">
        <View style={styles.overlay}>
          <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
            <View style={[styles.resultBox, { backgroundColor: '#FEF2F2' }]}>
              <XCircle size={52} color="#64748B" />
              <Text style={[styles.resultTitle, { color: '#64748B' }]}>Booking Cancelled</Text>
              <Text style={styles.resultSub}>Parker cancelled this request.</Text>
            </View>
          </Animated.View>
        </View>
      </Modal>
    );
  }

  // ── Main pending state ────────────────────────────────────────────────
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={() => {}} // ← no dismissal on back button
    >
      {/* No onPress on overlay — prevents accidental dismissal */}
      <View style={styles.overlay}>
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>

          {/* Header */}
          <View style={[styles.header, urgency && styles.headerUrgent]}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerEmoji}>🔔</Text>
              <Text style={styles.headerTitle}>New Booking Request</Text>
            </View>
            <View style={[styles.countdownPill, urgency && styles.countdownPillUrgent]}>
              <Clock size={12} color={urgency ? '#DC2626' : '#D97706'} />
              <Text style={[styles.countdownText, urgency && styles.countdownTextUrgent]}>
                {fmt(remainingSec)}
              </Text>
            </View>
          </View>

          {/* Loading */}
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color="#DC0159" />
              <Text style={styles.loadingText}>Loading request…</Text>
            </View>
          ) : booking ? (
            <>
              {/* Booking details */}
              <View style={styles.details}>
                <View style={styles.detailRow}>
                  <User size={15} color="#64748B" />
                  <Text style={styles.detailLabel}>Parker</Text>
                  <Text style={styles.detailValue}>{parkerName}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Car size={15} color="#64748B" />
                  <Text style={styles.detailLabel}>Vehicle</Text>
                  <Text style={styles.detailValue}>
                    {booking.vehicle?.licensePlate} ({booking.vehicle?.vehicleType})
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <MapPin size={15} color="#64748B" />
                  <Text style={styles.detailLabel}>Space</Text>
                  <Text style={styles.detailValue} numberOfLines={1}>{booking.space?.name}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Clock size={15} color="#64748B" />
                  <Text style={styles.detailLabel}>Arrival In</Text>
                  <Text style={styles.detailValue}>
                    {booking.eta && booking.createdAt
                      ? etaLabel(booking.eta, booking.createdAt)
                      : '-'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabelIndent}>Duration</Text>
                  <Text style={styles.detailValue}>{booking.duration}h</Text>
                </View>
                <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.detailLabelIndent}>Amount</Text>
                  <Text style={[styles.detailValue, { color: '#DC0159', fontWeight: '800', fontSize: 18 }]}>
                    ₹{booking.totalAmount}
                  </Text>
                </View>
              </View>

              {/* Action buttons */}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.rejectBtn}
                  onPress={() => handleAction('decline')}
                  disabled={actioning}
                >
                  {actioning
                    ? <ActivityIndicator color="#DC2626" size="small" />
                    : <Text style={styles.rejectBtnText}>✕  Reject</Text>}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.acceptBtn}
                  onPress={() => handleAction('accept')}
                  disabled={actioning}
                >
                  {actioning
                    ? <ActivityIndicator color="#FFF" size="small" />
                    : <Text style={styles.acceptBtnText}>✓  Accept</Text>}
                </TouchableOpacity>
              </View>
            </>
          ) : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: 40, overflow: 'hidden',
  },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FEF3C7', paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#FDE68A',
  },
  headerUrgent: { backgroundColor: '#FEF2F2', borderBottomColor: '#FECACA' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerEmoji: { fontSize: 20 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  countdownPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FFFFFF', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1, borderColor: '#FDE68A',
  },
  countdownPillUrgent: { borderColor: '#FECACA' },
  countdownText: { fontSize: 14, fontWeight: '800', color: '#D97706' },
  countdownTextUrgent: { color: '#DC2626' },

  // Loading
  loadingWrap: { padding: 40, alignItems: 'center', gap: 12 },
  loadingText: { color: '#64748B', fontSize: 14 },

  // Details
  details: { paddingHorizontal: 20, paddingTop: 14 },
  detailRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  detailLabel: { fontSize: 13, color: '#64748B', fontWeight: '500', flex: 1 },
  detailLabelIndent: { fontSize: 13, color: '#64748B', fontWeight: '500', flex: 1, marginLeft: 25 },
  detailValue: { fontSize: 13, fontWeight: '700', color: '#0F172A', textAlign: 'right', flex: 2 },

  // Actions
  actions: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingTop: 20 },
  rejectBtn: {
    flex: 1, paddingVertical: 16, borderRadius: 14,
    borderWidth: 2, borderColor: '#DC2626', alignItems: 'center',
  },
  rejectBtnText: { fontSize: 16, fontWeight: '700', color: '#DC2626' },
  acceptBtn: {
    flex: 1.5, paddingVertical: 16, borderRadius: 14,
    backgroundColor: '#16A34A', alignItems: 'center',
  },
  acceptBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

  // Terminal state result box
  resultBox: {
    margin: 20, borderRadius: 20, padding: 36,
    alignItems: 'center', gap: 12,
  },
  resultTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  resultSub: { fontSize: 14, color: '#64748B', textAlign: 'center' },
});
