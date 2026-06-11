import React, { useState, useEffect, useCallback } from 'react';
import {View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
  RefreshControl} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { ChevronLeft, Ticket, Clock, CheckCircle2, ChevronRight, XCircle, MessageSquare, Pause } from 'lucide-react-native';
import { api } from '../../../services/api';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, ExtendedColors } from '../../../theme';


const TABS: { label: string; value: string | undefined }[] = [
  { label: 'All', value: undefined },
  { label: 'Open', value: 'OPEN' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Waiting', value: 'WAITING_FOR_USER' },
  { label: 'Resolved', value: 'RESOLVED' },
  { label: 'Closed', value: 'CLOSED' },
];

const STATUS_DISPLAY: Record<string, { label: string; color: string }> = {
  OPEN: { label: 'Open', color: Colors.info },
  IN_PROGRESS: { label: 'In Progress', color: Colors.warningAlt },
  WAITING_FOR_USER: { label: 'Waiting for You', color: ExtendedColors.purpleText },
  RESOLVED: { label: 'Resolved', color: Colors.successAlt },
  CLOSED: { label: 'Closed', color: Colors.textSecondary },
};

const CATEGORY_LABELS: Record<string, string> = {
  BOOKING: 'Booking',
  SPACE_OWNER: 'Space Owner',
  SUBSCRIPTION: 'Subscription',
  ACCOUNT: 'Account',
  TECHNICAL: 'Technical',
  OTHER: 'Other',
};

interface ApiTicket {
  id: number;
  ticketNumber: string;
  subject: string | null;
  category: string;
  description: string;
  status: string;
  statusLabel: string;
  priority: string;
  replyCount: number;
  lastReplyAt: string;
  createdAt: string;
  updatedAt: string;
}

export default function MySupportTicketsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const [tickets, setTickets] = useState<ApiTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchTickets = useCallback(async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError('');
      const params = activeTab.value ? `?status=${activeTab.value}` : '';
      const json = await api.get(`/support/my${params}`);
      if (json.success) setTickets(json.tickets || []);
      else setError(json.error || 'Failed to load tickets');
    } catch (e: any) {
      setError(e?.message || 'Network error');
    } finally {
      isRefresh ? setRefreshing(false) : setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);
  // Reload when returning to this screen (e.g., after creating a ticket)
  useFocusEffect(useCallback(() => { fetchTickets(); }, [fetchTickets]));

  const getStatusIcon = (status: string, color: string) => {
    switch (status) {
      case 'RESOLVED': return <CheckCircle2 size={14} color={color} />;
      case 'CLOSED': return <XCircle size={14} color={color} />;
      case 'OPEN': return <Ticket size={14} color={color} />;
      case 'IN_PROGRESS': return <Clock size={14} color={color} />;
      case 'WAITING_FOR_USER': return <Pause size={14} color={color} />;
      default: return <Ticket size={14} color={color} />;
    }
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
    if (diffDays === 0) return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronLeft size={18} color={Colors.textDark} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Support Tickets</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.label}
              style={[styles.tabButton, activeTab.label === tab.label && styles.tabButtonActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab.label === tab.label && styles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchTickets(true)} tintColor={Colors.primary} />}
        >
          {error ? (
            <View style={{ padding: Spacing['3xl'], backgroundColor: Colors.errorBg, borderRadius: BorderRadius.md, marginBottom: Spacing.xl }}>
              <Text style={{ color: ExtendedColors.redTextMid, fontSize: FontSize.base }}>{error}</Text>
            </View>
          ) : null}

          {tickets.length > 0 ? (
            tickets.map((ticket) => {
              const status = STATUS_DISPLAY[ticket.status] || STATUS_DISPLAY.OPEN;
              return (
                <TouchableOpacity
                  key={ticket.id}
                  style={styles.ticketCard}
                  activeOpacity={0.7}
                  onPress={() => router.push(`/(home)/support/ticket/${ticket.id}`)}
                >
                  <View style={styles.ticketHeader}>
                    <Text style={styles.ticketId}>{ticket.ticketNumber}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: `${status.color}15` }]}>
                      {getStatusIcon(ticket.status, status.color)}
                      <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                    </View>
                  </View>

                  <Text style={styles.ticketSubject} numberOfLines={2}>
                    {ticket.subject || ticket.description}
                  </Text>

                  <View style={styles.ticketFooter}>
                    <View style={styles.footerInfo}>
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryText}>{CATEGORY_LABELS[ticket.category] || ticket.category}</Text>
                      </View>
                      <Text style={styles.dateText}>{formatDate(ticket.lastReplyAt)}</Text>
                      {ticket.replyCount > 0 && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: Spacing.md }}>
                          <MessageSquare size={11} color={Colors.textMuted} />
                          <Text style={[styles.dateText, { marginLeft: 0 }]}>{ticket.replyCount}</Text>
                        </View>
                      )}
                    </View>
                    <ChevronRight size={20} color={Colors.borderMuted} />
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconBox}>
                <Ticket size={32} color={Colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>No tickets found</Text>
              <Text style={styles.emptyDesc}>
                You don't have any {activeTab.label.toLowerCase()} support tickets at the moment.
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/(home)/support/create-ticket')}
        >
          <Text style={styles.fabText}>Create New Ticket</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.screenBg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenH,
    paddingVertical: Spacing['3xl'],
    backgroundColor: Colors.white,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 4 },
    }),
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.circle,              // 19 = circle ✓
    backgroundColor: Colors.screenBg,
    borderWidth: 1,
    borderColor: Colors.surfaceBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSize['3xl'],                      // 20 = 3xl ✓
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  tabsContainer: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBg,
  },
  tabsScroll: {
    paddingHorizontal: Spacing['3xl'],
    paddingVertical: Spacing.xl,
    gap: Spacing.md,
  },
  tabButton: {
    paddingHorizontal: Spacing['3xl'],
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.circleXl,            // 20 = circleXl ✓
    backgroundColor: Colors.surfaceBg,
  },
  tabButtonActive: {
    backgroundColor: Colors.textPrimary,
  },
  tabText: {
    fontSize: FontSize.md,                          // 14 = md ✓
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.white,
  },
  content: {
    padding: Spacing.screenH,
    paddingBottom: 100,
  },
  ticketCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,                  // 16 = lg ✓
    padding: Spacing['3xl'],
    marginBottom: Spacing['3xl'],
    borderWidth: 1,
    borderColor: Colors.border,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8 },
      android: { elevation: 1 },
    }),
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  ticketId: {
    fontSize: FontSize.md,                          // 14 = md ✓
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,                  // 12 = md ✓
    gap: Spacing.sm,
  },
  statusText: {
    fontSize: FontSize.sm,                          // 12 = sm ✓
    fontWeight: FontWeight.semibold,
  },
  ticketSubject: {
    fontSize: FontSize.xl,                          // 16 = xl ✓
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing['3xl'],
    lineHeight: 22,
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBg,
  },
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xl,
  },
  categoryBadge: {
    backgroundColor: Colors.surfaceBg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.badge,               // 6 = badge ✓
  },
  categoryText: {
    fontSize: FontSize.sm,                          // 12 = sm ✓
    fontWeight: FontWeight.medium,
    color: Colors.textBody,
  },
  dateText: {
    fontSize: FontSize.sm,                          // 12 = sm ✓
    color: Colors.textMuted,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.surfaceBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing['3xl'],
  },
  emptyTitle: {
    fontSize: FontSize['2xl'],                      // 18 = 2xl ✓
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  emptyDesc: {
    fontSize: FontSize.md,                          // 14 = md ✓
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: Spacing['6xl'],
  },
  fabContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.screenH,
    backgroundColor: 'transparent',
  },
  fab: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing['3xl'],
    borderRadius: BorderRadius.md,                  // 12 = md ✓
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
      android: { elevation: 6 },
    }),
  },
  fabText: {
    color: Colors.white,
    fontSize: FontSize.xl,                          // 16 = xl ✓
    fontWeight: FontWeight.semibold,
  },
});
