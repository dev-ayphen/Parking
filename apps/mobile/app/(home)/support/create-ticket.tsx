import React, { useState, useEffect } from 'react';
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
  Image} from 'react-native';
import { toast } from '../../../utils/toast';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { pickMedia } from '../../../utils/pickMedia';
import { Paperclip, ChevronDown, CheckCircle2, X } from 'lucide-react-native';
import PageHeader from '../../../components/PageHeader';
import ReportSubmitted from '../../../components/ReportSubmitted';
import { api } from '../../../services/api';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing } from '../../../theme';


const CATEGORIES: { label: string; value: string }[] = [
  { label: 'Booking', value: 'BOOKING' },
  { label: 'Space Owner', value: 'SPACE_OWNER' },
  { label: 'Subscription', value: 'SUBSCRIPTION' },
  { label: 'Account', value: 'ACCOUNT' },
  { label: 'Technical Issue', value: 'TECHNICAL' },
  { label: 'Other', value: 'OTHER' },
];
const PRIORITIES: { label: string; value: string }[] = [
  { label: 'Low', value: 'LOW' },
  { label: 'Normal', value: 'NORMAL' },
  { label: 'High', value: 'HIGH' },
  { label: 'Urgent', value: 'URGENT' },
];

export default function CreateTicketScreen() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');

  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');

  const [category, setCategory] = useState(CATEGORIES[0]);
  const [priority, setPriority] = useState(PRIORITIES[1]); // default NORMAL

  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [prefilling, setPrefilling] = useState(true);
  const [attachments, setAttachments] = useState<string[]>([]); // local URIs
  const [attaching, setAttaching] = useState(false);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);

  // Prefill contact details from user profile
  useEffect(() => {
    (async () => {
      try {
        const json = await api.get('/users/me');
        if (json.user) {
          setName([json.user.firstName, json.user.lastName].filter(Boolean).join(' '));
          setEmail(json.user.email || '');
          setMobile(json.user.phone || '');
        }
      } catch {}
      finally {
        setPrefilling(false);
      }
    })();
  }, []);

  const handlePickAttachment = async () => {
    try {
      const asset = await pickMedia({ allowsEditing: false });
      if (!asset) return;
      setAttachments((prev) => [...prev, asset.uri].slice(0, 5));
    } catch {
      toast.error('Failed to pick file');
    }
  };

  const removeAttachment = (uri: string) =>
    setAttachments((prev) => prev.filter((u) => u !== uri));

  const handleSubmit = async () => {
    if (submitting || submittedRef) return; // guard re-entry / double-tap
    if (!subject.trim() || !description.trim()) {
      toast.error('Subject and description are required.');
      return;
    }
    try {
      setSubmitting(true);

      // Upload any attachments first → get public URLs to include with the ticket.
      let attachmentUrls: string[] = [];
      if (attachments.length > 0) {
        setAttaching(true);
        const files = attachments.map((uri, i) => {
          const ext = (uri.split('.').pop() || 'jpg').toLowerCase();
          const type = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
          return { field: 'files', uri, name: `attachment_${i}.${ext}`, type };
        });
        const up = await api.upload('/uploads/evidence', files);
        attachmentUrls = up.urls || [];
        setAttaching(false);
      }

      const json = await api.post('/support', {
        subject: subject.trim(),
        description: description.trim(),
        category: category.value,
        priority: priority.value,
        contactName: name.trim() || undefined,
        contactEmail: email.trim() || undefined,
        contactPhone: mobile.trim() || undefined,
        attachmentUrls,
      });
      if (!json.success) {
        toast.error(json.error || 'Failed to create ticket');
        return;
      }
      setSubmittedRef(json.ticket.ticketNumber || 'SUP-PENDING');
      setSubmittedAt(json.ticket.createdAt || new Date().toISOString());
    } catch (e: any) {
      // api.post throws an ApiError on non-2xx. For rate limits (429) and
      // validation errors (400) the server's message is carried on e.message
      // (set to the response body's `error`), so prefer that. Only fall back to
      // a generic message for genuine network/timeout failures.
      const status: number | undefined = e?.status;
      const isClientError = typeof status === 'number' && status >= 400 && status < 500;
      const serverMessage: string | undefined = e?.message;
      if (isClientError && serverMessage) {
        toast.error(serverMessage);
      } else {
        toast.error(serverMessage || 'Network error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Post-submission success screen — same ReportSubmitted receipt as abuse/incident
  if (submittedRef) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <PageHeader title="Ticket Created" onBack={() => router.replace('/(home)/support/tickets')} />
        <View style={styles.successWrap}>
          <ReportSubmitted
            title="Ticket Created"
            reference={submittedRef}
            submittedAt={submittedAt || undefined}
          />
          <Text style={styles.successHint}>Our support team will get back to you soon. You can track progress in My Tickets.</Text>
          <TouchableOpacity
            style={styles.successBtn}
            onPress={() => router.replace('/(home)/support/tickets')}
            activeOpacity={0.85}
          >
            <Text style={styles.successBtnText}>View My Tickets</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <PageHeader title="Create Ticket" onBack={() => router.back()} />

      <KeyboardAvoidingView
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact Details</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Name</Text>
              {prefilling
                ? <View style={styles.skeletonField} />
                : <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Your full name"
                  />
              }
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: Spacing.md }]}>
                <Text style={styles.label}>Email</Text>
                {prefilling
                  ? <View style={styles.skeletonField} />
                  : <TextInput
                      style={styles.input}
                      value={email}
                      onChangeText={setEmail}
                      placeholder="Your email address"
                      keyboardType="email-address"
                    />
                }
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: Spacing.md }]}>
                <Text style={styles.label}>Mobile</Text>
                {prefilling
                  ? <View style={styles.skeletonField} />
                  : <TextInput
                      style={styles.input}
                      value={mobile}
                      onChangeText={setMobile}
                      placeholder="Your mobile number"
                      keyboardType="phone-pad"
                    />
                }
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Issue Details</Text>
            
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: Spacing.md, zIndex: 10 }]}>
                <Text style={styles.label}>Category</Text>
                <TouchableOpacity 
                  style={styles.dropdownButton}
                  onPress={() => {
                    setShowCategoryDropdown(!showCategoryDropdown);
                    setShowPriorityDropdown(false);
                  }}
                >
                  <Text style={styles.dropdownText}>{category.label}</Text>
                  <ChevronDown size={16} color={Colors.textSecondary} />
                </TouchableOpacity>
                {showCategoryDropdown && (
                  <View style={styles.dropdownMenu}>
                    {CATEGORIES.map((c) => (
                      <TouchableOpacity
                        key={c.value}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setCategory(c);
                          setShowCategoryDropdown(false);
                        }}
                      >
                        <Text style={[styles.dropdownItemText, category.value === c.value && { color: Colors.textPrimary, fontWeight: FontWeight.semibold }]}>{c.label}</Text>
                        {category.value === c.value && <CheckCircle2 size={16} color={Colors.successAlt} />}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <View style={[styles.inputGroup, { flex: 1, marginLeft: Spacing.md, zIndex: 9 }]}>
                <Text style={styles.label}>Priority</Text>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => {
                    setShowPriorityDropdown(!showPriorityDropdown);
                    setShowCategoryDropdown(false);
                  }}
                >
                  <Text style={styles.dropdownText}>{priority.label}</Text>
                  <ChevronDown size={16} color={Colors.textSecondary} />
                </TouchableOpacity>
                {showPriorityDropdown && (
                  <View style={styles.dropdownMenu}>
                    {PRIORITIES.map((p) => (
                      <TouchableOpacity
                        key={p.value}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setPriority(p);
                          setShowPriorityDropdown(false);
                        }}
                      >
                        <Text style={[styles.dropdownItemText, priority.value === p.value && { color: Colors.textPrimary, fontWeight: FontWeight.semibold }]}>{p.label}</Text>
                        {priority.value === p.value && <CheckCircle2 size={16} color={Colors.successAlt} />}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>
            
            <View style={[styles.inputGroup, { zIndex: 1 }]}>
              <Text style={styles.label}>Subject</Text>
              <TextInput 
                style={styles.input}
                value={subject}
                onChangeText={setSubject}
                placeholder="Brief summary of the issue"
              />
            </View>
            
            <View style={[styles.inputGroup, { zIndex: 1 }]}>
              <Text style={styles.label}>Description</Text>
              <TextInput 
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Please describe your issue in detail..."
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              style={styles.attachmentButton}
              activeOpacity={0.7}
              onPress={handlePickAttachment}
              disabled={attachments.length >= 5}
            >
              <Paperclip size={18} color={Colors.textSecondary} />
              <Text style={styles.attachmentText}>
                {attachments.length >= 5 ? 'Maximum 5 files' : 'Attach File/Screenshot (Optional)'}
              </Text>
            </TouchableOpacity>

            {attachments.length > 0 && (
              <View style={styles.attachmentThumbs}>
                {attachments.map((uri) => (
                  <View key={uri} style={styles.thumbWrap}>
                    <Image source={{ uri }} style={styles.thumb} />
                    <TouchableOpacity
                      style={styles.thumbRemove}
                      onPress={() => removeAttachment(uri)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <X size={12} color="#FFFFFF" strokeWidth={3} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, submitting && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Text style={styles.submitButtonText}>Submit Ticket</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  successWrap: {
    flex: 1,
    backgroundColor: Colors.screenBg,
    padding: Spacing.screenH,
  },
  successHint: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.xs,
  },
  successBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.button,
    paddingVertical: Spacing['3xl'],
    alignItems: 'center',
    marginTop: Spacing['3xl'],
  },
  successBtnText: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  scrollView: {
    flex: 1,
    backgroundColor: Colors.screenBg,
  },
  content: {
    padding: Spacing.screenH,
  },
  section: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing['3xl'],
    marginBottom: Spacing['3xl'],
    borderWidth: 1,
    borderColor: Colors.border,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  sectionTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xl,
  },
  row: {
    flexDirection: 'row',
  },
  inputGroup: {
    marginBottom: Spacing.xl,
  },
  label: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  input: {
    height: 48,
    backgroundColor: Colors.screenBg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.input,
    paddingHorizontal: Spacing['3xl'],
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  textArea: {
    height: 100,
    paddingTop: Spacing.xl,
    textAlignVertical: 'top',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    backgroundColor: Colors.screenBg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.input,
    paddingHorizontal: Spacing['3xl'],
  },
  dropdownText: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.input,
    marginTop: Spacing.xs,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing['3xl'],
    paddingVertical: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBg,
  },
  dropdownItemText: {
    fontSize: FontSize.md,                          // 14 = md ✓
    color: Colors.textSecondary,
  },
  skeletonField: {
    height: 48,
    borderRadius: BorderRadius.input,
    backgroundColor: Colors.surfaceBg,
  },
  attachmentThumbs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  thumbWrap: {
    position: 'relative',
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceBg,
  },
  thumbRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.borderMuted,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.input,
    backgroundColor: Colors.screenBg,
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  attachmentText: {
    fontSize: FontSize.md,                          // 14 = md ✓
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  footer: {
    padding: Spacing.screenH,
    paddingBottom: Platform.OS === 'ios' ? 34 : Spacing.screenH,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    height: 46,
    borderRadius: BorderRadius.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
});
