import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  DeviceEventEmitter,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Star } from 'lucide-react-native';
import { api } from '../../services/api';
import { NETWORK_RECONNECTED } from '../../store/networkStore';
import PageHeader from '../../components/PageHeader';
import { formatCount } from '../../utils/ratingUtils';
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
  const [error, setError] = useState<string | null>(null);

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
          setError(null);
        }
      } catch (e) {
        // On the FIRST load, a failure must show error+retry (not a misleading
        // "No reviews yet"). For "more"/"refresh" we keep what we already have.
        if (mode === 'initial' && !data) {
          setError((e as Error)?.message || 'Could not load reviews.');
        }
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

  // Re-fetch when connectivity is restored (offline banner's "Retry" / auto-
  // reconnect) so the reviews aren't left showing stale data.
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(NETWORK_RECONNECTED, () => fetchReviews(1, 'refresh'));
    return () => sub.remove();
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

  // FlatList header — only the "ALL REVIEWS" label sits here so it scrolls with the list
  const Header = total > 0 ? (
    <Text style={styles.sectionLabel}>All Reviews</Text>
  ) : null;

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

      {/* White header section — space name + summary card */}
      <View style={styles.headerSection}>
        <Text style={styles.spaceName} numberOfLines={1}>{spaceName}</Text>

        {!loading && !error && total > 0 && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryLeft}>
              <Text style={styles.avgNumber}>{average.toFixed(1)}</Text>
              {renderStars(Math.round(average), 16)}
              <Text style={styles.totalText}>{formatCount(total)} review{total !== 1 ? 's' : ''}</Text>
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
        )}
      </View>

      {/* Grey scroll area — only the review list */}
      {loading ? (
        <View style={[styles.scroll, styles.center]}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : error ? (
        <View style={[styles.scroll, styles.center]}>
          <Star size={40} color={Colors.error} strokeWidth={1.5} />
          <Text style={styles.emptyTitle}>Couldn't load reviews</Text>
          <Text style={styles.emptySub}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchReviews(1, 'initial')}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          style={styles.scroll}
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
  scroll: { flex: 1, backgroundColor: Colors.screenBg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing['4xl'] },
  retryBtn: { marginTop: Spacing.lg, paddingHorizontal: Spacing['4xl'], paddingVertical: Spacing.lg, backgroundColor: Colors.primaryBg, borderRadius: BorderRadius.lg },
  retryBtnText: { color: Colors.primary, fontWeight: FontWeight.bold, fontSize: FontSize.md },
  listContent: { padding: Spacing.screenH, paddingBottom: Spacing['4xl'] },

  // White header block — space name + summary card, sits above the grey scroll
  headerSection: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.screenH,
    paddingBottom: Spacing.screenH,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  spaceName: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: Spacing.md },

  // Summary card — borderless inside the white section, just a tight inner layout
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: Colors.screenBg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.screenH,
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
