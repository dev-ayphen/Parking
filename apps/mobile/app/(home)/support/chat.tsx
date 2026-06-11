import React, { useState, useEffect, useCallback } from 'react';
import {View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MessageCircle, Send, Sparkles, ChevronRight } from 'lucide-react-native';
import PageHeader from '../../../components/PageHeader';
import { api } from '../../../services/api';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, ExtendedColors } from '../../../theme';


const CATEGORY_OPTIONS = [
  { label: 'Booking Issue', value: 'BOOKING', color: Colors.info, bg: Colors.infoBg },
  { label: 'Subscription Issue', value: 'SUBSCRIPTION', color: Colors.successAlt, bg: Colors.successBg },
  { label: 'Space Owner Support', value: 'SPACE_OWNER', color: Colors.warningAlt, bg: Colors.warningBg },
  { label: 'Technical Problem', value: 'TECHNICAL', color: Colors.errorAlt, bg: Colors.errorBg },
  { label: 'Account Help', value: 'ACCOUNT', color: ExtendedColors.purpleText, bg: ExtendedColors.purpleBg },
  { label: 'Other', value: 'OTHER', color: Colors.textSecondary, bg: Colors.surfaceBg },
];

interface ExistingTicket {
  id: number;
  ticketNumber: string;
  subject: string | null;
  statusLabel: string;
  status: string;
  lastReplyAt: string;
}

export default function LiveChatScreen() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<typeof CATEGORY_OPTIONS[0] | null>(null);
  const [message, setMessage] = useState('');
  const [creating, setCreating] = useState(false);
  const [openChats, setOpenChats] = useState<ExistingTicket[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);

  // Load existing open live-chat tickets so user can resume them
  const fetchOpenChats = useCallback(async () => {
    try {
      setLoadingChats(true);
      const json = await api.get('/support/my');
      if (json.success) {
        const activeChats = (json.tickets || []).filter(
          (t: any) => t.isLiveChat && ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_USER'].includes(t.status),
        );
        setOpenChats(activeChats);
      }
    } finally {
      setLoadingChats(false);
    }
  }, []);

  useEffect(() => { fetchOpenChats(); }, [fetchOpenChats]);

  const handleStartChat = async () => {
    if (!selectedCategory) {
      Alert.alert('Pick a topic', 'Select what you need help with first.');
      return;
    }
    if (!message.trim()) {
      Alert.alert('Add a message', 'Tell us a bit about your issue so we can help faster.');
      return;
    }
    try {
      setCreating(true);
      const json = await api.post('/support', {
        subject: `Live Chat — ${selectedCategory.label}`,
        description: message.trim(),
        category: selectedCategory.value,
        priority: 'HIGH', // Live chats are higher priority
        isLiveChat: true,
      });
      if (!json.success) {
        Alert.alert('Error', json.error || 'Failed to start chat');
        return;
      }
      // Navigate to the ticket detail screen — handles real-time chat from here
      router.replace(`/(home)/support/ticket/${json.ticket.id}`);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Network error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <PageHeader title="Live Chat" onBack={() => router.back()} />
      <View style={styles.onlineBadgeRow}>
        <View style={styles.onlineDot} />
        <Text style={styles.onlineText}>Agents online · ~5 min reply</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* Resume existing chats */}
          {!loadingChats && openChats.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Continue an open chat</Text>
              {openChats.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={styles.openChatCard}
                  onPress={() => router.push(`/(home)/support/ticket/${t.id}`)}
                  activeOpacity={0.7}
                >
                  <View style={styles.openChatIcon}>
                    <MessageCircle size={18} color={Colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.openChatTitle} numberOfLines={1}>{t.subject || t.ticketNumber}</Text>
                    <Text style={styles.openChatMeta}>{t.ticketNumber} · {t.statusLabel}</Text>
                  </View>
                  <ChevronRight size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              ))}
              <View style={styles.divider} />
            </View>
          )}

          {/* Welcome */}
          <View style={styles.welcomeCard}>
            <View style={styles.welcomeIcon}>
              <Sparkles size={24} color={Colors.primary} />
            </View>
            <Text style={styles.welcomeTitle}>Hi 👋 How can we help you today?</Text>
            <Text style={styles.welcomeDesc}>
              Pick a topic and tell us what's going on. A support agent will reply within a few minutes.
            </Text>
          </View>

          {/* Topic picker */}
          <Text style={styles.sectionTitle}>What's it about?</Text>
          <View style={styles.categoriesGrid}>
            {CATEGORY_OPTIONS.map((cat) => {
              const active = selectedCategory?.value === cat.value;
              return (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    styles.categoryChip,
                    { backgroundColor: cat.bg },
                    active && { borderColor: cat.color, borderWidth: 2 },
                  ]}
                  onPress={() => setSelectedCategory(cat)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.categoryChipText, { color: cat.color }]}>{cat.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Message field */}
          <Text style={styles.sectionTitle}>Describe your issue</Text>
          <TextInput
            style={styles.messageInput}
            placeholder={selectedCategory
              ? `Tell us more about your "${selectedCategory.label}"…`
              : 'Tell us what you need help with…'}
            placeholderTextColor={Colors.textMuted}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={5}
            editable={!creating}
          />

          <Text style={styles.privacyNote}>
            Our support team will reply shortly. You can also see this conversation in <Text style={{ fontWeight: FontWeight.bold, color: Colors.textPrimary }}>My Support Tickets</Text>.
          </Text>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.startButton, (!selectedCategory || !message.trim() || creating) && styles.startButtonDisabled]}
            onPress={handleStartChat}
            disabled={!selectedCategory || !message.trim() || creating}
          >
            {creating ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <>
                <Send size={16} color={Colors.white} />
                <Text style={styles.startButtonText}>Start Chat</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  onlineBadgeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: Spacing.screenH, paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1, borderBottomColor: Colors.surfaceBg,
  },
  onlineDot: { width: 6, height: 6, borderRadius: BorderRadius.indicator, backgroundColor: Colors.successAlt },  // 3 = indicator ✓
  onlineText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: FontWeight.medium },  // 11 = xs ✓

  content: { padding: Spacing.screenH, paddingBottom: Spacing['7xl'] },

  section: { marginBottom: Spacing.xs },

  openChatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xl,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.button,              // 14 = button ✓
    padding: Spacing['2xl'],
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBg,
  },
  openChatIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center', justifyContent: 'center',
  },
  openChatTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary },  // 14 = md ✓
  openChatMeta: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },  // 12 = sm ✓
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing['3xl'] },

  welcomeCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,                  // 16 = lg ✓
    padding: 18,
    marginBottom: Spacing['4xl'],
    borderWidth: 1,
    borderColor: Colors.surfaceBg,
  },
  welcomeIcon: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  welcomeTitle: { fontSize: FontSize['2xl'], fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: Spacing.xs },  // 18 = 2xl ✓
  welcomeDesc: { fontSize: FontSize.base, color: Colors.textSecondary, lineHeight: 18 },  // 13 = base ✓

  sectionTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: Spacing.xl, marginTop: Spacing.xs },  // 14 = md ✓

  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing['4xl'],
  },
  categoryChip: {
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.pill,                // 100 = pill ✓
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryChipText: { fontSize: FontSize.base, fontWeight: FontWeight.semibold },  // 13 = base ✓

  messageInput: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.button,              // 14 = button ✓
    padding: Spacing['2xl'],
    fontSize: FontSize.md,                          // 14 = md ✓
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 110,
    maxHeight: 200,
    textAlignVertical: 'top',
    marginBottom: Spacing['2xl'],
  },
  privacyNote: { fontSize: FontSize.sm, color: Colors.textMuted, lineHeight: 18 },  // 12 = sm ✓

  footer: {
    padding: Spacing['3xl'],
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBg,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing['2xl'],
    borderRadius: BorderRadius.button,              // 14 = button ✓
  },
  startButtonDisabled: { backgroundColor: Colors.borderMuted },
  startButtonText: { color: Colors.white, fontWeight: FontWeight.bold, fontSize: FontSize.lg },  // 15 = lg ✓
});
