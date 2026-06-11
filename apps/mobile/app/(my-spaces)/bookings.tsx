import React, { useState, useCallback, useEffect } from 'react';
import {View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronRight, Star } from 'lucide-react-native';
import PageHeader from '../../components/PageHeader';
import NoBookingSvg from '../../components/Illustrations/NoBookingSvg';
import { api } from '../../services/api';
import { getRatingStyle } from '../../utils/ratingUtils';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing } from '../../theme';

const BookingsScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const spaceId = params.spaceId as string;
  const spaceName = params.spaceName as string || 'Space Bookings';

  const [expandedSessions, setExpandedSessions] = useState<number[]>([]);
  const [activeFilter, setActiveFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);

  const fetchBookings = useCallback(async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      if (!spaceId) return;

      const data = await api.get(`/spaces/${spaceId}/bookings`);
      setBookings(Array.isArray(data) ? data : data.bookings || []);
    } catch (e) {
      console.error('Bookings fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [spaceId]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const filters = ['All', 'Upcoming', 'Completed', 'Cancelled'];

  const filteredBookings = bookings.filter(b => activeFilter === 'All' || b.status === activeFilter);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <PageHeader title="Bookings" onBack={() => router.back()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <PageHeader title="Bookings" onBack={() => router.back()} />

      {/* Filter Pills */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.md, paddingHorizontal: Spacing['3xl'] }}>
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[styles.filterPill, activeFilter === filter && styles.filterPillActive]}
              onPress={() => setActiveFilter(filter)}
            >
              <Text style={[styles.filterText, activeFilter === filter && styles.filterTextActive]}>{filter}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchBookings(true)} tintColor={Colors.primary} />}
      >
        {filteredBookings.map((session, idx) => {
          const isExpanded = expandedSessions.includes(idx);
          return (
            <View key={session.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.avatarWrapper, { backgroundColor: session.avatarBg }]}>
                  <Text style={[styles.avatarText, { color: session.avatarColor }]}>{session.initials}</Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>{session.name}</Text>
                  <Text style={styles.cardDate}>{session.date}</Text>
                </View>
                <Text style={styles.cardAmount}>{session.amount}</Text>
                <TouchableOpacity
                  onPress={() => setExpandedSessions(prev =>
                    prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
                  )}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <View style={styles.expandButton}>
                    <ChevronRight size={15} color={Colors.textSecondary} style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }} />
                  </View>
                </TouchableOpacity>
              </View>

              {isExpanded && (
                <View style={styles.expandedContent}>
                  <View style={styles.divider} />
                  <View style={styles.detailsGrid}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Status</Text>
                      <Text style={[styles.detailValue, { color: session.status === 'Upcoming' ? Colors.warning : Colors.successAlt }]}>{session.status}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Duration</Text>
                      <Text style={styles.detailValue}>{session.duration}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Phone</Text>
                      <Text style={styles.detailValue}>{session.phone}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Booking ID</Text>
                      <Text style={[styles.detailValue, { color: Colors.textSecondary }]}>{session.id}</Text>
                    </View>
                  </View>

                  {session.rating > 0 && (
                    <View style={styles.ratingBox}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: getRatingStyle(session.rating).bgColor, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.micro, borderRadius: BorderRadius.xs }}>
                        {!getRatingStyle(session.rating).isNew && (
                          <Star size={13} color={getRatingStyle(session.rating).iconColor} fill={getRatingStyle(session.rating).iconColor} style={{ marginRight: 4 }} />
                        )}
                        <Text style={{ color: getRatingStyle(session.rating).textColor, fontSize: FontSize.sm, fontWeight: FontWeight.bold }}>
                          {getRatingStyle(session.rating).label}
                        </Text>
                      </View>
                      <Text style={styles.reviewText}>{session.review}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        })}
        {filteredBookings.length === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrapper}>
              <NoBookingSvg width={100} height={80} primaryColor={Colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>
              {activeFilter === 'All' ? 'No Bookings Yet' : `No ${activeFilter} Bookings`}
            </Text>
            <Text style={styles.emptyDescription}>
              {activeFilter === 'Upcoming' && 'You don\'t have any upcoming bookings.'}
              {activeFilter === 'Completed' && 'Your completed bookings will appear here.'}
              {activeFilter === 'Cancelled' && 'No cancelled bookings found.'}
              {activeFilter === 'All' && 'When parkers book your space, they\'ll appear here.'}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.screenBg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.screenBg,
  },
  filterContainer: {
    backgroundColor: Colors.white,
    paddingVertical: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBg,
  },
  filterPill: {
    paddingHorizontal: Spacing['3xl'],
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.circleXl,            // 20 = circleXl ✓
    backgroundColor: Colors.surfaceBg,
  },
  filterPillActive: {
    backgroundColor: Colors.textPrimary,
  },
  filterText: {
    fontSize: FontSize.base,                        // 13 = base ✓
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  filterTextActive: {
    color: Colors.white,
  },
  content: {
    padding: Spacing['3xl'],
    paddingBottom: Spacing['7xl'],
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,                  // 16 = lg ✓
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing['2xl'],
  },
  avatarWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: FontSize.base,                        // 13 = base ✓
    fontWeight: FontWeight.bold,
  },
  cardInfo: {
    flex: 1,
    marginLeft: Spacing.lg,
  },
  cardName: {
    fontSize: FontSize.md,                          // 14 = md ✓
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  cardDate: {
    fontSize: FontSize.xs,                          // 11 = xs ✓
    color: Colors.textSecondary,
    marginTop: Spacing.micro,
  },
  cardAmount: {
    fontSize: FontSize.lg,                          // 15 = lg ✓
    fontWeight: FontWeight.extrabold,
    color: Colors.successAlt,
    marginRight: Spacing.lg,
  },
  expandButton: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.button,              // 14 = button ✓
    backgroundColor: Colors.surfaceBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandedContent: {
    paddingHorizontal: Spacing['2xl'],
    paddingBottom: Spacing['2xl'],
  },
  divider: {
    height: 1,
    backgroundColor: Colors.surfaceBg,
    marginBottom: Spacing.xl,
  },
  detailsGrid: {
    gap: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: FontSize.base,                        // 13 = base ✓
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: FontSize.base,                        // 13 = base ✓
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xl,
    backgroundColor: Colors.inputBg,                // '#FAFAFA' ✓
    borderRadius: BorderRadius.sm,                  // 8 = sm ✓
    padding: Spacing.lg,
  },
  starsRow: {
    flexDirection: 'row',
    gap: Spacing.micro,
  },
  reviewText: {
    fontSize: FontSize.sm,                          // 12 = sm ✓
    color: Colors.textBody,
    marginLeft: Spacing.md,
    fontStyle: 'italic',
    flex: 1,
  },
  emptyState: {
    paddingVertical: 60,
    paddingHorizontal: Spacing['4xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surfaceBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.screenH,
  },
  emptyTitle: {
    fontSize: FontSize['2xl'],                      // 18 = 2xl ✓
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: FontSize.md,                          // 14 = md ✓
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: FontWeight.medium,
  }
});

export default BookingsScreen;
