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
import { CheckCircle2, Star } from 'lucide-react-native';
import { api } from '../../services/api';
import PageHeader from '../../components/PageHeader';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, ExtendedColors } from '../../theme';

export default function SessionCompleteScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const bookingId = params.bookingId as string;

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  const fetchBooking = useCallback(async () => {
    try {
      const data = await api.get(`/bookings/${bookingId}`);
      const booking = data.booking || data.data || data;
      setBooking(booking);
      // Pre-fill rating if it already exists
      if (booking?.rating) {
        setRating(booking.rating.rating || 0);
        setReview(booking.rating.review || '');
        setRatingSubmitted(true);
      }
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

  const handleSubmitRating = async () => {
    if (rating === 0) {
      Alert.alert('Required', 'Please select a star rating.');
      return;
    }
    try {
      setSubmittingRating(true);
      await api.post('/ratings', {
        bookingId,
        rating,
        review: review.trim() || undefined,
      });
      setRatingSubmitted(true);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSubmittingRating(false);
    }
  };

  const formatTime = (iso: string) => {
    if (!iso) return 'N/A';
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      </SafeAreaView>
    );
  }

  if (error || !booking) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.errorText}>{error || 'Booking not found'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchBooking}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <PageHeader title="Session Complete" />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.contentInner}>
        {/* Success Header */}
        <View style={styles.successHeader}>
          <CheckCircle2 size={64} color={Colors.success} strokeWidth={1.5} />
          <Text style={styles.successTitle}>Session Completed</Text>
          <Text style={styles.successSub}>Thanks for parking with ParkSwift.</Text>
        </View>

        {/* Receipt Card */}
        <View style={styles.receiptCard}>
          <Text style={styles.receiptSpaceName}>{booking.space?.name}</Text>
          <Text style={styles.receiptAddress}>{booking.space?.address}</Text>

          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Vehicle</Text>
            <Text style={styles.receiptVal}>{booking.vehicle?.licensePlate}</Text>
          </View>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Entry Time</Text>
            <Text style={styles.receiptVal}>{formatTime(booking.sessionStartedAt)}</Text>
          </View>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Exit Time</Text>
            <Text style={styles.receiptVal}>{formatTime(booking.exitTime || booking.sessionEndedAt)}</Text>
          </View>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Duration</Text>
            <Text style={styles.receiptVal}>{booking.duration} hr(s)</Text>
          </View>

          <View style={styles.receiptTotalRow}>
            <Text style={styles.receiptTotalLabel}>Total Amount</Text>
            <Text style={styles.receiptTotalVal}>₹{booking.totalAmount}</Text>
          </View>
        </View>

        {/* Rating Card */}
        <View style={styles.ratingCard}>
          {ratingSubmitted ? (
            <View style={styles.ratingSuccess}>
              <CheckCircle2 size={24} color={Colors.success} />
              <View>
                <Text style={styles.ratingSuccessText}>Thanks for your feedback!</Text>
                {booking?.rating && (
                  <>
                    <View style={styles.submittedStarsContainer}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={24}
                          color={star <= booking.rating.rating ? Colors.amber : Colors.borderLight}
                          fill={star <= booking.rating.rating ? Colors.starYellow : 'transparent'}
                          strokeWidth={1.5}
                        />
                      ))}
                    </View>
                    {booking.rating.review && (
                      <Text style={styles.submittedReviewText}>"{booking.rating.review}"</Text>
                    )}
                  </>
                )}
              </View>
            </View>
          ) : (
            <>
              <Text style={styles.ratingTitle}>Rate your experience</Text>
              <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity key={star} onPress={() => setRating(star)} activeOpacity={0.7}>
                    <Star
                      size={36}
                      color={star <= rating ? Colors.starYellow : Colors.borderLight}
                      fill={star <= rating ? Colors.starYellow : 'transparent'}
                      strokeWidth={1.5}
                    />
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={styles.reviewInput}
                placeholder="Add a comment..."
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={3}
                value={review}
                onChangeText={setReview}
              />
              <TouchableOpacity
                style={styles.btnSecondary}
                onPress={handleSubmitRating}
                disabled={submittingRating || rating === 0}
              >
                {submittingRating ? <ActivityIndicator color={Colors.primary} /> : <Text style={styles.btnSecondaryText}>Submit Rating</Text>}
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>

      {/* Sticky Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.btnPrimary} onPress={() => router.replace('/(home)')}>
          <Text style={styles.btnPrimaryText}>Done</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: Colors.error, marginBottom: Spacing.lg },
  retryBtn: { padding: Spacing.lg, backgroundColor: Colors.errorLight, borderRadius: BorderRadius.sm },
  retryBtnText: { color: Colors.error, fontWeight: FontWeight.semibold },
  content: { flex: 1 },
  contentInner: { padding: Spacing.screenH, paddingBottom: Spacing.lg },

  successHeader: { alignItems: 'center', marginTop: Spacing.screenH, marginBottom: Spacing['5xl'] },
  successTitle: { fontSize: FontSize['4xl'], fontWeight: FontWeight.black, color: Colors.textPrimary, marginTop: Spacing['3xl'], marginBottom: Spacing.md },
  successSub: { fontSize: FontSize.base, color: Colors.textSecondary },

  receiptCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing['4xl'],
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: Spacing.screenH,
  },
  receiptSpaceName: { fontSize: FontSize['2xl'], fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: Spacing.xs },
  receiptAddress: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.screenH },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.lg },
  receiptLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  receiptVal: { fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: FontWeight.semibold },
  receiptTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing['3xl'],
    paddingTop: Spacing['3xl'],
    borderTopWidth: 1,
    borderTopColor: Colors.borderLighter,
    borderStyle: 'dashed',
  },
  receiptTotalLabel: { fontSize: FontSize.lg, color: Colors.textPrimary, fontWeight: FontWeight.bold },
  receiptTotalVal: { fontSize: FontSize['4xl'], color: Colors.primary, fontWeight: FontWeight.black },

  ratingCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.screenH,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  ratingTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary, textAlign: 'center', marginBottom: Spacing['3xl'] },
  starsContainer: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.lg, marginBottom: Spacing.screenH },
  reviewInput: {
    backgroundColor: Colors.screenBg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: Spacing['3xl'],
  },
  btnSecondary: {
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing['2xl'],
    alignItems: 'center',
  },
  btnSecondaryText: { color: Colors.primary, fontSize: FontSize.base, fontWeight: FontWeight.bold },

  ratingSuccess: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.lg, paddingVertical: Spacing.screenH },
  ratingSuccessText: { color: Colors.success, fontSize: FontSize.lg, fontWeight: FontWeight.bold, marginBottom: Spacing.md },
  submittedStarsContainer: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  submittedReviewText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontStyle: 'italic', marginTop: Spacing.md },

  footer: { padding: Spacing.screenH, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  btnPrimary: { backgroundColor: Colors.primary, borderRadius: BorderRadius.xl, paddingVertical: Spacing['3xl'], alignItems: 'center' },
  btnPrimaryText: { color: Colors.white, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
});
