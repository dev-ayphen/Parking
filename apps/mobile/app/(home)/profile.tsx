import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Keyboard,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { pickMedia } from '../../utils/pickMedia';
import { User, Phone, Mail, Camera, ShieldAlert, X, QrCode } from 'lucide-react-native';
import { api } from '../../services/api';
import { PageHeader, ScreenLoader } from '../../components';
import { FontSize, FontWeight, BorderRadius, Spacing, ExtendedColors } from '../../theme';
import type { ColorsType } from '../../theme';
import { useTheme } from '../../hooks/useTheme';
import { toast } from '../../utils/toast';

interface UserProfile {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  photoUrl?: string;
  createdAt: string;
  role: string;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
}

const ProfileScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [upiId, setUpiId] = useState<string | null>(null);

  // ── Edit modal state ────────────────────────────────────────────
  const [modalVisible, setModalVisible] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [upiIdInput, setUpiIdInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  const loadProfile = async () => {
    try {
      setLoading(true);
      const startTime = Date.now();
      const data = await api.get('/users/me');
      if (data.success && data.user) {
        setUser(data.user);
      }
      // UPI ID lives in the billing profile (shared owner-receive / parker-refund field)
      try {
        const billing = await api.get('/users/me/billing');
        setUpiId(billing?.billing?.upiId || null);
      } catch {
        // non-fatal — UPI row just shows "Not set"
      }
      const elapsed = Date.now() - startTime;
      if (elapsed < 300) await new Promise(r => setTimeout(r, 300 - elapsed));
    } catch {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePickPhoto = async () => {
    try {
      const asset = await pickMedia({ aspect: [1, 1] });
      if (!asset) return;

      setPhotoUploading(true);

      // Derive a filename + mime from the picked asset.
      const uriExt = (asset.uri.split('.').pop() || 'jpg').toLowerCase();
      const ext = uriExt === 'png' ? 'png' : uriExt === 'webp' ? 'webp' : 'jpg';
      const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

      const res = await api.upload(
        '/users/me/photo',
        [{ field: 'file', uri: asset.uri, name: `profile.${ext}`, type: mime }]
      );

      if (res.success && res.photoUrl) {
        setUser((u) => (u ? { ...u, photoUrl: res.photoUrl } : u));
      }
    } catch (e) {
      toast.error((e as Error).message || 'Could not update photo.');
    } finally {
      setPhotoUploading(false);
    }
  };

  const openEditModal = () => {
    if (!user) return;
    setFirstName(user.firstName || '');
    setLastName(user.lastName || '');
    setEmail(user.email || '');
    setEmergencyContactName(user.emergencyContactName || '');
    setEmergencyContactPhone(user.emergencyContactPhone || '');
    setUpiIdInput(upiId || '');
    setErrors({});
    setModalVisible(true);
  };

  const closeModal = () => {
    Keyboard.dismiss();
    setModalVisible(false);
  };

  const validateForm = () => {
    const e: Record<string, string> = {};
    if (!firstName.trim()) e.firstName = 'First name is required';
    else if (firstName.trim().length < 2) e.firstName = 'At least 2 characters';
    else if (!/^[a-zA-Z ]+$/.test(firstName)) e.firstName = 'Letters only';

    if (!lastName.trim()) e.lastName = 'Last name is required';
    else if (!/^[a-zA-Z ]+$/.test(lastName)) e.lastName = 'Letters only';

    if (!email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Invalid email';

    if (emergencyContactPhone.trim() && !/^[6-9]\d{9}$/.test(emergencyContactPhone.replace(/^\+91/, ''))) {
      e.emergencyContactPhone = 'Enter a valid 10-digit number';
    }

    if (upiIdInput.trim() && !/^[a-z0-9.\-_]{2,256}@[a-z]{2,64}$/i.test(upiIdInput.trim())) {
      e.upiId = 'Enter a valid UPI ID (e.g. name@okhdfcbank)';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    try {
      setSaving(true);
      const data = await api.put('/users/me', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        emergencyContactName: emergencyContactName.trim() || null,
        emergencyContactPhone: emergencyContactPhone.trim() || null,
      });
      // UPI ID lives in the billing profile — save it separately, only when changed.
      const trimmedUpi = upiIdInput.trim().toLowerCase();
      if (trimmedUpi !== (upiId || '').toLowerCase()) {
        await api.put('/users/me/billing', { upiId: trimmedUpi });
      }
      if (data.success) {
        closeModal();
        await loadProfile();
      }
    } catch (err) {
      toast.error((err as Error).message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (d?: string | null) => {
    if (!d) return '—';
    const date = new Date(d);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.screenBg }]}>
        <PageHeader title="My Profile"  onBack={() => router.replace('/(home)')} />
        <ScreenLoader />
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.white }]}>
        <PageHeader title="My Profile"  onBack={() => router.replace('/(home)')} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: colors.textSecondary }}>Failed to load profile</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.white }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <PageHeader title="My Profile"  onBack={() => router.replace('/(home)')} />

      <ScrollView style={[styles.content, { backgroundColor: colors.screenBg }]} showsVerticalScrollIndicator={false}>
        <View style={styles.detailsCard}>
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <TouchableOpacity
              style={styles.avatarContainer}
              activeOpacity={0.8}
              onPress={handlePickPhoto}
              disabled={photoUploading}
            >
              {/* Inner circle clips the image; the badge lives OUTSIDE it so it
                  isn't cut off by overflow:hidden. */}
              <View style={styles.avatarCircle}>
                {user.photoUrl ? (
                  <Image source={{ uri: user.photoUrl }} style={styles.avatarImage} onError={() => {}} />
                ) : (
                  <User size={32} color={colors.primary} strokeWidth={2.5} />
                )}
                {photoUploading && (
                  <View style={styles.avatarUploading}>
                    <ActivityIndicator color={colors.white} size="small" />
                  </View>
                )}
              </View>
              <View style={styles.editAvatarBadge}>
                <Camera size={14} color={colors.white} strokeWidth={2.5} />
              </View>
            </TouchableOpacity>
            <Text style={styles.userName}>{user.firstName} {user.lastName}</Text>
            <Text style={styles.verifiedText}>Mobile Verified ✓</Text>
            <Text style={styles.memberSinceText}>Member Since {formatDate(user.createdAt)}</Text>
          </View>

          <View style={styles.cardDivider} />

          {/* Phone */}
          <View style={styles.field}>
            <View style={styles.fieldIconBox}>
              <Phone size={16} color={colors.textBody} strokeWidth={2.5} />
            </View>
            <View style={styles.fieldTextContainer}>
              <Text style={styles.fieldLabel}>Mobile Number</Text>
              <Text style={styles.fieldValue}>{user.phone}</Text>
            </View>
          </View>
          <View style={styles.divider} />

          {/* Email */}
          <View style={styles.field}>
            <View style={styles.fieldIconBox}>
              <Mail size={16} color={colors.textBody} strokeWidth={2.5} />
            </View>
            <View style={styles.fieldTextContainer}>
              <Text style={styles.fieldLabel}>Email</Text>
              <Text style={styles.fieldValue}>{user.email}</Text>
            </View>
          </View>
          <View style={styles.divider} />

          {/* Emergency */}
          <View style={styles.field}>
            <View style={[styles.fieldIconBox, { backgroundColor: colors.primaryBg }]}>
              <ShieldAlert size={16} color={colors.primary} strokeWidth={2.5} />
            </View>
            <View style={styles.fieldTextContainer}>
              <Text style={styles.fieldLabel}>Emergency Contact</Text>
              {(user.emergencyContactName || user.emergencyContactPhone) ? (
                <Text style={styles.fieldValue}>
                  {user.emergencyContactName || '—'}
                  {user.emergencyContactPhone ? ` • ${user.emergencyContactPhone}` : ''}
                </Text>
              ) : (
                <Text style={[styles.fieldValue, { color: colors.textMuted, fontWeight: FontWeight.medium }]}>
                  Not set — tap Edit Profile to add
                </Text>
              )}
            </View>
          </View>
          <View style={styles.divider} />

          {/* UPI ID */}
          <View style={styles.field}>
            <View style={[styles.fieldIconBox, { backgroundColor: colors.primaryBg }]}>
              <QrCode size={16} color={colors.primary} strokeWidth={2.5} />
            </View>
            <View style={styles.fieldTextContainer}>
              <Text style={styles.fieldLabel}>UPI ID</Text>
              {upiId ? (
                <Text style={styles.fieldValue}>{upiId}</Text>
              ) : (
                <Text style={[styles.fieldValue, { color: colors.textMuted, fontWeight: FontWeight.medium }]}>
                  Not set — tap Edit Profile to add
                </Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.buttonGroup}>
          <TouchableOpacity style={styles.editButton} activeOpacity={0.8} onPress={openEditModal}>
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Edit Profile Bottom Sheet Modal ── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={closeModal} />

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.modalSheet, { paddingBottom: insets.bottom + 8 }]}
          >
            {/* Handle bar */}
            <View style={styles.handleBar} />

            {/* Modal header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={closeModal} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <X size={20} color={colors.textSecondary} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.modalForm}>

                {/* First Name */}
                <View style={styles.row}>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.label}>First Name *</Text>
                    <TextInput
                      style={[styles.input, errors.firstName ? styles.inputError : null]}
                      placeholder="First name"
                      placeholderTextColor={colors.textMuted}
                      value={firstName}
                      onChangeText={t => { setFirstName(t); setErrors(p => ({ ...p, firstName: '' })); }}
                      editable={!saving}
                    />
                    {errors.firstName ? <Text style={styles.errorText}>{errors.firstName}</Text> : null}
                  </View>

                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.label}>Last Name *</Text>
                    <TextInput
                      style={[styles.input, errors.lastName ? styles.inputError : null]}
                      placeholder="Last name"
                      placeholderTextColor={colors.textMuted}
                      value={lastName}
                      onChangeText={t => { setLastName(t); setErrors(p => ({ ...p, lastName: '' })); }}
                      editable={!saving}
                    />
                    {errors.lastName ? <Text style={styles.errorText}>{errors.lastName}</Text> : null}
                  </View>
                </View>

                {/* Email */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Email Address *</Text>
                  <TextInput
                    style={[styles.input, errors.email ? styles.inputError : null]}
                    placeholder="Enter email address"
                    placeholderTextColor={colors.textMuted}
                    value={email}
                    onChangeText={t => { setEmail(t); setErrors(p => ({ ...p, email: '' })); }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!saving}
                  />
                  {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
                </View>

                {/* Emergency section */}
                <View style={styles.sectionDivider}>
                  <Text style={styles.sectionTitle}>Emergency Contact</Text>
                  <Text style={styles.sectionSubtitle}>Used during parking-related incidents (optional)</Text>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Contact Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Father, Spouse, Friend"
                    placeholderTextColor={colors.textMuted}
                    value={emergencyContactName}
                    onChangeText={setEmergencyContactName}
                    editable={!saving}
                    maxLength={100}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Contact Phone</Text>
                  <TextInput
                    style={[styles.input, errors.emergencyContactPhone ? styles.inputError : null]}
                    placeholder="10-digit mobile number"
                    placeholderTextColor={colors.textMuted}
                    value={emergencyContactPhone}
                    onChangeText={t => { setEmergencyContactPhone(t.replace(/[^0-9]/g, '')); setErrors(p => ({ ...p, emergencyContactPhone: '' })); }}
                    keyboardType="phone-pad"
                    maxLength={10}
                    editable={!saving}
                  />
                  {errors.emergencyContactPhone ? <Text style={styles.errorText}>{errors.emergencyContactPhone}</Text> : null}
                </View>

                {/* UPI section */}
                <View style={styles.sectionDivider}>
                  <Text style={styles.sectionTitle}>UPI ID</Text>
                  <Text style={styles.sectionSubtitle}>Used to receive parking payments & refunds (optional)</Text>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>UPI ID</Text>
                  <TextInput
                    style={[styles.input, errors.upiId ? styles.inputError : null]}
                    placeholder="e.g. name@okhdfcbank"
                    placeholderTextColor={colors.textMuted}
                    value={upiIdInput}
                    onChangeText={t => { setUpiIdInput(t.replace(/\s/g, '')); setErrors(p => ({ ...p, upiId: '' })); }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!saving}
                  />
                  {errors.upiId ? <Text style={styles.errorText}>{errors.upiId}</Text> : null}
                </View>

                {/* Save */}
                <TouchableOpacity
                  style={[styles.saveButton, saving && { opacity: 0.6 }]}
                  onPress={handleSave}
                  disabled={saving}
                  activeOpacity={0.8}
                >
                  {saving
                    ? <ActivityIndicator color={colors.white} size="small" />
                    : <Text style={styles.saveButtonText}>Save Changes</Text>
                  }
                </TouchableOpacity>

              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const makeStyles = (colors: ColorsType) => StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: Spacing['3xl'],
    paddingTop: Spacing['3xl'],
  },

  // ── Profile card ───────────────────────────────────────────────
  detailsCard: {
    backgroundColor: colors.white,
    borderRadius: BorderRadius.circleXl,
    padding: Spacing['3xl'],
    marginBottom: Spacing.screenH,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: Spacing.screenH,
    paddingTop: Spacing.md,
  },
  avatarContainer: {
    // Outer wrapper — positions the camera badge. NO overflow:hidden here, or
    // the badge (which sits at bottom/right: -4) gets clipped.
    width: 72,
    height: 72,
    marginBottom: Spacing['3xl'],
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircle: {
    // Inner circle — clips the avatar image into a round shape.
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.primaryBg,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 36,
  },
  avatarUploading: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 36,
  },
  editAvatarBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: colors.primary,
    width: 28,
    height: 28,
    borderRadius: BorderRadius.button,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  userName: {
    fontSize: FontSize['3xl'],
    fontWeight: FontWeight.extrabold,
    color: colors.textPrimary,
    marginBottom: Spacing.md,
  },
  verifiedText: {
    fontSize: FontSize.base,
    color: colors.successAlt,
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  memberSinceText: {
    fontSize: FontSize.sm,
    color: colors.textMuted,
    fontWeight: FontWeight.medium,
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: Spacing.xl,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  fieldIconBox: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.md,
    backgroundColor: colors.screenBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBg,
  },
  fieldTextContainer: { flex: 1 },
  fieldLabel: {
    fontSize: FontSize.xs,
    color: colors.textSecondary,
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.micro,
  },
  fieldValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.surfaceBg,
    marginVertical: Spacing.micro,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: Spacing.xl,
    marginBottom: Spacing['7xl'],
  },
  editButton: {
    backgroundColor: colors.textPrimary,
    borderRadius: BorderRadius.button,
    paddingVertical: Spacing['3xl'],
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  editButtonText: {
    color: colors.white,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },

  // ── Modal bottom sheet ─────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 20,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBg,
  },
  modalTitle: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.bold,
    color: colors.textPrimary,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.screenBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalForm: {
    padding: 20,
    paddingBottom: 8,
  },

  // ── Form fields ────────────────────────────────────────────────
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: FontSize.md,
    color: colors.textPrimary,
    backgroundColor: colors.white,
  },
  inputError: {
    borderColor: colors.errorAlt,
    backgroundColor: ExtendedColors.primaryTint3,
  },
  errorText: {
    fontSize: FontSize.xs,
    color: colors.errorAlt,
    marginTop: 4,
    fontWeight: FontWeight.medium,
  },
  sectionDivider: {
    marginTop: 4,
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: FontSize.xs,
    color: colors.textSecondary,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: BorderRadius.button,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
});

export default ProfileScreen;
