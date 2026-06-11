import React, { useState, useCallback } from 'react';
import {View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Car, Clock, MapPin, ChevronRight } from 'lucide-react-native';
import { useFocusEffect } from 'expo-router';
import PageHeader from '../../components/PageHeader';
import NoSessionsSvg from '../../components/Illustrations/NoSessionsSvg';
import { api } from '../../services/api';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing } from '../../theme';

interface LiveSession {
  id: string;
  parker: string;
  vehicle: string;
  space: string;
  startTime: string;
  endTime: string;
  remaining: string;
  progressPercent: number;
  isLeaving?: boolean;
}

const LiveSessionsScreen = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<LiveSession[]>([]);

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      const json = await api.get('/bookings/live-sessions');
      if (json.success) {
        setSessions(json.sessions || []);
      }
    } catch (e) {
      if (__DEV__) console.log('[LIVE_SESSIONS] error', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchSessions(); }, [fetchSessions]));

  const liveBadge = (
    <View style={styles.liveBadge}>
      <View style={styles.liveDot} />
      <Text style={styles.liveText}>{sessions.length} Active</Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <PageHeader title="Live Sessions" onBack={() => router.back()} right={liveBadge} />
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
      <PageHeader title="Live Sessions" onBack={() => router.back()} right={liveBadge} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {sessions.map((session) => {
          const isAlmostDone = session.progressPercent >= 80;
          const progressColor = isAlmostDone ? Colors.errorAlt : Colors.successAlt;

          return (
            <TouchableOpacity key={session.id} style={styles.sessionCard} activeOpacity={0.85}>
              <View style={[styles.leftIndicator, { backgroundColor: progressColor }]} />
              <View style={styles.cardContent}>
                {/* Top Row: Avatar + Name + Status */}
                <View style={styles.cardTop}>
                  <View style={[styles.avatarWrapper, { backgroundColor: Colors.successBgAlt }]}>
                    <Car size={16} color={Colors.successAlt} />
                  </View>
                  <View style={styles.cardTopInfo}>
                    <View style={styles.nameRow}>
                      <Text style={styles.parkerName}>{session.parker}</Text>
                      <View style={styles.activeDotWrapper}>
                        <View style={[styles.activeDot, { backgroundColor: progressColor }]} />
                      </View>
                    </View>
                    <View style={styles.locationRow}>
                      <MapPin size={11} color={Colors.textSecondary} />
                      <Text style={styles.spaceName}>{session.space}</Text>
                    </View>
                  </View>
                  <View style={styles.remainingBadge}>
                    <Clock size={11} color={progressColor} />
                    <Text style={[styles.remainingText, { color: progressColor }]}>{session.remaining}</Text>
                  </View>
                </View>

                {/* Progress Bar */}
                <View style={styles.progressBg}>
                  <View style={[styles.progressFill, { width: `${session.progressPercent}%` as any, backgroundColor: progressColor }]} />
                </View>
                <View style={styles.timeRow}>
                  <Text style={styles.timeText}>Start: {session.startTime}</Text>
                  <Text style={styles.timeText}>End: {session.endTime}</Text>
                </View>

                {/* Bottom Row: Vehicle + Track */}
                <View style={styles.cardBottom}>
                  <Text style={styles.vehicleText}>{session.vehicle}</Text>
                  <TouchableOpacity style={styles.trackBtn}>
                    <Text style={styles.trackBtnText}>Track</Text>
                    <ChevronRight size={13} color={Colors.primary} strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

        {sessions.length === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrapper}>
              <NoSessionsSvg width={100} height={80} primaryColor={Colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No Active Sessions</Text>
            <Text style={styles.emptyDescription}>
              When parkers are currently parked in your spaces, they'll appear here in real-time.
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
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
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.successBgAlt,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 5,
    borderRadius: BorderRadius.circleXl,            // 20 = circleXl ✓
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: BorderRadius.indicator,           // 3 = indicator ✓
    backgroundColor: Colors.successAlt,
  },
  liveText: {
    fontSize: FontSize.sm,                          // 12 = sm ✓
    fontWeight: FontWeight.bold,
    color: Colors.successAlt,
  },
  content: {
    padding: Spacing['3xl'],
  },
  sessionCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,                  // 16 = lg ✓
    marginBottom: Spacing['2xl'],
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: Colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  leftIndicator: {
    width: 4,
  },
  cardContent: {
    flex: 1,
    padding: Spacing['2xl'],
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  avatarWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.lg,
  },
  cardTopInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.micro,
  },
  parkerName: {
    fontSize: FontSize.md,                          // 14 = md ✓
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  activeDotWrapper: {
    marginTop: 1,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: BorderRadius.indicator,           // 3 = indicator ✓
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  spaceName: {
    fontSize: FontSize.sm,                          // 12 = sm ✓
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  remainingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  remainingText: {
    fontSize: FontSize.sm,                          // 12 = sm ✓
    fontWeight: FontWeight.bold,
  },
  progressBg: {
    height: 5,
    backgroundColor: Colors.surfaceBg,
    borderRadius: BorderRadius.indicator,           // 3 = indicator ✓
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: BorderRadius.indicator,           // 3 = indicator ✓
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  timeText: {
    fontSize: FontSize.xs,                          // 11 = xs ✓
    color: Colors.textMuted,
    fontWeight: FontWeight.medium,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBg,
    paddingTop: Spacing.lg,
  },
  vehicleText: {
    fontSize: FontSize.base,                        // 13 = base ✓
    fontWeight: FontWeight.semibold,
    color: Colors.textDark,
  },
  trackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.micro,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 5,
    borderRadius: BorderRadius.circleXl,            // 20 = circleXl ✓
  },
  trackBtnText: {
    fontSize: FontSize.sm,                          // 12 = sm ✓
    fontWeight: FontWeight.bold,
    color: Colors.primary,
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
  },
});

export default LiveSessionsScreen;
