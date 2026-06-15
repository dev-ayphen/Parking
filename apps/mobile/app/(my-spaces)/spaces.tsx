import React, { useState, useCallback } from 'react';
import {View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  ActivityIndicator,
  Alert} from 'react-native';
import { toast } from '../../utils/toast';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Plus, MapPin, Edit3, Trash2, Clock, CheckCircle, XCircle, AlertTriangle, Car, IndianRupee, BarChart3 } from 'lucide-react-native';
import { PageHeader } from '../../components';
import { api } from '../../services/api';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, ExtendedColors } from '../../theme';

type SpaceStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'BLOCKED';

type SpaceTab = 'Active' | 'Pending' | 'Rejected';

// Which backend statuses fall under each tab (BLOCKED grouped with Rejected so it's never hidden)
const TAB_STATUSES: Record<SpaceTab, SpaceStatus[]> = {
  Active: ['VERIFIED'],
  Pending: ['PENDING'],
  Rejected: ['REJECTED', 'BLOCKED'],
};
const SPACE_TABS: SpaceTab[] = ['Active', 'Pending', 'Rejected'];

interface MySpace {
  id: number;
  name: string;
  address: string;
  spaceType: string;
  parkingFor: string;
  capacity: number;
  hourlyRate: number;
  dailyRate: number | null;
  availability: string;
  status: SpaceStatus;
  amenities: string[];
  bookingsCount: number;
  createdAt: string;
  rejectionReason?: string;
}

export default function MySpacesListScreen() {
  const router = useRouter();
  const [spaces, setSpaces] = useState<MySpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<SpaceTab>('Active');

  const fetchSpaces = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const json = await api.get('/spaces/my');

      const list: any[] = Array.isArray(json) ? json : (json.data ?? json.spaces ?? []);

      const mapped: MySpace[] = list.map((s) => ({
        id: s.id,
        name: s.name,
        address: s.address,
        spaceType: s.spaceType,
        parkingFor: s.parkingFor,
        capacity: s.capacity,
        hourlyRate: s.hourlyRate,
        dailyRate: s.dailyRate,
        availability: s.availability,
        status: s.status,
        amenities: s.amenities || [],
        bookingsCount: s._count?.bookings ?? 0,
        createdAt: s.createdAt,
        rejectionReason: s.rejectionReason,
      }));

      setSpaces(mapped);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Refresh every time screen is focused (picks up newly added spaces)
  useFocusEffect(
    useCallback(() => {
      fetchSpaces();
    }, [fetchSpaces])
  );

  const handleDelete = (space: MySpace) => {
    Alert.alert(
      'Delete Space',
      `Are you sure you want to delete "${space.name}"?\n\nThis action cannot be undone. The space will be removed and any future bookings will be cancelled.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => confirmDelete(space.id),
        },
      ]
    );
  };

  const confirmDelete = async (spaceId: number) => {
    try {
      setDeletingId(spaceId);
      await api.delete(`/spaces/${spaceId}`);

      // Remove from local list immediately
      setSpaces((prev) => prev.filter((s) => s.id !== spaceId));
      toast.success('Space deleted successfully.');
    } catch (e) {
      toast.error((e as Error).message || 'Failed to delete space.');
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusBadge = (status: SpaceStatus) => {
    switch (status) {
      case 'VERIFIED':
        return { icon: <CheckCircle size={13} color={Colors.success} />, text: 'Verified', color: Colors.success, bg: Colors.successBg };
      case 'PENDING':
        return { icon: <Clock size={13} color={Colors.warningAlt} />, text: 'Pending Review', color: Colors.warning, bg: Colors.warningBgAlt };
      case 'REJECTED':
        return { icon: <XCircle size={13} color={Colors.error} />, text: 'Rejected', color: Colors.error, bg: Colors.errorBg };
      case 'BLOCKED':
        return { icon: <AlertTriangle size={13} color={Colors.textBody} />, text: 'Blocked', color: Colors.textBody, bg: Colors.surfaceBg };
      default:
        return { icon: <Clock size={13} color={Colors.textMuted} />, text: status, color: Colors.textMuted, bg: Colors.screenBg };
    }
  };

  const renderSpaceCard = ({ item }: { item: MySpace }) => {
    const badge = getStatusBadge(item.status);
    const isDeleting = deletingId === item.id;

    return (
      <View style={styles.card}>
        {/* Header row */}
        <View style={styles.cardHeader}>
          <View style={styles.spaceIconBox}>
            <MapPin size={22} color={Colors.primary} />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.spaceName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.spaceAddress} numberOfLines={1}>{item.address}</Text>
            <View style={[styles.badgeRow, { backgroundColor: badge.bg }]}>
              {badge.icon}
              <Text style={[styles.badgeText, { color: badge.color }]}>{badge.text}</Text>
            </View>
          </View>
        </View>

        {/* Rejection reason (always shown for REJECTED — admin's reason, or a fallback) */}
        {item.status === 'REJECTED' && (
          <View style={styles.rejectionBox}>
            <AlertTriangle size={14} color={Colors.error} />
            <Text style={styles.rejectionText}>
              {item.rejectionReason?.trim() || 'No reason provided by the admin.'}
            </Text>
          </View>
        )}

        {/* Meta chips */}
        <View style={styles.metaRow}>
          <View style={styles.metaChip}>
            <Car size={12} color={Colors.textSecondary} />
            <Text style={styles.metaChipText}>{item.parkingFor}</Text>
          </View>
          <View style={styles.metaChip}>
            <IndianRupee size={12} color={Colors.textSecondary} />
            <Text style={styles.metaChipText}>₹{item.hourlyRate}/hr</Text>
          </View>
          <View style={styles.metaChip}>
            <Clock size={12} color={Colors.textSecondary} />
            <Text style={styles.metaChipText}>{item.availability}</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total Bookings</Text>
            <Text style={styles.statValue}>{item.bookingsCount}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Capacity</Text>
            <Text style={styles.statValue}>{item.capacity} spot{item.capacity !== 1 ? 's' : ''}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Space Type</Text>
            <Text style={styles.statValue} numberOfLines={1}>{item.spaceType.split(' ')[0]}</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push(`/add-space?edit=${item.id}`)}
          >
            <Edit3 size={16} color={item.status === 'REJECTED' ? Colors.primary : Colors.textDark} />
            <Text style={[styles.actionBtnText, item.status === 'REJECTED' && { color: Colors.primary }]}>
              {item.status === 'REJECTED' ? 'Edit & Resubmit' : 'Edit'}
            </Text>
          </TouchableOpacity>

          {/* Analytics — only meaningful once a space is live */}
          {item.status === 'VERIFIED' && (
            <>
              <View style={styles.actionDivider} />
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => router.push({ pathname: '/(my-spaces)/analytics', params: { spaceId: String(item.id), spaceName: item.name } })}
              >
                <BarChart3 size={16} color={Colors.textDark} />
                <Text style={styles.actionBtnText}>Analytics</Text>
              </TouchableOpacity>
            </>
          )}

          <View style={styles.actionDivider} />

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleDelete(item)}
            disabled={isDeleting}
          >
            {isDeleting
              ? <ActivityIndicator size="small" color={Colors.error} />
              : <Trash2 size={16} color={Colors.error} />
            }
            <Text style={[styles.actionBtnText, { color: Colors.error }]}>
              {isDeleting ? '...' : 'Delete'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        <PageHeader
          title="My Spaces"
          right={
            <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/add-space')}>
              <Plus size={20} color={Colors.primary} strokeWidth={2.5} />
            </TouchableOpacity>
          }
        />
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading your spaces...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        <PageHeader title="My Spaces" />
        <View style={styles.centerBox}>
          <XCircle size={48} color={Colors.errorAlt} strokeWidth={1.5} />
          <Text style={styles.errorTitle}>Failed to load</Text>
          <Text style={styles.errorMsg}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchSpaces()}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Count per tab + the list for the active tab
  const tabCounts: Record<SpaceTab, number> = {
    Active: spaces.filter((s) => TAB_STATUSES.Active.includes(s.status)).length,
    Pending: spaces.filter((s) => TAB_STATUSES.Pending.includes(s.status)).length,
    Rejected: spaces.filter((s) => TAB_STATUSES.Rejected.includes(s.status)).length,
  };
  const filteredSpaces = spaces.filter((s) => TAB_STATUSES[tab].includes(s.status));

  const emptyCopy: Record<SpaceTab, { title: string; subtitle: string }> = {
    Active: { title: 'No active spaces', subtitle: 'Verified spaces that are live for booking will appear here.' },
    Pending: { title: 'Nothing pending', subtitle: 'Spaces waiting for admin approval will appear here.' },
    Rejected: { title: 'No rejected spaces', subtitle: 'Rejected spaces you can fix and resubmit will appear here.' },
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <PageHeader
        title="My Spaces"
        right={
          <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/add-space')}>
            <Plus size={20} color={Colors.primary} strokeWidth={2.5} />
          </TouchableOpacity>
        }
      />

      {/* Status filter tabs */}
      <View style={styles.tabsContainer}>
        {SPACE_TABS.map((t) => {
          const active = tab === t;
          return (
            <TouchableOpacity key={t} style={[styles.tab, active && styles.activeTab]} onPress={() => setTab(t)} activeOpacity={0.7}>
              <Text style={[styles.tabText, active && styles.activeTabText]}>
                {t} {tabCounts[t] > 0 ? `(${tabCounts[t]})` : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        style={{ backgroundColor: Colors.screenBg }}
        data={filteredSpaces}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderSpaceCard}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchSpaces(true)}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <MapPin size={52} color={Colors.borderMuted} strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>{emptyCopy[tab].title}</Text>
            <Text style={styles.emptySubtitle}>{emptyCopy[tab].subtitle}</Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => router.push('/add-space')}
            >
              <Text style={styles.emptyBtnText}>+ Add a Space</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.white },
  addBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center',
  },
  tabsContainer: {
    flexDirection: 'row', backgroundColor: Colors.white,
    paddingHorizontal: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBg,
  },
  tab: {
    flex: 1, paddingVertical: Spacing['2xl'], alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  activeTab: { borderBottomColor: Colors.primary },
  tabText: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textSecondary },  // 14 = md ✓
  activeTabText: { color: Colors.primary },
  listContent: {
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: 100,
  },
  card: {
    backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing['3xl'],  // 16 = lg ✓
    marginBottom: Spacing['2xl'], borderWidth: 1, borderColor: Colors.surfaceBg,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', marginBottom: Spacing.xl, gap: Spacing.xl },
  spaceIconBox: {
    width: 52, height: 52, borderRadius: BorderRadius.button,  // 14 = button ✓
    backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  headerInfo: { flex: 1 },
  spaceName: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: 3 },  // 15 = lg ✓
  spaceAddress: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.sm },  // 12 = sm ✓
  badgeRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    paddingHorizontal: Spacing.md, paddingVertical: 3, borderRadius: BorderRadius.input, alignSelf: 'flex-start',  // 10 = input ✓
  },
  badgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },  // 11 = xs ✓
  rejectionBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md,
    backgroundColor: Colors.errorBg, borderColor: ExtendedColors.redBorder, borderWidth: 1,  // '#FECACA' ✓
    borderRadius: BorderRadius.input, padding: Spacing.lg, marginBottom: Spacing.xl,  // 10 = input ✓
  },
  rejectionText: { fontSize: FontSize.sm, color: Colors.error, fontWeight: FontWeight.medium, flex: 1, lineHeight: 18 },  // 12 = sm ✓
  metaRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl, flexWrap: 'wrap' },
  metaChip: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    backgroundColor: Colors.screenBg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: Colors.border,  // 8 = sm ✓
  },
  metaChipText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.textBody },  // 11 = xs ✓
  statsRow: {
    flexDirection: 'row', backgroundColor: Colors.screenBg,
    borderRadius: BorderRadius.input, padding: Spacing.lg, marginBottom: Spacing['2xl'],  // 10 = input ✓
  },
  statBox: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: Colors.border, marginVertical: Spacing.micro },
  statLabel: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: FontWeight.medium, marginBottom: 3 },  // 11 = xs ✓
  statValue: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },  // 15 = lg ✓
  actionsRow: {
    flexDirection: 'row', borderTopWidth: 1,
    borderTopColor: Colors.surfaceBg, paddingTop: Spacing.xl,
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm,
  },
  actionBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.textDark },  // 13 = base ✓
  actionDivider: { width: 1, backgroundColor: Colors.surfaceBg, marginVertical: Spacing.micro },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing['6xl'], gap: Spacing.xl },
  loadingText: { fontSize: FontSize.md, color: Colors.textSecondary, fontWeight: FontWeight.medium, marginTop: Spacing.xs },  // 14 = md ✓
  errorTitle: { fontSize: FontSize['2xl'], fontWeight: FontWeight.bold, color: Colors.textPrimary },  // 18 = 2xl ✓
  errorMsg: { fontSize: FontSize.base, color: Colors.textSecondary, textAlign: 'center' },  // 13 = base ✓
  retryBtn: {
    marginTop: Spacing.md, backgroundColor: Colors.primary, borderRadius: BorderRadius.md,  // 12 = md ✓
    paddingHorizontal: Spacing['4xl'], paddingVertical: Spacing.xl,
  },
  retryBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.white },  // 14 = md ✓
  emptyBox: { alignItems: 'center', paddingTop: 80, paddingHorizontal: Spacing['6xl'], gap: Spacing.lg },
  emptyTitle: { fontSize: FontSize['2xl'], fontWeight: FontWeight.bold, color: Colors.textPrimary, marginTop: Spacing.md },  // 18 = 2xl ✓
  emptySubtitle: { fontSize: FontSize.base, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },  // 13 = base ✓
  emptyBtn: {
    marginTop: Spacing.xl, backgroundColor: Colors.primary, borderRadius: BorderRadius.button,  // 14 = button ✓
    paddingHorizontal: 28, paddingVertical: Spacing['2xl'],
  },
  emptyBtnText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.white },  // 15 = lg ✓
});
