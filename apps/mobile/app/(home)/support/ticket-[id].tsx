import React, { useState, useEffect, useRef, useCallback } from 'react';
import {View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Send, Clock, Info, Star, RotateCcw, CheckCircle2, XCircle, Pause, Ticket as TicketIcon } from 'lucide-react-native';
import { io as createSocket, Socket } from 'socket.io-client';
import { API_BASE } from '../../../config/api.config';
import { api } from '../../../services/api';
import { getAuthToken } from '../../../utils/secureStorage';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, ExtendedColors } from '../../../theme';

const SOCKET_URL = (API_BASE || '').replace(/\/api\/?$/, '');

const STATUS_DISPLAY: Record<string, { label: string; color: string; bg: string }> = {
  OPEN: { label: 'Open', color: Colors.info, bg: Colors.infoBg },
  IN_PROGRESS: { label: 'In Progress', color: Colors.warningAlt, bg: Colors.warningBg },
  WAITING_FOR_USER: { label: 'Waiting for You', color: ExtendedColors.purpleText, bg: ExtendedColors.purpleBg },
  RESOLVED: { label: 'Resolved', color: Colors.successAlt, bg: Colors.successBg },
  CLOSED: { label: 'Closed', color: Colors.textSecondary, bg: Colors.surfaceBg },
};

const CATEGORY_LABELS: Record<string, string> = {
  BOOKING: 'Booking', SPACE_OWNER: 'Space Owner', SUBSCRIPTION: 'Subscription',
  ACCOUNT: 'Account', TECHNICAL: 'Technical', OTHER: 'Other',
};

interface Reply {
  id: number;
  message: string;
  isAdmin: boolean;
  createdAt: string;
}

interface TicketData {
  id: number;
  ticketNumber: string;
  subject: string | null;
  category: string;
  description: string;
  status: string;
  priority: string;
  resolutionNote: string | null;
  rating: number | null;
  ratingComment: string | null;
  createdAt: string;
  closedAt: string | null;
  replies: Reply[];
}

export default function TicketDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  // Route param can be either bare id or "ticket-<id>"
  const rawId = (id as string)?.replace(/^ticket-/, '') || '';
  const numericId = parseInt(rawId, 10);

  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [ratingStars, setRatingStars] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const socketRef = useRef<Socket | null>(null);

  const fetchTicket = useCallback(async () => {
    try {
      const json = await api.get(`/support/${numericId}`);
      if (json.success) {
        setTicket(json.ticket);
        setError('');
      } else {
        setError(json.error || 'Failed to load ticket');
      }
    } catch (e: any) {
      setError(e?.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }, [numericId]);

  useEffect(() => {
    if (!isNaN(numericId)) fetchTicket();
  }, [numericId, fetchTicket]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
  }, [ticket?.replies.length]);

  // Real-time socket subscription for new replies + status changes.
  // The socket server REQUIRES a JWT in the handshake — without it the connection
  // is rejected and live replies never arrive. So we fetch the token first.
  useEffect(() => {
    if (isNaN(numericId)) return;
    let socket: Socket | null = null;
    let cancelled = false;

    (async () => {
      const token = await getAuthToken();
      if (cancelled || !token) return;
      socket = createSocket(SOCKET_URL, { transports: ['websocket'], auth: { token } });
      socketRef.current = socket;
      socket.on('connect', () => socket?.emit('support:join', numericId));
      socket.on('support:reply', (payload: any) => {
        if (payload?.ticketId !== numericId || !payload?.reply) return;
        setTicket((prev) => {
          if (!prev) return prev;
          // Dedup: ignore a reply we already have (e.g. our own optimistic append).
          if (prev.replies.some((r) => r.id === payload.reply.id)) return prev;
          return { ...prev, replies: [...prev.replies, payload.reply] };
        });
      });
      socket.on('support:status', (payload: any) => {
        if (payload?.ticketId !== numericId) return;
        setTicket((prev) => prev ? { ...prev, status: payload.status, priority: payload.priority ?? prev.priority } : prev);
      });
    })();

    return () => {
      cancelled = true;
      if (socket) {
        socket.emit('support:leave', numericId);
        socket.disconnect();
      }
      socketRef.current = null;
    };
  }, [numericId]);

  const handleSend = async () => {
    if (!replyText.trim() || !ticket) return;
    try {
      setSending(true);
      const json = await api.post(`/support/${numericId}/reply`, { message: replyText.trim() });
      if (json.success) {
        // Optimistically append, guarding against a socket echo that already added it.
        setTicket((prev) => {
          if (!prev) return prev;
          if (prev.replies.some((r) => r.id === json.reply.id)) return prev;
          return { ...prev, replies: [...prev.replies, json.reply] };
        });
        setReplyText('');
        // Refresh status (may have auto-flipped from WAITING_FOR_USER → IN_PROGRESS)
        fetchTicket();
      } else {
        Alert.alert('Error', json.error || 'Failed to send');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Network error');
    } finally {
      setSending(false);
    }
  };

  const handleReopen = async () => {
    if (!ticket) return;
    Alert.alert('Reopen Ticket', 'This will mark the issue as still open. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reopen',
        onPress: async () => {
          try {
            setReopening(true);
            await api.post(`/support/${numericId}/reopen`);
            fetchTicket();
          } finally {
            setReopening(false);
          }
        },
      },
    ]);
  };

  const handleSubmitRating = async () => {
    if (ratingStars < 1) {
      Alert.alert('Please rate', 'Select 1–5 stars before submitting.');
      return;
    }
    try {
      setSubmittingRating(true);
      const json = await api.post(`/support/${numericId}/rate`, { rating: ratingStars, comment: ratingComment });
      if (json.success) {
        setShowRating(false);
        fetchTicket();
      } else {
        Alert.alert('Error', json.error || 'Failed to submit rating');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Network error');
    } finally {
      setSubmittingRating(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ChevronLeft size={18} color={Colors.textDark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Ticket Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!ticket) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ChevronLeft size={18} color={Colors.textDark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Ticket Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ flex: 1, padding: Spacing['4xl'], alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: Colors.textSecondary, fontSize: FontSize.md, textAlign: 'center' }}>
            {error || 'Ticket not found.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const statusInfo = STATUS_DISPLAY[ticket.status] || STATUS_DISPLAY.OPEN;
  const isClosed = ticket.status === 'CLOSED';
  const isResolvedOrClosed = ticket.status === 'RESOLVED' || ticket.status === 'CLOSED';
  const allMessages: Array<{ id: string; isAdmin: boolean; text: string; createdAt: string; isOriginal?: boolean }> = [
    { id: 'original', isAdmin: false, text: ticket.description, createdAt: ticket.createdAt, isOriginal: true },
    ...ticket.replies.map((r) => ({ id: `r${r.id}`, isAdmin: r.isAdmin, text: r.message, createdAt: r.createdAt })),
  ];

  const formatTime = (d: string) =>
    new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronLeft size={18} color={Colors.textDark} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{ticket.ticketNumber}</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scrollRef} contentContainerStyle={styles.content}>
          {/* Ticket header card */}
          <View style={styles.ticketInfoCard}>
            <View style={styles.ticketInfoHeader}>
              <Text style={styles.ticketId}>{ticket.ticketNumber}</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
                {ticket.status === 'OPEN' && <TicketIcon size={14} color={statusInfo.color} />}
                {ticket.status === 'IN_PROGRESS' && <Clock size={14} color={statusInfo.color} />}
                {ticket.status === 'WAITING_FOR_USER' && <Pause size={14} color={statusInfo.color} />}
                {ticket.status === 'RESOLVED' && <CheckCircle2 size={14} color={statusInfo.color} />}
                {ticket.status === 'CLOSED' && <XCircle size={14} color={statusInfo.color} />}
                <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
              </View>
            </View>
            <Text style={styles.ticketSubject}>{ticket.subject || ticket.description.slice(0, 80)}</Text>
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Category</Text>
                <Text style={styles.metaValue}>{CATEGORY_LABELS[ticket.category] || ticket.category}</Text>
              </View>
              <View style={styles.metaDivider} />
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Created</Text>
                <Text style={styles.metaValue}>{new Date(ticket.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
              </View>
            </View>
          </View>

          {/* Resolution note banner */}
          {ticket.resolutionNote && (
            <View style={[styles.escalationBanner, { backgroundColor: Colors.successBg, borderColor: ExtendedColors.greenBorderFine }]}>
              <CheckCircle2 size={18} color={Colors.success} />
              <Text style={[styles.escalationText, { color: ExtendedColors.greenTextDark }]}>{ticket.resolutionNote}</Text>
            </View>
          )}

          {/* Reopen / Rate prompt when resolved */}
          {isResolvedOrClosed && !ticket.rating && (
            <View style={styles.actionsCard}>
              <Text style={styles.actionsTitle}>Was this issue resolved?</Text>
              <Text style={styles.actionsDesc}>Rate your support experience or reopen if you still need help.</Text>
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: Colors.white, borderColor: Colors.border }]}
                  onPress={handleReopen}
                  disabled={reopening}
                >
                  <RotateCcw size={14} color={Colors.textPrimary} />
                  <Text style={[styles.actionButtonText, { color: Colors.textPrimary }]}>
                    {reopening ? 'Reopening…' : 'Reopen Ticket'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: Colors.primary }]}
                  onPress={() => setShowRating(true)}
                >
                  <Star size={14} color={Colors.white} />
                  <Text style={styles.actionButtonText}>Rate Support</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Existing rating display */}
          {ticket.rating && (
            <View style={[styles.escalationBanner, { backgroundColor: Colors.warningBg, borderColor: ExtendedColors.warningStarBorder }]}>
              <Star size={18} color={Colors.warning} fill={Colors.warning} />
              <Text style={[styles.escalationText, { color: ExtendedColors.warningAmber }]}>
                You rated {ticket.rating}/5{ticket.ratingComment ? ` — "${ticket.ratingComment}"` : ''}
              </Text>
            </View>
          )}

          {/* Rating input modal-style card */}
          {showRating && (
            <View style={styles.actionsCard}>
              <Text style={styles.actionsTitle}>Rate Support</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm, marginVertical: Spacing.lg }}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <TouchableOpacity key={s} onPress={() => setRatingStars(s)}>
                    <Star size={28} color={Colors.warningAlt} fill={s <= ratingStars ? Colors.warningAlt : 'transparent'} />
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={[styles.replyInput, { borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.input, padding: Spacing.lg, minHeight: 60, maxHeight: 100, marginBottom: Spacing.lg }]}
                placeholder="Optional feedback…"
                value={ratingComment}
                onChangeText={setRatingComment}
                multiline
              />
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: Colors.white, borderColor: Colors.border }]}
                  onPress={() => setShowRating(false)}
                >
                  <Text style={[styles.actionButtonText, { color: Colors.textPrimary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: Colors.primary }]}
                  onPress={handleSubmitRating}
                  disabled={submittingRating}
                >
                  {submittingRating ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <Text style={styles.actionButtonText}>Submit Rating</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Live chat escalation banner */}
          {!isResolvedOrClosed && (
            <View style={styles.escalationBanner}>
              <Info size={18} color={Colors.textPrimary} />
              <Text style={styles.escalationText}>Our team replies within 2 hours during business hours.</Text>
            </View>
          )}

          {/* Conversation */}
          <View style={styles.conversationArea}>
            <Text style={styles.conversationTitle}>Conversation</Text>
            {allMessages.map((msg) => {
              const isUser = !msg.isAdmin;
              return (
                <View key={msg.id} style={[styles.messageWrapper, isUser ? styles.messageWrapperUser : styles.messageWrapperSupport]}>
                  {!isUser && (
                    <View style={styles.avatarSupport}>
                      <Text style={styles.avatarTextSupport}>PS</Text>
                    </View>
                  )}
                  <View style={[styles.messageBubble, isUser ? styles.messageBubbleUser : styles.messageBubbleSupport]}>
                    <Text style={[styles.messageText, isUser ? styles.messageTextUser : styles.messageTextSupport]}>
                      {msg.text}
                    </Text>
                    <Text style={[styles.messageTime, isUser ? styles.messageTimeUser : styles.messageTimeSupport]}>
                      {msg.isOriginal ? `${formatTime(msg.createdAt)} · Original` : formatTime(msg.createdAt)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>

        {!isClosed && (
          <View style={styles.replyArea}>
            <TextInput
              style={styles.replyInput}
              placeholder="Type a reply…"
              placeholderTextColor={Colors.textMuted}
              value={replyText}
              onChangeText={setReplyText}
              multiline
              editable={!sending}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!replyText.trim() || sending) && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={!replyText.trim() || sending}
            >
              {sending ? <ActivityIndicator size="small" color={Colors.white} /> : <Send size={18} color={Colors.white} />}
            </TouchableOpacity>
          </View>
        )}

        {isClosed && (
          <View style={styles.closedFooter}>
            <Text style={styles.closedFooterText}>This ticket is closed.</Text>
            <TouchableOpacity onPress={handleReopen} disabled={reopening}>
              <Text style={styles.closedFooterAction}>{reopening ? 'Reopening…' : 'Reopen ticket'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
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
  content: {
    padding: Spacing['3xl'],
  },
  ticketInfoCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,                  // 16 = lg ✓
    padding: Spacing.screenH,
    marginBottom: Spacing['3xl'],
    borderWidth: 1,
    borderColor: Colors.border,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8 },
      android: { elevation: 1 },
    }),
  },
  ticketInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  ticketId: {
    fontSize: FontSize.xl,                          // 16 = xl ✓
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warningBg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,                  // 12 = md ✓
    gap: Spacing.sm,
  },
  statusText: {
    fontSize: FontSize.sm,                          // 12 = sm ✓
    fontWeight: FontWeight.semibold,
    color: Colors.warningAlt,
  },
  ticketSubject: {
    fontSize: FontSize['2xl'],                      // 18 = 2xl ✓
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.screenH,
    lineHeight: 24,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.screenBg,
    padding: Spacing.xl,
    borderRadius: BorderRadius.sm,                  // 8 = sm ✓
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    fontSize: FontSize.sm,                          // 12 = sm ✓
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  metaValue: {
    fontSize: FontSize.md,                          // 14 = md ✓
    fontWeight: FontWeight.medium,
    color: Colors.textPrimary,
  },
  metaDivider: {
    width: 1,
    height: '100%',
    backgroundColor: Colors.border,
    marginHorizontal: Spacing['3xl'],
  },
  escalationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceBg,
    padding: Spacing['3xl'],
    borderRadius: BorderRadius.md,                  // 12 = md ✓
    marginBottom: Spacing['4xl'],
    gap: Spacing.xl,
  },
  escalationText: {
    flex: 1,
    fontSize: FontSize.base,                        // 13 = base ✓
    color: Colors.textDark,
    lineHeight: 18,
  },
  conversationArea: {
    paddingBottom: Spacing.screenH,
  },
  conversationTitle: {
    fontSize: FontSize.xl,                          // 16 = xl ✓
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing['3xl'],
  },
  messageWrapper: {
    flexDirection: 'row',
    marginBottom: Spacing['3xl'],
    maxWidth: '85%',
  },
  messageWrapperUser: {
    alignSelf: 'flex-end',
  },
  messageWrapperSupport: {
    alignSelf: 'flex-start',
  },
  avatarSupport: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.lg,                  // 16 = lg ✓
    backgroundColor: Colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
    marginTop: Spacing.xs,
  },
  avatarTextSupport: {
    color: Colors.white,
    fontSize: FontSize.sm,                          // 12 = sm ✓
    fontWeight: FontWeight.bold,
  },
  messageBubble: {
    padding: Spacing['3xl'],
    borderRadius: BorderRadius.lg,                  // 16 = lg ✓
  },
  messageBubbleUser: {
    backgroundColor: Colors.primary,
    borderTopRightRadius: BorderRadius.xs,          // 4 = xs ✓
  },
  messageBubbleSupport: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xs,           // 4 = xs ✓
    borderWidth: 1,
    borderColor: Colors.border,
  },
  messageText: {
    fontSize: FontSize.lg,                          // 15 = lg ✓
    lineHeight: 22,
  },
  messageTextUser: {
    color: Colors.white,
  },
  messageTextSupport: {
    color: Colors.textDark,
  },
  messageTime: {
    fontSize: FontSize.xs,                          // 11 = xs ✓
    marginTop: Spacing.md,
    alignSelf: 'flex-end',
  },
  messageTimeUser: {
    color: ExtendedColors.whiteAlpha70,             // 'rgba(255,255,255,0.7)' ✓
  },
  messageTimeSupport: {
    color: Colors.textMuted,
  },
  replyArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: Spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 34 : Spacing.xl,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  attachButton: {
    padding: Spacing.xl,
  },
  replyInput: {
    flex: 1,
    backgroundColor: Colors.screenBg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.circleXl,            // 20 = circleXl ✓
    paddingHorizontal: Spacing['3xl'],
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
    maxHeight: 100,
    minHeight: 44,
    fontSize: FontSize.lg,                          // 15 = lg ✓
    marginHorizontal: Spacing.md,
  },
  sendButton: {
    backgroundColor: Colors.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.surfaceBg,
  },
  actionsCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,                  // 16 = lg ✓
    padding: Spacing['3xl'],
    marginBottom: Spacing['3xl'],
    borderWidth: 1,
    borderColor: Colors.surfaceBg,
  },
  actionsTitle: {
    fontSize: FontSize.lg,                          // 15 = lg ✓
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  actionsDesc: {
    fontSize: FontSize.base,                        // 13 = base ✓
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,                  // 12 = md ✓
    borderWidth: 1,
    borderColor: 'transparent',
  },
  actionButtonText: {
    fontSize: FontSize.base,                        // 13 = base ✓
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  closedFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surfaceBg,
    padding: Spacing['2xl'],
    paddingHorizontal: Spacing.screenH,
  },
  closedFooterText: {
    fontSize: FontSize.base,                        // 13 = base ✓
    color: Colors.textSecondary,
  },
  closedFooterAction: {
    fontSize: FontSize.base,                        // 13 = base ✓
    color: Colors.primary,
    fontWeight: FontWeight.bold,
  },
});
