import React, { useState, useEffect, useCallback } from 'react';
import {View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  SectionList,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../services/api';
import { PageHeader } from '../../components';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, ExtendedColors } from '../../theme';
import {
  Bell,
  Car,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Star,
  Info,
  XCircle,
  BellOff,
} from 'lucide-react-native';

const READ_IDS_KEY = 'parkswift_read_notification_ids';

interface Notification {
  id: string;
  type: 'booking_request' | 'booking_approved' | 'booking_rejected' | 'session_started' | 'session_ended' | 'payment' | 'rating' | 'space' | 'space_rejected' | 'space_approved' | 'system';
  title: string;
  body: string;
  time: string;
  createdAt: string;
  read: boolean;
  metadata?: {
    spaceId?: number;
    spaceName?: string;
    reason?: string;
  };
}

interface Section {
  title: string;
  data: Notification[];
}

const NotificationsScreen = () => {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  // Load read IDs from AsyncStorage + fetch from API
  useEffect(() => {
    const init = async () => {
      try {
        const stored = await AsyncStorage.getItem(READ_IDS_KEY);
        const ids: string[] = stored ? JSON.parse(stored) : [];
        setReadIds(new Set(ids));
        await fetchNotifications(new Set(ids));
        // Mark all as read on server AFTER fetching so local state is already set,
        // then update local state to reflect read
        await markAllReadOnServer();
      } catch {
        await fetchNotifications(new Set());
      }
    };
    init();
  }, []);

  const markAllReadOnServer = async () => {
    try {
      await api.post('/home/notifications/read-all');
      // Update local state so dots disappear immediately
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch {}
  };

  const fetchNotifications = async (currentReadIds: Set<string>, isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      const json = await api.get('/home/notifications');
      if (json.success) {
        const mapped: Notification[] = (json.notifications || []).map((n: any) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          body: n.body,
          time: formatTime(n.createdAt),
          createdAt: n.createdAt,
          // Use server's isRead field for DB notifications; fall back to local AsyncStorage
          read: n.isRead !== undefined ? !!n.isRead : currentReadIds.has(n.id),
          metadata: n.metadata,
        }));
        setNotifications(mapped);
      }
    } catch (e) {
      console.error('[NOTIFICATIONS] fetch error:', e);
    } finally {
      isRefresh ? setRefreshing(false) : setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    await fetchNotifications(readIds, true);
    await markAllReadOnServer();
  }, [readIds]);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays === 0) return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    if (diffDays === 1) return 'Yesterday';
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  };

  const getBucket = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays <= 7) return 'Last 7 Days';
    return 'Earlier';
  };

  const saveReadIds = async (ids: Set<string>) => {
    await AsyncStorage.setItem(READ_IDS_KEY, JSON.stringify([...ids]));
  };

  const markRead = async (id: string) => {
    const updated = new Set(readIds).add(id);
    setReadIds(updated);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    await saveReadIds(updated);
  };

  const markAllRead = async () => {
    const allIds = new Set(notifications.map(n => n.id));
    setReadIds(allIds);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    await saveReadIds(allIds);
  };

  // Build sections by date bucket
  const bucketOrder = ['Today', 'Yesterday', 'Last 7 Days', 'Earlier'];
  const bucketMap: Record<string, Notification[]> = {};

  notifications.forEach((n) => {
    const bucket = getBucket(n.createdAt);
    if (!bucketMap[bucket]) bucketMap[bucket] = [];
    bucketMap[bucket].push(n);
  });

  const sections: Section[] = bucketOrder
    .filter(b => bucketMap[b]?.length > 0)
    .map(b => ({ title: b, data: bucketMap[b] }));

  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'booking_request': return { icon: Bell, bg: Colors.pendingBg, color: ExtendedColors.orange };
      case 'booking_approved': return { icon: CheckCircle2, bg: Colors.successBgAlt, color: Colors.successAlt };
      case 'booking_rejected': return { icon: XCircle, bg: Colors.errorBg, color: Colors.errorAlt };
      case 'session_started': return { icon: Car, bg: ExtendedColors.indigoBg, color: ExtendedColors.indigoAccent };
      case 'session_ended': return { icon: Clock, bg: Colors.screenBg, color: Colors.textSecondary };
      case 'payment': return { icon: MapPin, bg: Colors.successBg, color: Colors.success };
      case 'rating': return { icon: Star, bg: Colors.warningBg, color: Colors.warning };
      case 'space_approved': return { icon: CheckCircle2, bg: Colors.successBgAlt, color: Colors.successAlt };
      case 'space_rejected': return { icon: XCircle, bg: Colors.errorBg, color: Colors.errorAlt };
      case 'system': return { icon: Info, bg: Colors.infoBg, color: Colors.info };
      default: return { icon: Bell, bg: Colors.screenBg, color: Colors.textSecondary };
    }
  };

  const renderItem = ({ item }: { item: Notification }) => {
    const { icon: Icon, bg, color } = getIcon(item.type);
    return (
      <TouchableOpacity
        style={[styles.notifItem, !item.read && styles.notifItemUnread]}
        onPress={() => {
          setSelectedNotification(item);
        }}
        activeOpacity={0.7}
      >
        {!item.read && <View style={styles.unreadDot} />}
        <View style={[styles.notifIcon, { backgroundColor: bg }]}>
          <Icon size={18} color={color} strokeWidth={2.5} />
        </View>
        <View style={styles.notifContent}>
          <View style={styles.notifTopRow}>
            <Text style={[styles.notifTitle, !item.read && styles.notifTitleUnread]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.notifTime}>{item.time}</Text>
          </View>
          <Text style={styles.notifBody} numberOfLines={2}>{item.body}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }: { section: Section }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionLabel}>{section.title}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <PageHeader
        title="Notifications"
        right={
          unreadCount > 0 ? (
            <TouchableOpacity onPress={markAllRead} style={styles.markAllBtn}>
              <Text style={styles.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconCircle}>
            <BellOff size={28} color={Colors.textMuted} strokeWidth={1.5} />
          </View>
          <Text style={styles.emptyTitle}>All caught up!</Text>
          <Text style={styles.emptySub}>No notifications right now. We'll let you know when something happens.</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          stickySectionHeadersEnabled={true}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
        />
      )}

      {/* Notification Detail Modal */}
      <Modal
        visible={selectedNotification !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setSelectedNotification(null);
          if (selectedNotification) markRead(selectedNotification.id);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{selectedNotification?.title}</Text>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedNotification(null);
                    if (selectedNotification) markRead(selectedNotification.id);
                  }}
                  style={styles.closeBtn}
                >
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Body Content */}
              <View style={styles.modalBody}>
                <Text style={styles.modalMessage}>{selectedNotification?.body}</Text>

                {/* Rejection Reason (only if explicitly provided in metadata) */}
                {selectedNotification?.metadata?.reason ? (
                  <View style={styles.reasonSection}>
                    <Text style={styles.reasonLabel}>
                      {selectedNotification?.title?.includes('Rejected') ? 'Rejection Reason:' : 'Details:'}
                    </Text>
                    <Text style={styles.reasonText}>
                      {selectedNotification.metadata.reason}
                    </Text>
                  </View>
                ) : null}

                {/* Timestamp */}
                <View style={styles.timestampSection}>
                  <Text style={styles.timestampLabel}>
                    {selectedNotification?.type === 'space_rejected'
                      ? 'Rejected On:'
                      : 'Received:'}
                  </Text>
                  <Text style={styles.timestampValue}>
                    {selectedNotification
                      ? new Date(selectedNotification.createdAt).toLocaleString(
                          'en-IN',
                          {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                          }
                        )
                      : ''}
                  </Text>
                </View>
              </View>

              {/* Action Button */}
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.doneBtn}
                  onPress={() => {
                    setSelectedNotification(null);
                    if (selectedNotification) markRead(selectedNotification.id);
                  }}
                >
                  <Text style={styles.doneBtnText}>Got It</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  markAllBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  markAllText: {
    fontSize: FontSize.sm,                          // 12 = sm ✓
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    textAlign: 'right',
  },
  sectionHeader: {
    backgroundColor: Colors.screenBg,
    paddingHorizontal: Spacing['3xl'],
    paddingTop: Spacing['3xl'],
    paddingBottom: Spacing.sm,
  },
  sectionLabel: {
    fontSize: FontSize.sm,                          // 12 = sm ✓
    fontWeight: FontWeight.bold,
    color: Colors.textMuted,
    letterSpacing: 0,
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing['3xl'],
    paddingVertical: Spacing['2xl'],
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBg,
    position: 'relative',
  },
  notifItemUnread: {
    backgroundColor: ExtendedColors.unreadBg,       // '#FAFCFF' ✓
  },
  unreadDot: {
    position: 'absolute',
    left: 6,
    top: '50%',
    marginTop: -3,
    width: 6,
    height: 6,
    borderRadius: BorderRadius.indicator,           // 3 = indicator ✓
    backgroundColor: Colors.primary,
  },
  notifIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,                  // 12 = md ✓
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.xl,
    flexShrink: 0,
  },
  notifContent: {
    flex: 1,
  },
  notifTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 3,                                // no Spacing token for 3
    gap: Spacing.md,
  },
  notifTitle: {
    fontSize: FontSize.md,                          // 14 = md ✓
    fontWeight: FontWeight.semibold,
    color: Colors.textBody,
    flex: 1,
  },
  notifTitleUnread: {
    fontWeight: FontWeight.extrabold,
    color: Colors.textPrimary,
  },
  notifTime: {
    fontSize: FontSize.xs,                          // 11 = xs ✓
    color: Colors.textMuted,
    fontWeight: FontWeight.medium,
    flexShrink: 0,
  },
  notifBody: {
    fontSize: FontSize.base,                        // 13 = base ✓
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['7xl'],
    paddingBottom: 60,
  },
  emptyIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
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
  },
  emptySub: {
    fontSize: FontSize.md,                          // 14 = md ✓
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,                // 'rgba(0,0,0,0.5)' ✓
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenH,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.circleXl,            // 20 = circleXl ✓
    maxHeight: '85%',
    width: '100%',
    overflow: 'hidden',
    flexShrink: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenH,
    paddingVertical: Spacing['3xl'],
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBg,
    backgroundColor: Colors.screenBg,
  },
  modalTitle: {
    fontSize: FontSize['2xl'],                      // 18 = 2xl ✓
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    flex: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.lg,                  // 16 = lg ✓
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: FontSize['2xl'],                      // 18 = 2xl ✓
    fontWeight: FontWeight.bold,
    color: Colors.textSecondary,
  },
  modalBody: {
    paddingHorizontal: Spacing.screenH,
    paddingVertical: Spacing.screenH,
    gap: Spacing['3xl'],
  },
  modalMessage: {
    fontSize: FontSize.lg,                          // 15 = lg ✓
    color: Colors.textBody,
    lineHeight: 22,
    fontWeight: FontWeight.medium,
  },
  reasonSection: {
    backgroundColor: Colors.errorBg,
    borderRadius: BorderRadius.md,                  // 12 = md ✓
    borderLeftWidth: 4,
    borderLeftColor: Colors.errorAlt,
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  reasonLabel: {
    fontSize: FontSize.sm,                          // 12 = sm ✓
    fontWeight: FontWeight.bold,
    color: Colors.error,
    letterSpacing: 0,
  },
  reasonText: {
    fontSize: FontSize.md,                          // 14 = md ✓
    color: ExtendedColors.redTextDeepest,           // '#7F1D1D' ✓
    lineHeight: 20,
    fontWeight: FontWeight.medium,
  },
  timestampSection: {
    backgroundColor: Colors.infoBg,
    borderRadius: BorderRadius.md,                  // 12 = md ✓
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  timestampLabel: {
    fontSize: FontSize.sm,                          // 12 = sm ✓
    fontWeight: FontWeight.bold,
    color: ExtendedColors.activeBlueText,           // '#0284C7' ✓
    letterSpacing: 0,
  },
  timestampValue: {
    fontSize: FontSize.md,                          // 14 = md ✓
    color: ExtendedColors.activeBlueDeep,           // '#0C4A6E' ✓
    lineHeight: 20,
    fontWeight: FontWeight.medium,
  },
  modalFooter: {
    paddingHorizontal: Spacing.screenH,
    paddingVertical: Spacing['3xl'],
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBg,
  },
  doneBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,                  // 12 = md ✓
    paddingVertical: Spacing['2xl'],
    alignItems: 'center',
  },
  doneBtnText: {
    fontSize: FontSize.lg,                          // 15 = lg ✓
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
});

export default NotificationsScreen;
