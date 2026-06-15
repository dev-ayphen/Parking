import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Star } from 'lucide-react-native';
import { api } from '../../services/api';
import PageHeader from '../../components/PageHeader';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing } from '../../theme';

interface Review {
  id: number;
  rating: number;
  review: string | null;
  createdAt: string;
  reviewerName: string;
}

interface ReviewsResponse {
  success: boolean;
  average: number;
  total: number;
  breakdown: Record<string, number>;
  reviews: Review[];
  page: number;
  pages: number;
}

const STAR_ROWS = [5, 4, 3, 2, 1] as const;

export default function SpaceReviewsScreen() {
  const params = useLocalSearchParams();
  const spaceId = params.spaceId as string;
  const spaceName = (params.spaceName as string) || 'Reviews';

  const [data, setData] = useState<ReviewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);

  const fetchReviews = useCallback(
    async (pageNum: number, mode: 'initial' | 'refresh' | 'more') => {
      try {
        if (mode === 'refresh') setRefreshing(true);
        else if (mode === 'more') setLoadingMore(true);
        else setLoading(true);

        const json: ReviewsResponse = await api.get(`/spaces/${spaceId}/reviews?page=${pageNum}&limit=20`);
        if (json.success) {
          setData((prev) =>
            mode === 'more' && prev
              ? { ...json, reviews: [...prev.reviews, ...json.reviews] }
              : json,
          );
          setPage(json.page);
        }
      } catch {
        // keep whatever we have; surface nothing intrusive on a reviews list
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [spaceId],
  );

  useEffect(() => {
    fetchReviews(1, 'initial');
  }, [fetchReviews]);

  const handleLoadMore = () => {
    if (!loadingMore && data && page < data.pages) {
      fetchReviews(page + 1, 'more');
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const renderStars = (value: number, size = 14) => (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={size}
          color={s <= value ? Colors.starYellow : Colors.borderLight}
          fill={s <= value ? Colors.starYellow : 'transparent'}
          strokeWidth={1.5}
        />
      ))}
    </View>
  );

  const total = data?.total ?? 0;
  const average = data?.average ?? 0;
  const breakdown = data?.breakdown ?? {};

  const Header = (
    <View>
      <Text style={styles.spaceName} numberOfLines={1}>{spaceName}</Text>

      {total > 0 ? (
        <>
          {/* Summary card — big average + star breakdown histogram */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryLeft}>
              <Text style={styles.avgNumber}>{average.toFixed(1)}</Text>
              {renderStars(Math.round(average), 16)}
              <Text style={styles.totalText}>{total} review{total !== 1 ? 's' : ''}</Text>
            </View>

            <View style={styles.summaryRight}>
              {STAR_ROWS.map((star) => {
                const count = breakdown[String(star)] || 0;
                const pct = total > 0 ? (count / total) * 100 : 0;
                return (
                  <View key={star} style={styles.breakdownRow}>
                    <Text style={styles.breakdownStar}>{star}</Text>
                    <Star size={11} color={Colors.starYellow} fill={Colors.starYellow} />
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${pct}%` }]} />
                    </View>
                    <Text style={styles.breakdownCount}>{count}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          <Text style={styles.sectionLabel}>All Reviews</Text>
        </>
      ) : (
        // New space — no ratings yet. Cleaner than an all-zero histogram.
        <View style={styles.newBadgeRow}>
          <View style={styles.newBadge}>
            <Star size={13} color={Colors.info} fill={Colors.info} />
            <Text style={styles.newBadgeText}>New</Text>
          </View>
        </View>
      )}
    </View>
  );

  const renderReview = ({ item }: { item: Review }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(item.reviewerName || 'P').charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.reviewerName}>{item.reviewerName}</Text>
          <Text style={styles.reviewDate}>{formatDate(item.createdAt)}</Text>
        </View>
        {renderStars(item.rating, 13)}
      </View>
      {!!item.review && <Text style={styles.reviewText}>{item.review}</Text>}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <PageHeader title="Reviews" />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={data?.reviews || []}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderReview}
          ListHeaderComponent={Header}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Star size={36} color={Colors.borderLight} strokeWidth={1.5} />
              <Text style={styles.emptyTitle}>No reviews yet</Text>
              <Text style={styles.emptySub}>Be the first parker to review this space.</Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchReviews(1, 'refresh')} tintColor={Colors.primary} />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? <ActivityIndicator color={Colors.primary} style={{ marginVertical: Spacing.xl }} /> : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: Spacing.screenH, paddingBottom: Spacing['4xl'] },

  spaceName: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: Spacing.lg },

  // New-space header (shown instead of the histogram when there are 0 reviews)
  newBadgeRow: { marginBottom: Spacing.xl },
  newBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.xs,
    backgroundColor: '#EFF6FF', // blue-50
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.circleXl,
  },
  newBadgeText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.info },

  // Summary card
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: Colors.screenBg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing.screenH,
    marginBottom: Spacing['2xl'],
  },
  summaryLeft: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: Spacing.screenH,
    borderRightWidth: 1,
    borderRightColor: Colors.borderLight,
  },
  avgNumber: { fontSize: 40, fontWeight: FontWeight.black, color: Colors.textPrimary, lineHeight: 44 },
  starsRow: { flexDirection: 'row', gap: 2, marginTop: Spacing.xs },
  totalText: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: Spacing.sm, fontWeight: FontWeight.medium },

  summaryRight: { flex: 1, justifyContent: 'center', paddingLeft: Spacing.screenH, gap: 5 },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  breakdownStar: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: FontWeight.semibold, width: 8 },
  barTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: Colors.borderLight, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3, backgroundColor: Colors.starYellow },
  breakdownCount: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: FontWeight.medium, width: 22, textAlign: 'right' },

  sectionLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.lg,
  },

  // Review card
  reviewCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing.screenH,
    marginBottom: Spacing.lg,
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.primary },
  reviewerName: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  reviewDate: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 1 },
  reviewText: { fontSize: FontSize.base, color: Colors.textBody, lineHeight: 20, marginTop: Spacing.md },

  // Empty
  emptyBox: { alignItems: 'center', paddingVertical: Spacing['6xl'], gap: Spacing.md },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  emptySub: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', paddingHorizontal: Spacing['4xl'] },
});
