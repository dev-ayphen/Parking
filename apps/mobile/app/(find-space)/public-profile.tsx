import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  Image,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { User, Star, MapPin, Car, AlertTriangle } from 'lucide-react-native';
import { api } from '../../services/api';
import PageHeader from '../../components/PageHeader';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing } from '../../theme';

interface PublicProfile {
  id: number;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
  role?: string;
  parkerProfile?: { totalBookings: number; averageRating: number } | null;
  ownerProfile?: { totalSpaces: number; averageRating: number } | null;
}

export default function PublicProfileScreen() {
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get(`/users/${userId}`);
      setProfile(data?.user ?? null);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Could not load this profile.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <PageHeader title="Profile" onBack={() => router.replace('/(find-space)')} />
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <PageHeader title="Profile" onBack={() => router.replace('/(find-space)')} />
        <View style={styles.center}>
          <AlertTriangle size={40} color={Colors.error} strokeWidth={1.5} />
          <Text style={styles.errorText}>{error || 'Profile not found'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchProfile}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const name = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'ParkSwift User';
  const owner = profile.ownerProfile;
  const parker = profile.parkerProfile;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <PageHeader title="Profile" onBack={() => router.replace('/(find-space)')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            {profile.photoUrl ? (
              <Image source={{ uri: profile.photoUrl }} style={styles.avatarImg} />
            ) : (
              <User size={36} color={Colors.primary} strokeWidth={2} />
            )}
          </View>
          <Text style={styles.name}>{name}</Text>
          {profile.role ? <Text style={styles.role}>{profile.role === 'OWNER' ? 'Space Owner' : profile.role === 'PARKER' ? 'Parker' : profile.role}</Text> : null}
        </View>

        {/* Owner stats */}
        {owner && (
          <View style={styles.statCard}>
            <Text style={styles.statCardTitle}>As a Space Owner</Text>
            <View style={styles.statRow}>
              <View style={styles.stat}>
                <MapPin size={18} color={Colors.primary} strokeWidth={2} />
                <Text style={styles.statValue}>{owner.totalSpaces}</Text>
                <Text style={styles.statLabel}>Spaces</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Star size={18} color={Colors.warning} fill={Colors.warning} strokeWidth={2} />
                <Text style={styles.statValue}>{owner.averageRating > 0 ? owner.averageRating.toFixed(1) : '—'}</Text>
                <Text style={styles.statLabel}>Rating</Text>
              </View>
            </View>
          </View>
        )}

        {/* Parker stats */}
        {parker && (
          <View style={styles.statCard}>
            <Text style={styles.statCardTitle}>As a Parker</Text>
            <View style={styles.statRow}>
              <View style={styles.stat}>
                <Car size={18} color={Colors.info} strokeWidth={2} />
                <Text style={styles.statValue}>{parker.totalBookings}</Text>
                <Text style={styles.statLabel}>Bookings</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Star size={18} color={Colors.warning} fill={Colors.warning} strokeWidth={2} />
                <Text style={styles.statValue}>{parker.averageRating > 0 ? parker.averageRating.toFixed(1) : '—'}</Text>
                <Text style={styles.statLabel}>Rating</Text>
              </View>
            </View>
          </View>
        )}

        {!owner && !parker && (
          <Text style={styles.noStats}>This user hasn't built up any activity yet.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg, padding: Spacing['4xl'] },
  errorText: { color: Colors.textSecondary, textAlign: 'center', fontSize: FontSize.base },
  retryBtn: { paddingHorizontal: Spacing['3xl'], paddingVertical: Spacing.lg, backgroundColor: Colors.primaryBg, borderRadius: BorderRadius.lg },
  retryBtnText: { color: Colors.primary, fontWeight: FontWeight.bold },
  content: { padding: Spacing.screenH, paddingBottom: Spacing['5xl'] },

  header: { alignItems: 'center', marginTop: Spacing.xl, marginBottom: Spacing['4xl'] },
  avatar: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', marginBottom: Spacing.xl,
  },
  avatarImg: { width: '100%', height: '100%' },
  name: { fontSize: FontSize['3xl'], fontWeight: FontWeight.black, color: Colors.textPrimary },
  role: { fontSize: FontSize.base, color: Colors.textSecondary, marginTop: Spacing.xs, fontWeight: FontWeight.medium },

  statCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing['3xl'],
    marginBottom: Spacing.screenH,
  },
  statCardTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: Spacing.xl },
  statRow: { flexDirection: 'row', alignItems: 'center' },
  stat: { flex: 1, alignItems: 'center', gap: Spacing.sm },
  statValue: { fontSize: FontSize['2xl'], fontWeight: FontWeight.extrabold, color: Colors.textPrimary },
  statLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  statDivider: { width: 1, height: 48, backgroundColor: Colors.borderLighter },
  noStats: { fontSize: FontSize.base, color: Colors.textMuted, textAlign: 'center', marginTop: Spacing['3xl'] },
});
