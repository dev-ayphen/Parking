import React, { useState, useCallback, useMemo } from 'react';
import {View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  ActivityIndicator,
  Alert,
  Image,
  DeviceEventEmitter} from 'react-native';
import { toast } from '../../utils/toast';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Plus, MapPin, Edit3, Trash2, Clock, CheckCircle, XCircle, AlertTriangle, Car, IndianRupee, BarChart3, ShieldCheck, Eye } from 'lucide-react-native';
import { PageHeader, LoadErrorState } from '../../components';
import { api } from '../../services/api';
import { FontSize, FontWeight, BorderRadius, Spacing, ExtendedColors } from '../../theme';
import type { ColorsType } from '../../theme';
import { useTheme } from '../../hooks/useTheme';

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
  landmark: string | null;
  spaceType: string;
  parkingFor: string;
  capacity: number;
  hourlyRate: number;
  dailyRate: number | null;
  monthlyRate: number | null;
  availability: string;
  startTime: string | null;
  endTime: string | null;
  visibility: string | null;
  status: SpaceStatus;
  amenities: string[];
  frontPhotoUrl: string | null;
  bookingsCount: number;
  createdAt: string;
  rejectionReason?: string;
  consentVerified: boolean;
}

export default function MySpacesListScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
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
        landmark: s.landmark ?? null,
        spaceType: s.spaceType,
        parkingFor: s.parkingFor,
        capacity: s.capacity,
        hourlyRate: s.hourlyRate,
        dailyRate: s.dailyRate ?? null,
        monthlyRate: s.monthlyRate ?? null,
        availability: s.availability,
        startTime: s.startTime ?? null,
        endTime: s.endTime ?? null,
        visibility: s.visibility ?? null,
        status: s.status,
        amenities: s.amenities || [],
        frontPhotoUrl: s.frontPhotoUrl ?? null,
        bookingsCount: s._count?.bookings ?? 0,
        createdAt: s.createdAt,
        rejectionReason: s.rejectionReason,
        consentVerified: Boolean(
          s.ownerConsent?.acceptOwnerResponsibility &&
          s.ownerConsent?.acceptLegalCompliance &&
          s.ownerConsent?.acceptNonViolationDeclaration
        ),
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
      DeviceEventEmitter.emit('sessionbar:suppress', true);
      return () => { DeviceEventEmitter.emit('sessionbar:suppress', false); };
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
        return { icon: <CheckCircle size={13} color={colors.success} />, text: 'Verified', color: colors.success, bg: colors.successBg };
      case 'PENDING':
        return { icon: <Clock size={13} color={colors.warningAlt} />, text: 'Pending Review', color: colors.warning, bg: colors.warningBgAlt };
      case 'REJECTED':
        return { icon: <XCircle size={13} color={colors.error} />, text: 'Rejected', color: colors.error, bg: colors.errorBg };
      case 'BLOCKED':
        return { icon: <AlertTriangle size={13} color={colors.textBody} />, text: 'Blocked', color: colors.textBody, bg: colors.surfaceBg };
      default:
        return { icon: <Clock size={13} color={colors.textMuted} />, text: status, color: colors.textMuted, bg: colors.screenBg };
    }
  };

  const renderSpaceCard = ({ item }: { item: MySpace }) => {
    const badge = getStatusBadge(item.status);
    const isDeleting = deletingId === item.id;

    return (
      <View style={styles.card}>
        {/* Header row */}
        <View style={styles.cardHeader}>
          {item.frontPhotoUrl ? (
            <Image source={{ uri: item.frontPhotoUrl }} style={styles.spacePhoto} resizeMode="cover" onError={() => {}} />
          ) : (
            <View style={styles.spaceIconBox}>
              <MapPin size={22} color={colors.primary} />
            </View>
          )}
          <View style={styles.headerInfo}>
            <Text style={styles.spaceName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.spaceAddress} numberOfLines={1}>{item.address}</Text>
            {!!item.landmark && (
              <Text style={styles.spaceLandmark} numberOfLines={1}>Near {item.landmark}</Text>
            )}
            <View style={[styles.badgeRow, { backgroundColor: badge.bg }]}>
              {badge.icon}
              <Text style={[styles.badgeText, { color: badge.color }]}>{badge.text}</Text>
            </View>
          </View>
        </View>

        {/* Rejection reason (always shown for REJECTED — admin's reason, or a fallback) */}
        {item.status === 'REJECTED' && (
          <View style={styles.rejectionBox}>
            <AlertTriangle size={14} color={colors.error} />
            <Text style={styles.rejectionText}>
              {item.rejectionReason?.trim() || 'No reason provided by the admin.'}
            </Text>
          </View>
        )}

        {/* Meta chips */}
        <View style={styles.metaRow}>
          <View style={styles.metaChip}>
            <Car size={12} color={colors.textSecondary} />
            <Text style={styles.metaChipText}>{item.parkingFor}</Text>
          </View>
          <View style={styles.metaChip}>
            <IndianRupee size={12} color={colors.textSecondary} />
            <Text style={styles.metaChipText}>{item.hourlyRate}/hr</Text>
          </View>
          {item.dailyRate != null && (
            <View style={styles.metaChip}>
              <IndianRupee size={12} color={colors.textSecondary} />
              <Text style={styles.metaChipText}>{item.dailyRate}/day</Text>
            </View>
          )}
          {item.monthlyRate != null && (
            <View style={styles.metaChip}>
              <IndianRupee size={12} color={colors.textSecondary} />
              <Text style={styles.metaChipText}>{item.monthlyRate}/mo</Text>
            </View>
          )}
          <View style={styles.metaChip}>
            <Clock size={12} color={colors.textSecondary} />
            <Text style={styles.metaChipText}>
              {item.availability === 'Custom Hours' && item.startTime && item.endTime
                ? `${item.startTime} – ${item.endTime}`
                : item.availability}
            </Text>
          </View>
          {!!item.visibility && (
            <View style={styles.metaChip}>
              <Eye size={12} color={colors.textSecondary} />
              <Text style={styles.metaChipText}>{item.visibility}</Text>
            </View>
          )}
        </View>

        {/* Amenities */}
        {item.amenities.length > 0 && (
          <View style={styles.amenitiesRow}>
            {item.amenities.map((a) => (
              <View key={a} style={styles.amenityChip}>
                <Text style={styles.amenityChipText}>{a}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Compliance consent indicator */}
        {item.consentVerified && (
          <View style={styles.consentRow}>
            <ShieldCheck size={13} color={colors.success} />
            <Text style={styles.consentText}>Ownership & compliance confirmed</Text>
          </View>
        )}

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
            <Edit3 size={16} color={item.status === 'REJECTED' ? colors.primary : colors.textDark} />
            <Text style={[styles.actionBtnText, item.status === 'REJECTED' && { color: colors.primary }]}>
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
                <BarChart3 size={16} color={colors.textDark} />
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
              ? <ActivityIndicator size="small" color={colors.error} />
              : <Trash2 size={16} color={colors.error} />
            }
            <Text style={[styles.actionBtnText, { color: colors.error }]}>
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
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <PageHeader
          title="My Spaces"
          onBack={() => router.replace('/(my-spaces)')}
          right={
            <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/add-space')}>
              <Plus size={18} color={colors.primary} strokeWidth={2.5} />
            </TouchableOpacity>
          }
        />
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading your spaces...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <PageHeader title="My Spaces"  onBack={() => router.replace('/(my-spaces)')} />
        <LoadErrorState message={error} onRetry={() => fetchSpaces()} />
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
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <PageHeader
        title="My Spaces"
        onBack={() => router.replace('/(my-spaces)')}
        right={
          <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/add-space')}>
            <Plus size={20} color={colors.primary} strokeWidth={2.5} />
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
        style={{ backgroundColor: colors.screenBg }}
        data={filteredSpaces}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderSpaceCard}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchSpaces(true)}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <MapPin size={52} color={colors.borderMuted} strokeWidth={1.5} />
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

const makeStyles = (colors: ColorsType) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.white },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderLight,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  tabsContainer: {
    flexDirection: 'row', backgroundColor: colors.white,
    paddingHorizontal: Spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.surfaceBg,
  },
  tab: {
    flex: 1, paddingVertical: Spacing['2xl'], alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  activeTab: { borderBottomColor: colors.primary },
  tabText: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: colors.textSecondary },  // 14 = md ✓
  activeTabText: { color: colors.primary },
  listContent: {
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: 100,
  },
  card: {
    backgroundColor: colors.white, borderRadius: BorderRadius.lg, padding: Spacing['3xl'],  // 16 = lg ✓
    marginBottom: Spacing['2xl'], borderWidth: 1, borderColor: colors.surfaceBg,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', marginBottom: Spacing.xl, gap: Spacing.xl },
  spaceIconBox: {
    width: 52, height: 52, borderRadius: BorderRadius.button,  // 14 = button ✓
    backgroundColor: colors.primaryBg, alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  spacePhoto: {
    width: 52, height: 52, borderRadius: BorderRadius.button,
    backgroundColor: colors.surfaceBg, flexShrink: 0,
  },
  headerInfo: { flex: 1 },
  spaceName: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: colors.textPrimary, marginBottom: 3 },  // 15 = lg ✓
  spaceAddress: { fontSize: FontSize.sm, color: colors.textSecondary, marginBottom: 2 },  // 12 = sm ✓
  spaceLandmark: { fontSize: FontSize.xs, color: colors.textMuted, marginBottom: Spacing.sm },  // 11 = xs ✓
  badgeRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    paddingHorizontal: Spacing.md, paddingVertical: 3, borderRadius: BorderRadius.input, alignSelf: 'flex-start',  // 10 = input ✓
  },
  badgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },  // 11 = xs ✓
  rejectionBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md,
    backgroundColor: colors.errorBg, borderColor: ExtendedColors.redBorder, borderWidth: 1,  // '#FECACA' ✓
    borderRadius: BorderRadius.input, padding: Spacing.lg, marginBottom: Spacing.xl,  // 10 = input ✓
  },
  rejectionText: { fontSize: FontSize.sm, color: colors.error, fontWeight: FontWeight.medium, flex: 1, lineHeight: 18 },  // 12 = sm ✓
  metaRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl, flexWrap: 'wrap' },
  metaChip: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    backgroundColor: colors.screenBg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: colors.border,  // 8 = sm ✓
  },
  metaChipText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: colors.textBody },  // 11 = xs ✓
  amenitiesRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl, flexWrap: 'wrap' },
  amenityChip: {
    backgroundColor: colors.primaryBg, paddingHorizontal: Spacing.md, paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  amenityChipText: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, color: colors.primary },  // 11 = xs ✓
  consentRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.xl,
  },
  consentText: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, color: colors.success },  // 11 = xs ✓
  statsRow: {
    flexDirection: 'row', backgroundColor: colors.screenBg,
    borderRadius: BorderRadius.input, padding: Spacing.lg, marginBottom: Spacing['2xl'],  // 10 = input ✓
  },
  statBox: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: colors.border, marginVertical: Spacing.micro },
  statLabel: { fontSize: FontSize.xs, color: colors.textMuted, fontWeight: FontWeight.medium, marginBottom: 3 },  // 11 = xs ✓
  statValue: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: colors.textPrimary },  // 15 = lg ✓
  actionsRow: {
    flexDirection: 'row', borderTopWidth: 1,
    borderTopColor: colors.surfaceBg, paddingTop: Spacing.xl,
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm,
  },
  actionBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: colors.textDark },  // 13 = base ✓
  actionDivider: { width: 1, backgroundColor: colors.surfaceBg, marginVertical: Spacing.micro },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing['6xl'], gap: Spacing.xl },
  loadingText: { fontSize: FontSize.md, color: colors.textSecondary, fontWeight: FontWeight.medium, marginTop: Spacing.xs },  // 14 = md ✓
  errorTitle: { fontSize: FontSize['2xl'], fontWeight: FontWeight.bold, color: colors.textPrimary },  // 18 = 2xl ✓
  errorMsg: { fontSize: FontSize.base, color: colors.textSecondary, textAlign: 'center' },  // 13 = base ✓
  retryBtn: {
    marginTop: Spacing.md, backgroundColor: colors.primary, borderRadius: BorderRadius.md,  // 12 = md ✓
    paddingHorizontal: Spacing['4xl'], paddingVertical: Spacing.xl,
  },
  retryBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: colors.white },  // 14 = md ✓
  emptyBox: { alignItems: 'center', paddingTop: 80, paddingHorizontal: Spacing['6xl'], gap: Spacing.lg },
  emptyTitle: { fontSize: FontSize['2xl'], fontWeight: FontWeight.bold, color: colors.textPrimary, marginTop: Spacing.md },  // 18 = 2xl ✓
  emptySubtitle: { fontSize: FontSize.base, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },  // 13 = base ✓
  emptyBtn: {
    marginTop: Spacing.xl, backgroundColor: colors.primary, borderRadius: BorderRadius.button,  // 14 = button ✓
    paddingHorizontal: 28, paddingVertical: Spacing['2xl'],
  },
  emptyBtnText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: colors.white },  // 15 = lg ✓
});
