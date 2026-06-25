import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  Animated,
  Image,
  Modal,
  TextInput,
  DeviceEventEmitter,
  Linking} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, Clock, Car, Shield, Zap, Droplets, Star, Camera, User, AlertTriangle, Minus, Plus, PlayCircle, Image as ImageIcon, Flag, X, Navigation, Bell, BellRing, ChevronRight } from 'lucide-react-native';
import LeafletMap from '../../components/LeafletMap';
import PageHeader from '../../components/PageHeader';
import ReportSubmitted from '../../components/ReportSubmitted';
import { VideoView, useVideoPlayer } from 'expo-video';
import { api } from '../../services/api';
import { getRatingStyle, formatCount } from '../../utils/ratingUtils';
import { useAuthStore } from '../../store/authStore';
import { FontSize, FontWeight, BorderRadius, Spacing, ExtendedColors } from '../../theme';
import { useNetworkStore, NETWORK_RECONNECTED } from '../../store/networkStore';
import { useTheme, type AppTheme } from '../../hooks/useTheme';

interface AmenityItem {
  id: string;
  name: string;
  icon: React.ReactNode;
}

// spaceType -> risk level (mirrors backend document.service SPACE_TYPE_RULES)
const RISK_MAP: Record<string, 'LOW' | 'MEDIUM' | 'HIGH'> = {
  'Independent House': 'LOW',
  'Rented House': 'MEDIUM',
  'Apartment Owner Slot': 'LOW',
  'Apartment Tenant Slot': 'MEDIUM',
  'Gated Villa': 'LOW',
  'Shop Front Parking': 'MEDIUM',
  'Office Parking': 'LOW',
  'Vacant Private Land': 'LOW',
  'Inside Compound': 'MEDIUM',
  'Open Frontage Area': 'HIGH',
};

const getRiskStyle = ({ colors: C }: AppTheme) => ({
  LOW:    { label: 'Low Risk',    color: C.success,  bg: C.successBg,     border: ExtendedColors.greenBorderLight,         note: 'Standard private space. Verify surroundings before parking.' },
  MEDIUM: { label: 'Medium Risk', color: C.warning,  bg: C.warningBgAlt,  border: ExtendedColors.warningYellowBorderAlt,   note: 'Shared/rented space. Confirm access and local parking rules.' },
  HIGH:   { label: 'High Risk',   color: C.error,    bg: C.errorBg,       border: ExtendedColors.redBorder,                note: 'Open/roadside area. You accept full responsibility for fines or towing.' },
});

// Quick-pick durations (whole hours; backend caps at 24)
const DURATION_PRESETS = [1, 2, 4, 8, 12, 24];
const MAX_DURATION_HOURS = 24;

const SpaceDetailScreen = () => {
  const theme = useTheme();
  const { colors: C, isDark } = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const router = useRouter();
  const params = useLocalSearchParams();
  const currentUser = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(false);
  const [selectedDurationHours, setSelectedDurationHours] = useState(1);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [mediaTab, setMediaTab] = useState<'photos' | 'videos'>('photos');
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  // Full space record fetched from the API (richer than search params)
  const [space, setSpace] = useState<any>(null);
  const [fetching, setFetching] = useState(true);

  // Report listing modal
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportType, setReportType] = useState('FAKE_SPACE');
  const [reportDesc, setReportDesc] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportRef, setReportRef] = useState<string | null>(null);
  const [reportSubmittedAt, setReportSubmittedAt] = useState<string | null>(null);

  // "Notify me when available" — only relevant while the space is full.
  const [alertSubscribed, setAlertSubscribed] = useState(false);
  const [alertBusy, setAlertBusy] = useState(false);

  // Parse params (instant display while the full record loads).
  // NOTE: never substitute fabricated money/coords. A non-finite parse → null so
  // the UI shows a skeleton/"—" instead of a misleading hardcoded value.
  const spaceId = parseInt(params.spaceId as string, 10);
  const pSpaceName = (params.spaceName as string) || 'Parking Space';
  const pAddress = (params.address as string) || 'Unknown Address';
  const numOrNull = (raw: unknown): number | null => {
    const n = parseFloat(raw as string);
    return Number.isFinite(n) ? n : null;
  };
  const pPricePerHour = numOrNull(params.pricePerHour);
  const pAvailableSlots = numOrNull(params.availableSlots);
  const pTotalSlots = numOrNull(params.totalSlots);
  const distance = numOrNull(params.distance) ?? 0;
  const pLat = numOrNull(params.lat);
  const pLng = numOrNull(params.lng);
  const pFrontPhotoUrl = (params.frontPhotoUrl as string) || '';
  const pRawAmenities: string[] = (() => {
    try { return JSON.parse(params.amenities as string || '[]'); }
    catch { return []; }
  })();

  // Fetch the full space record
  const loadSpace = useCallback(async () => {
    try {
      const json = await api.get(`/spaces/${spaceId}`);
      setSpace(json.space || json.data || json);
    } catch (e) {
      if (__DEV__) console.log('[SPACE_DETAIL] fetch error', e);
    } finally {
      setFetching(false);
    }
  }, [spaceId]);

  useEffect(() => { loadSpace(); }, [loadSpace]);

  // Re-fetch when connectivity is restored (the offline banner's "Retry" /
  // auto-reconnect emits this) so the screen isn't left showing stale data.
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(NETWORK_RECONNECTED, () => loadSpace());
    return () => sub.remove();
  }, [loadSpace]);

  // Merge — prefer the fetched record, fall back to params. Money/slots/coords may
  // be null when genuinely missing (then we render skeletons/"—", never fakes).
  const spaceName = space?.name ?? pSpaceName;
  const address = space?.address ?? pAddress;
  const landmark = space?.landmark ?? null;
  const rawPrice = space?.hourlyRate ?? pPricePerHour;
  const pricePerHour: number | null = Number.isFinite(rawPrice) ? Number(rawPrice) : null;
  const totalSlots: number | null = space?.capacity ?? pTotalSlots ?? null;
  // Live availability from API (capacity − active bookings); params only as pre-load fallback
  const availableSlots: number | null = space?.availableSpots ?? pAvailableSlots ?? null;
  // Real space rating (0 ⇒ no reviews yet ⇒ "New" badge); never use the fake param default
  const rating = space?.ratingAvg ?? 0;
  const ratingCount = space?.ratingCount ?? 0;
  // Coords: only valid when present; missing → no map marker (don't drop a pin on Chennai).
  const lat: number | null = space?.lat ?? pLat;
  const lng: number | null = space?.lng ?? pLng;
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
  const frontPhotoUrl = space?.frontPhotoUrl ?? pFrontPhotoUrl;
  const areaPhotoUrl = space?.areaPhotoUrl ?? '';
  const videoUrl = space?.videoUrl ?? null;
  // expo-video player (replaces expo-av <Video>). Hook must run unconditionally;
  // a null source simply yields an idle player until a video URL arrives.
  const videoPlayer = useVideoPlayer(videoUrl, (player) => {
    player.loop = true;
  });
  const photos = [frontPhotoUrl, areaPhotoUrl].filter(Boolean);
  const rawAmenities: string[] = space?.amenities ?? pRawAmenities;

  const spaceType: string | null = space?.spaceType ?? null;
  const parkingFor: string | null = space?.parkingFor ?? null;
  const availability: string | null = space?.availability ?? null;
  const startTimeVal: string | null = space?.startTime ?? null;
  const endTimeVal: string | null = space?.endTime ?? null;

  const ownerName = space?.owner
    ? [space.owner.firstName, space.owner.lastName].filter(Boolean).join(' ') || null
    : null;
  const ownerPhoto = space?.owner?.photoUrl ?? null;

  const riskKey = spaceType ? RISK_MAP[spaceType] : null;
  const risk = riskKey ? getRiskStyle(theme)[riskKey] : null;

  // Client-side total is a DISPLAY ESTIMATE only — the authoritative amount is
  // whatever the server returns at booking-confirm / session-complete. When the
  // hourly price is unknown, leave the estimate null so we render "—", not ₹0.
  const basePrice: number | null = pricePerHour != null ? pricePerHour * selectedDurationHours : null;
  const totalPrice: number | null = basePrice;

  // "Full" only when we KNOW availability and it's 0. While slots are unknown
  // (null, still loading) we don't disable the button on a guess.
  const isFull = availableSlots != null && availableSlots <= 0;

  const amenityIconMap: Record<string, React.ReactNode> = {
    'CCTV': <Shield size={14} color={C.textSecondary} strokeWidth={2.5} />,
    'Covered': <Car size={14} color={C.textSecondary} strokeWidth={2.5} />,
    'Security': <Shield size={14} color={C.textSecondary} strokeWidth={2.5} />,
    'EV Charging': <Zap size={14} color={C.textSecondary} strokeWidth={2.5} />,
    'Night Lighting': <Zap size={14} color={C.textSecondary} strokeWidth={2.5} />,
    '24/7 Access': <Clock size={14} color={C.textSecondary} strokeWidth={2.5} />,
    'Water Available': <Droplets size={14} color={C.textSecondary} strokeWidth={2.5} />,
  };
  const amenities: AmenityItem[] = rawAmenities.map((a, i) => ({
    id: String(i),
    name: a,
    icon: amenityIconMap[a] || <Car size={14} color={C.textSecondary} strokeWidth={2.5} />,
  }));

  const availabilityText = availability
    ? availability === 'Custom Hours' && startTimeVal && endTimeVal
      ? `${startTimeVal} – ${endTimeVal}`
      : availability
    : null;

  const handleScroll = (event: any) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    const roundIndex = Math.round(index);
    if (roundIndex !== activePhotoIndex) {
      setActivePhotoIndex(roundIndex);
    }
  };

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const isOwnSpace = space?.ownerId && currentUser?.id && space.ownerId === currentUser.id;

  // Once we know the space is full (and not the user's own), check whether they
  // already hold a "notify me" alert so the button shows the right state.
  useEffect(() => {
    if (!Number.isFinite(spaceId) || !isFull || isOwnSpace) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(`/spaces/${spaceId}/availability-alert`);
        if (!cancelled) setAlertSubscribed(!!res?.subscribed);
      } catch { /* non-critical — default to not subscribed */ }
    })();
    return () => { cancelled = true; };
  }, [spaceId, isFull, isOwnSpace]);

  const SPACE_REPORT_REASONS: { value: string; label: string }[] = [
    { value: 'FAKE_SPACE',          label: 'Fake or non-existent space' },
    { value: 'MISLEADING_LISTING',  label: 'Wrong address / incorrect photos' },
    { value: 'UNSAFE_AREA',         label: 'Unsafe or dangerous area' },
    { value: 'ILLEGAL_PARKING',     label: 'Illegal parking location' },
    { value: 'OTHER',               label: 'Other issue' },
  ];

  const handleSubmitReport = async () => {
    if (reportSubmitting || reportRef) return; // guard re-entry / double-tap
    if (reportDesc.trim().length < 5) {
      Alert.alert('Too short', 'Please describe the issue (at least 5 characters).');
      return;
    }
    const ownerId = space?.ownerId || space?.owner?.id;
    if (!ownerId) return;
    try {
      setReportSubmitting(true);
      const res = await api.post('/abuse-reports', {
        reportedUserId: ownerId,
        abuseType: reportType,
        description: reportDesc.trim(),
      });
      const reportId = res?.report?.id;
      setReportRef(reportId ? `ABU-${String(reportId).padStart(5, '0')}` : 'ABU-PENDING');
      setReportSubmittedAt(res?.report?.createdAt || new Date().toISOString());
      setReportModalVisible(false);
      setReportDesc('');
    } catch (err: any) {
      Alert.alert('Failed', err?.message || 'Could not submit report. Try again.');
    } finally {
      setReportSubmitting(false);
    }
  };

  const proceedToVehicleSelect = () => {
    // Price must be known to continue — these are passed forward as the estimate
    // (the server still computes the authoritative amount at confirm/complete).
    if (pricePerHour == null || basePrice == null || totalPrice == null) {
      Alert.alert('Price Unavailable', 'This space\'s price could not be loaded. Please try again in a moment.');
      return;
    }
    router.push({
      pathname: '/(find-space)/vehicle-select',
      params: {
        spaceId,
        spaceName,
        address,
        durationHours: selectedDurationHours,
        pricePerHour,
        basePrice,
        totalPrice,
      },
    });
  };

  // Toggle the "notify me when available" alert for a full space.
  const handleToggleAlert = async () => {
    if (!useNetworkStore.getState().requireOnline()) return;
    if (alertBusy) return;
    setAlertBusy(true);
    try {
      if (alertSubscribed) {
        await api.delete(`/spaces/${spaceId}/availability-alert`);
        setAlertSubscribed(false);
      } else {
        const res = await api.post(`/spaces/${spaceId}/availability-alert`);
        if (res?.available) {
          // A slot opened up between load and tap — just let them book.
          setAlertSubscribed(false);
          await loadSpace();
          Alert.alert('Good news', 'A spot just opened up — you can book it now.');
        } else {
          setAlertSubscribed(true);
          Alert.alert("We'll let you know", "You'll be notified the moment a spot opens up here.");
        }
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not update your alert. Please try again.');
    } finally {
      setAlertBusy(false);
    }
  };

  const handleBookNow = () => {
    if (!useNetworkStore.getState().requireOnline()) return;
    // If user owns this space, navigate to manage
    if (isOwnSpace) {
      router.push({
        pathname: '/(my-spaces)/spaces',
      });
      return;
    }

    // Otherwise, proceed with booking
    if (!selectedDurationHours || selectedDurationHours < 1) {
      Alert.alert('Invalid Duration', 'Please select at least 1 hour');
      return;
    }

    // HIGH-risk (roadside / open-frontage) spaces require an explicit
    // acknowledgment that the parker proceeds at their own responsibility. We
    // record it server-side as legal evidence before continuing. Lower-risk
    // spaces go straight through.
    if (riskKey === 'HIGH') {
      Alert.alert(
        'Proceed at Your Own Responsibility',
        'This is an open roadside space. ParkSwift cannot guarantee its safety, and you book it entirely at your own risk. Do you want to continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'I Understand, Continue',
            style: 'destructive',
            onPress: async () => {
              // Best-effort: record the acknowledgment, but never block the
              // booking if the network call fails.
              try {
                await api.post(`/spaces/${spaceId}/roadside-acknowledgment`, {
                  platform: Platform.OS,
                });
              } catch {
                // swallow — acknowledgment is best-effort evidence
              }
              proceedToVehicleSelect();
            },
          },
        ],
      );
      return;
    }

    proceedToVehicleSelect();
  };

  const handleGetDirections = () => {
    if (!address) {
      Alert.alert('Address not available', 'Could not open directions');
      return;
    }
    const encodedAddress = encodeURIComponent(address);
    const googleMapsUrl = `https://www.google.com/maps/search/${encodedAddress}`;
    const appleMapsUrl = `maps://maps.apple.com/?address=${encodedAddress}`;

    const url = Platform.OS === 'ios' ? appleMapsUrl : googleMapsUrl;
    Linking.openURL(url).catch(() => {
      // Fallback: open Google Maps on iOS if Apple Maps fails
      if (Platform.OS === 'ios') {
        Linking.openURL(googleMapsUrl).catch(() => {
          Alert.alert('Error', 'Could not open maps application');
        });
      }
    });
  };

  const rs = getRatingStyle(rating);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <PageHeader
        title="Space Details"
        onBack={() => router.replace('/(find-space)')}
      />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <Animated.View style={{ opacity: fadeAnim }}>

          {/* ── Hero Media ── */}
          <View style={styles.heroWrap}>
            {photos.length > 0 ? (
              <>
                {mediaTab === 'photos' ? (
                  <ScrollView
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={handleScroll}
                    style={StyleSheet.absoluteFill}
                  >
                    {photos.map((uri, i) => (
                      <Image
                        key={i}
                        source={{ uri }}
                        style={[styles.heroImg, { width: 400 }]} // hardcode width for now or use Dimensions
                        resizeMode="cover"
                      />
                    ))}
                  </ScrollView>
                ) : (
                  <View style={StyleSheet.absoluteFill}>
                    {videoUrl ? (
                      <VideoView
                        player={videoPlayer}
                        style={StyleSheet.absoluteFill}
                        contentFit="cover"
                        nativeControls
                      />
                    ) : (
                      <View style={styles.heroFallback}>
                        <PlayCircle size={36} color={C.borderMuted} strokeWidth={1.5} />
                        <Text style={styles.heroFallbackText}>No video available</Text>
                      </View>
                    )}
                  </View>
                )}
                
                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={StyleSheet.absoluteFill} pointerEvents="none" />
                
                {/* Dots */}
                {mediaTab === 'photos' && photos.length > 1 && (
                  <View style={styles.dotsContainer}>
                    {photos.map((_, i) => (
                      <View key={i} style={[styles.dot, i === activePhotoIndex && styles.dotActive]} />
                    ))}
                  </View>
                )}

                {/* Tabs Overlay */}
                <View style={styles.mediaTabs}>
                  <TouchableOpacity
                    style={[styles.mediaTab, mediaTab === 'photos' && styles.mediaTabActive]}
                    onPress={() => setMediaTab('photos')}
                    activeOpacity={0.8}
                  >
                    <ImageIcon size={14} color={mediaTab === 'photos' ? C.white : C.textMuted} strokeWidth={2.5} />
                    <Text style={[styles.mediaTabText, mediaTab === 'photos' && styles.mediaTabTextActive]}>Photos</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.mediaTab, mediaTab === 'videos' && styles.mediaTabActive]}
                    onPress={() => setMediaTab('videos')}
                    activeOpacity={0.8}
                  >
                    <PlayCircle size={14} color={mediaTab === 'videos' ? C.white : C.textMuted} strokeWidth={2.5} />
                    <Text style={[styles.mediaTabText, mediaTab === 'videos' && styles.mediaTabTextActive]}>Videos</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={styles.heroFallback}>
                <Camera size={36} color={C.borderMuted} strokeWidth={1.5} />
                <Text style={styles.heroFallbackText}>No media available</Text>
              </View>
            )}
          </View>

          {/* ── Main Content Wrapper ── */}
          <View style={styles.body}>
            {/* ── Compact Info Card ── */}
            <View style={styles.compactCard}>
              <View style={styles.compactHeader}>
                <View style={{ flex: 1, paddingRight: Spacing.xl }}>
                  <Text style={styles.spaceName}>{spaceName}</Text>
                </View>
                <View style={styles.priceBadge}>
                  {fetching || pricePerHour == null ? (
                    <View style={styles.skeletonChip} />
                  ) : (
                    <Text style={styles.priceBadgeValue}>₹{pricePerHour}<Text style={styles.priceBadgeUnit}>/hr</Text></Text>
                  )}
                </View>
              </View>

              <View style={styles.addressContainer}>
                <View style={styles.addressIconWrap}>
                  <MapPin size={14} color={C.primary} strokeWidth={2.5} />
                </View>
                <View style={styles.addressWithButton}>
                  <Text style={styles.addressText}>{address}{landmark ? ` · ${landmark}` : ''}</Text>
                  <TouchableOpacity
                    onPress={handleGetDirections}
                    style={styles.directionsBtn}
                    activeOpacity={0.7}
                  >
                    <View style={styles.directionsBtnContent}>
                      <Navigation size={12} color={C.white} strokeWidth={2.5} />
                      <Text style={styles.directionsBtnText}>Directions</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.cardDivider} />

              <View style={styles.metaRow}>
                <View style={[styles.ratingChip, { backgroundColor: rs.bgColor }]}>
                  {!rs.isNew && <Star size={12} color={rs.iconColor} fill={rs.iconColor} />}
                  <Text style={[styles.ratingChipText, { color: rs.textColor }]}>{rs.label}</Text>
                </View>
                {ratingCount > 0 && (
                  <TouchableOpacity
                    style={styles.reviewsLinkBtn}
                    onPress={() =>
                      router.push({
                        pathname: '/(find-space)/space-reviews',
                        params: { spaceId, spaceName, ratingAvg: String(rating), ratingCount: String(ratingCount) },
                      })
                    }
                    activeOpacity={0.6}
                    hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
                  >
                    <Text style={styles.reviewsLink}>
                      {formatCount(ratingCount)} review{ratingCount !== 1 ? 's' : ''}
                    </Text>
                    <ChevronRight size={14} color={C.primary} strokeWidth={2.5} />
                  </TouchableOpacity>
                )}
                {distance > 0 && <Text style={styles.metaMuted}>{distance.toFixed(1)} km</Text>}
                {risk && (
                  <View style={[styles.riskChip, { backgroundColor: risk.bg, borderColor: risk.border }]}>
                    <AlertTriangle size={10} color={risk.color} />
                    <Text style={[styles.riskChipText, { color: risk.color }]}>{risk.label}</Text>
                  </View>
                )}
              </View>

              <View style={styles.cardDivider} />

              <View style={styles.detailsList}>
                {spaceType && (
                  <View style={styles.detailRow}>
                    <View style={styles.detailRowLeft}>
                      <Shield size={16} color={C.textSecondary} strokeWidth={2} />
                      <Text style={styles.detailLabel}>Space Type</Text>
                    </View>
                    <Text style={styles.detailValue}>{spaceType}</Text>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <View style={styles.detailRowLeft}>
                    <Car size={16} color={C.textSecondary} strokeWidth={2} />
                    <Text style={styles.detailLabel}>Available Spots</Text>
                  </View>
                  {fetching || availableSlots == null || totalSlots == null ? (
                    <View style={styles.skeletonChip} />
                  ) : (
                    <Text style={styles.detailValue}>
                      <Text style={{ color: C.success, fontWeight: FontWeight.bold }}>{availableSlots}</Text> of {totalSlots} spots
                    </Text>
                  )}
                </View>
                {availabilityText && (
                  <View style={styles.detailRow}>
                    <View style={styles.detailRowLeft}>
                      <Clock size={16} color={C.textSecondary} strokeWidth={2} />
                      <Text style={styles.detailLabel}>Availability</Text>
                    </View>
                    <Text style={styles.detailValue}>{availabilityText}</Text>
                  </View>
                )}
                {parkingFor && (
                  <View style={styles.detailRow}>
                    <View style={styles.detailRowLeft}>
                      <Car size={16} color={C.textSecondary} strokeWidth={2} />
                      <Text style={styles.detailLabel}>Allowed Vehicles</Text>
                    </View>
                    <Text style={styles.detailValue}>{parkingFor}</Text>
                  </View>
                )}
                {ownerName && (() => {
                  const ownerId = space?.ownerId || space?.owner?.id;
                  // Tap the owner to view their public profile (rating, spaces) —
                  // but not for your own space.
                  const canView = !!ownerId && !isOwnSpace;
                  return (
                    <TouchableOpacity
                      style={[styles.detailRow, { borderBottomWidth: 0 }]}
                      activeOpacity={canView ? 0.6 : 1}
                      disabled={!canView}
                      onPress={() => {
                        if (canView) {
                          router.push({ pathname: '/(find-space)/public-profile', params: { userId: String(ownerId) } });
                        }
                      }}
                    >
                      <View style={styles.detailRowLeft}>
                        <User size={16} color={C.textSecondary} strokeWidth={2} />
                        <Text style={styles.detailLabel}>Space Owner</Text>
                      </View>
                      <View style={styles.compactOwner}>
                        {ownerPhoto ? (
                          <Image source={{ uri: ownerPhoto }} style={styles.compactOwnerAvatar} />
                        ) : null}
                        <Text style={[styles.detailValue, canView && { color: C.primary }]}>{ownerName}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })()}
              </View>

              {amenities.length > 0 && (
                <>
                  <View style={styles.cardDivider} />
                  <View style={styles.amenitiesWrap}>
                    {amenities.map((a) => (
                      <View key={a.id} style={styles.amenityChip}>
                        {a.icon}
                        <Text style={styles.amenityText}>{a.name}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </View>

            {/* ── Risk Banner ── */}
            {risk && riskKey === 'HIGH' && (
              <View style={[styles.riskBanner, { backgroundColor: risk.bg, borderColor: risk.border }]}>
                <View style={styles.riskBannerHeader}>
                  <AlertTriangle size={18} color={risk.color} strokeWidth={2.5} />
                  <Text style={[styles.riskBannerTitle, { color: risk.color }]}>Open Roadside Space — High Risk</Text>
                </View>
                {[
                  'This parking space is near a public/open roadside area',
                  'Please verify local parking permissions before proceeding',
                  'Avoid traffic obstruction or restricted parking areas',
                  'Parking violations/fines remain the parker\'s responsibility',
                ].map((line, i) => (
                  <View key={i} style={styles.riskBannerLine}>
                    <View style={[styles.riskBullet, { backgroundColor: risk.color }]} />
                    <Text style={[styles.riskBannerText, { color: risk.color }]}>{line}</Text>
                  </View>
                ))}
              </View>
            )}
            {risk && riskKey === 'MEDIUM' && (
              <View style={[styles.riskBanner, { backgroundColor: risk.bg, borderColor: risk.border }]}>
                <AlertTriangle size={16} color={risk.color} strokeWidth={2.5} />
                <Text style={[styles.riskBannerText, { color: risk.color }]}>{risk.note}</Text>
              </View>
            )}

            {/* ── Duration Picker ── */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Duration</Text>
              <View style={styles.durationStepper}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => setSelectedDurationHours(Math.max(1, selectedDurationHours - 1))}
                  activeOpacity={0.7}
                >
                  <Minus size={18} color={C.primary} strokeWidth={2.5} />
                </TouchableOpacity>
                <Text style={styles.stepperValue}>{selectedDurationHours}h</Text>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => setSelectedDurationHours(Math.min(MAX_DURATION_HOURS, selectedDurationHours + 1))}
                  activeOpacity={0.7}
                >
                  <Plus size={18} color={C.primary} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
              <View style={styles.durationChips}>
                {DURATION_PRESETS.map((h) => {
                  const active = selectedDurationHours === h;
                  return (
                    <TouchableOpacity
                      key={h}
                      style={[styles.dChip, active && styles.dChipActive]}
                      onPress={() => setSelectedDurationHours(h)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.dChipText, active && styles.dChipTextActive]}>
                        {h === 24 ? 'Full day' : `${h}h`}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* ── Location Map ── */}
            {/* Only render the map when we have real coordinates — never drop a pin
                on the Chennai city centre for a space whose lat/lng is missing. */}
            {hasCoords && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Location</Text>
                <View style={styles.miniMap} pointerEvents="none">
                  <LeafletMap
                    interactive={false}
                    initialRegion={{ latitude: lat as number, longitude: lng as number, latitudeDelta: 0.008 }}
                    markers={[{ id: 'space', lat: lat as number, lng: lng as number, kind: 'pin' }]}
                  />
                </View>
              </View>
            )}

            {/* ── Price Summary (estimate; server total is authoritative) ── */}
            <View style={styles.priceCard}>
              <View style={styles.priceRow}>
                <Text style={styles.priceRowLabel}>
                  {pricePerHour != null ? `₹${pricePerHour} × ${selectedDurationHours}h` : `Estimated · ${selectedDurationHours}h`}
                </Text>
                <Text style={styles.priceRowValue}>{basePrice != null ? `₹${basePrice}` : '—'}</Text>
              </View>
              <View style={styles.priceDivider} />
              <View style={styles.priceRow}>
                <Text style={styles.totalLabel}>Estimated Total</Text>
                <Text style={styles.totalValue}>{totalPrice != null ? `₹${totalPrice}` : '—'}</Text>
              </View>
            </View>

            {/* ── Report Listing ── */}
            {!isOwnSpace && !fetching && (
              reportRef ? (
                <View style={{ marginBottom: Spacing['3xl'] }}>
                  <ReportSubmitted reference={reportRef} submittedAt={reportSubmittedAt || undefined} />
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.reportLink}
                  onPress={() => setReportModalVisible(true)}
                  activeOpacity={0.7}
                >
                  <Flag size={13} color={C.textMuted} strokeWidth={2} />
                  <Text style={styles.reportLinkText}>Report this listing</Text>
                </TouchableOpacity>
              )
            )}

          </View>
        </Animated.View>
      </ScrollView>

      {/* ── Report Listing Modal ── */}
      <Modal visible={reportModalVisible} transparent animationType="slide" onRequestClose={() => setReportModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Report Listing</Text>
              <TouchableOpacity onPress={() => setReportModalVisible(false)} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                <X size={20} color={C.textSecondary} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>Help us keep ParkSwift safe. We'll review your report within 24 hours.</Text>

            {/* Auto-filled listing context — sent silently in the payload, shown read-only */}
            <View style={styles.contextCard}>
              <View style={styles.contextRow}>
                <Text style={styles.contextLabel}>Space</Text>
                <Text style={styles.contextVal} numberOfLines={1}>{spaceName}</Text>
              </View>
              {ownerName && (
                <View style={styles.contextRow}>
                  <Text style={styles.contextLabel}>Owner</Text>
                  <Text style={styles.contextVal} numberOfLines={1}>{ownerName}</Text>
                </View>
              )}
            </View>

            <Text style={styles.fieldLabel}>Reason</Text>
            {SPACE_REPORT_REASONS.map(r => (
              <TouchableOpacity
                key={r.value}
                style={[styles.reasonRow, reportType === r.value && styles.reasonRowActive]}
                onPress={() => setReportType(r.value)}
                activeOpacity={0.7}
              >
                <View style={[styles.radioOuter, reportType === r.value && styles.radioOuterActive]}>
                  {reportType === r.value && <View style={styles.radioInner} />}
                </View>
                <Text style={[styles.reasonText, reportType === r.value && styles.reasonTextActive]}>{r.label}</Text>
              </TouchableOpacity>
            ))}

            <Text style={[styles.fieldLabel, { marginTop: Spacing.xl }]}>Details</Text>
            <TextInput
              style={styles.descInput}
              placeholder="Describe the issue..."
              placeholderTextColor={C.textMuted}
              multiline
              numberOfLines={3}
              value={reportDesc}
              onChangeText={setReportDesc}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.submitBtn, reportSubmitting && styles.submitBtnDisabled]}
              onPress={handleSubmitReport}
              disabled={reportSubmitting}
              activeOpacity={0.8}
            >
              {reportSubmitting
                ? <ActivityIndicator color={C.white} size="small" />
                : <Text style={styles.submitBtnText}>Submit Report</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Sticky Footer ── */}
      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <Text style={styles.footerPriceLabel}>Est. Total</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: Spacing.xs }}>
            <Text style={styles.footerPrice}>{totalPrice != null ? `₹${totalPrice}` : '—'}</Text>
            <Text style={styles.footerPriceDuration}>/ {selectedDurationHours}h</Text>
          </View>
        </View>
        {isFull && !isOwnSpace ? (
          // Full → no dead end. Let the parker subscribe to an availability alert.
          <TouchableOpacity
            style={[styles.bookBtn, alertSubscribed ? styles.notifyBtnActive : styles.notifyBtn]}
            onPress={handleToggleAlert}
            activeOpacity={0.8}
            disabled={alertBusy}
          >
            {alertBusy ? (
              <ActivityIndicator color={alertSubscribed ? C.primary : C.white} size="small" />
            ) : (
              <View style={styles.notifyBtnInner}>
                {alertSubscribed ? <BellRing size={18} color={C.primary} /> : <Bell size={18} color={C.white} />}
                <Text style={[styles.bookBtnText, alertSubscribed && styles.notifyBtnActiveText]}>
                  {alertSubscribed ? "We'll notify you" : 'Notify me when available'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.bookBtn,
              riskKey === 'HIGH' && !isOwnSpace && styles.bookBtnHighRisk,
            ]}
            onPress={handleBookNow}
            activeOpacity={0.8}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={C.white} size="small" />
            ) : (
              <Text style={styles.bookBtnText}>
                {isOwnSpace
                  ? 'Manage Space'
                  : riskKey === 'HIGH'
                  ? 'Proceed at Your Own Responsibility'
                  : 'Book Now'}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const makeStyles = ({ colors: C }: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.white },

  // Scroll
  scroll: { flex: 1, backgroundColor: C.screenBg },

  // Hero
  heroWrap: { width: '100%', height: 260, backgroundColor: C.textPrimary, position: 'relative' },
  heroImg: { height: '100%' },
  heroFallback: { flex: 1, backgroundColor: C.surfaceBg, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  heroFallbackText: { fontSize: FontSize.base, color: C.textMuted, fontWeight: FontWeight.medium },          // 13=base ✓
  dotsContainer: { position: 'absolute', bottom: 50, width: '100%', flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm },
  dot: { width: 6, height: 6, borderRadius: BorderRadius.indicator, backgroundColor: ExtendedColors.whiteAlpha40 },  // 3=indicator ✓
  dotActive: { backgroundColor: C.white, width: 8, height: 8, borderRadius: BorderRadius.xs, transform: [{translateY: -1}] },  // 4=xs ✓
  mediaTabs: {
    position: 'absolute', bottom: Spacing.xl, width: '100%',
    flexDirection: 'row', justifyContent: 'center', gap: Spacing.md,
  },
  mediaTab: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing['3xl'], paddingVertical: Spacing.md, borderRadius: BorderRadius.circleXl,  // 20=circleXl ✓
    backgroundColor: ExtendedColors.darkOverlay,
    borderWidth: 1, borderColor: ExtendedColors.whiteAlpha10,
  },
  mediaTabActive: { backgroundColor: ExtendedColors.whiteAlpha20, borderColor: ExtendedColors.whiteAlpha40 },
  mediaTabText: { color: C.textMuted, fontSize: FontSize.base, fontWeight: FontWeight.bold },       // 13=base ✓
  mediaTabTextActive: { color: C.white },

  // Body
  body: { paddingHorizontal: Spacing['3xl'], paddingTop: Spacing['3xl'] },

  // Compact Card
  compactCard: {
    backgroundColor: C.white, borderRadius: BorderRadius.lg, padding: Spacing['3xl'],  // 16=lg ✓
    borderWidth: 1, borderColor: C.border, marginBottom: Spacing['3xl'],
    shadowColor: C.textSecondary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  compactHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  spaceName: { fontSize: FontSize['2xl'], fontWeight: FontWeight.extrabold, color: C.textPrimary, marginBottom: Spacing.xs },  // 18='2xl' ✓

  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: C.screenBg,
    borderRadius: BorderRadius.md,               // 12=md ✓
    padding: Spacing.xl,
    marginTop: Spacing.xl,
    borderWidth: 1,
    borderColor: C.border,
  },
  addressIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
    marginTop: 1,
  },
  addressWithButton: {
    flex: 1,
    gap: Spacing.sm,
  },
  addressText: { fontSize: FontSize.sm, color: C.textBody, lineHeight: 16, fontWeight: FontWeight.medium },  // 12=sm ✓
  directionsBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: C.primary,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
  },
  directionsBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  directionsBtnText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: C.white,
  },
  priceBadge: { backgroundColor: C.primaryBg, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: ExtendedColors.primaryBorder },  // 8=sm ✓
  priceBadgeValue: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold, color: C.primary },     // 16=xl ✓
  priceBadgeUnit: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: ExtendedColors.primaryRed },  // 11=xs ✓

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flexWrap: 'wrap', marginBottom: Spacing.xl },
  metaMuted: { fontSize: FontSize.xs, color: C.textMuted, fontWeight: FontWeight.medium },              // 11=xs ✓
  // Tappable "X reviews ›" pill — padding + background give it a real, easy-to-hit
  // touch target (the bare text was too small to reliably tap).
  reviewsLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.badge,
    backgroundColor: C.primaryBg,
  },
  reviewsLink: { fontSize: FontSize.xs, color: C.primary, fontWeight: FontWeight.bold },
  ratingChip: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: BorderRadius.badge },  // 6=badge ✓
  ratingChipText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  riskChip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: BorderRadius.badge, borderWidth: 1 },
  riskChipText: { fontSize: FontSize.nano, fontWeight: FontWeight.bold },                                    // 10=nano ✓

  riskBanner: { flexDirection: 'column', gap: Spacing.md, paddingHorizontal: Spacing['2xl'], paddingVertical: Spacing.xl, borderRadius: BorderRadius.md, borderWidth: 1, marginBottom: Spacing['3xl'] },
  riskBannerHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  riskBannerTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, flex: 1 },
  riskBannerLine: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.lg },
  riskBullet: { width: 5, height: 5, borderRadius: 3, marginTop: 6 },
  riskBannerText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, flex: 1 },

  cardDivider: { height: 1, backgroundColor: C.surfaceBg, marginVertical: Spacing.xl },               // 12=xl ✓

  card: {
    backgroundColor: C.white, borderRadius: BorderRadius.lg, padding: Spacing['3xl'],  // 16=lg ✓
    borderWidth: 1, borderColor: C.border, marginBottom: Spacing['3xl'],
    shadowColor: C.textSecondary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  cardTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: C.textPrimary, marginBottom: Spacing.xl },  // 15=lg ✓

  detailsList: { marginTop: Spacing.xs },
  detailRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: Spacing.xl, borderBottomWidth: 1, borderBottomColor: C.surfaceBg,  // 12=xl ✓
  },
  detailRowLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },             // 10=lg ✓
  detailLabel: { fontSize: FontSize.base, color: C.textSecondary, fontWeight: FontWeight.medium },     // 13=base ✓
  detailValue: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: C.textPrimary },     // 13=base ✓
  compactOwner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  compactOwnerAvatar: { width: 20, height: 20, borderRadius: 10, backgroundColor: C.surfaceBg },

  // Amenities
  amenitiesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  amenityChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: C.screenBg, paddingHorizontal: Spacing.lg, paddingVertical: 7, borderRadius: BorderRadius.sm,  // 8=sm ✓
    borderWidth: 1, borderColor: C.border,
  },
  amenityText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: C.textBody },          // 12=sm ✓

  // Duration
  durationStepper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.screenBg, borderRadius: BorderRadius.md, overflow: 'hidden',   // 12=md ✓
    borderWidth: 1, borderColor: C.border, marginBottom: Spacing.lg,
  },
  stepperBtn: { width: 48, height: 44, alignItems: 'center', justifyContent: 'center' },
  stepperValue: { flex: 1, textAlign: 'center', fontSize: FontSize.xl, fontWeight: FontWeight.extrabold, color: C.textPrimary },  // 16=xl ✓
  durationChips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  dChip: {
    paddingHorizontal: Spacing.xl, paddingVertical: 7, borderRadius: BorderRadius.sm,       // 8=sm ✓
    borderWidth: 1.5, borderColor: C.border, backgroundColor: C.white,
  },
  dChipActive: { borderColor: C.primary, backgroundColor: C.primaryBg },
  dChipText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: C.textSecondary },      // 12=sm ✓
  dChipTextActive: { color: C.primary },

  // Map
  miniMap: { height: 130, borderRadius: BorderRadius.md, overflow: 'hidden', borderWidth: 1, borderColor: C.border },  // 12=md ✓

  // Price Card
  priceCard: {
    backgroundColor: C.white, borderRadius: BorderRadius.button, paddingHorizontal: Spacing['2xl'], paddingVertical: Spacing.xl,  // 14=button ✓
    borderWidth: 1, borderColor: C.border, marginBottom: Spacing.xl,
  },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm },
  priceRowLabel: { fontSize: FontSize.base, color: C.textSecondary, fontWeight: FontWeight.medium },   // 13=base ✓
  priceRowValue: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: C.textPrimary },       // 13=base ✓
  priceDivider: { height: 1, backgroundColor: C.surfaceBg, marginVertical: Spacing.xs },
  totalLabel: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: C.textPrimary },            // 15=lg ✓
  totalValue: { fontSize: FontSize['2xl'], fontWeight: FontWeight.extrabold, color: C.primary },       // 18='2xl' ✓

  // Sticky Footer
  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.white, paddingHorizontal: Spacing['3xl'], paddingVertical: Spacing.lg,
    borderTopWidth: 1, borderTopColor: C.border,
    paddingBottom: Platform.OS === 'ios' ? 24 : Spacing.lg,
  },
  footerLeft: { justifyContent: 'center' },
  footerPriceLabel: { fontSize: FontSize.nano, color: C.textMuted, fontWeight: FontWeight.bold, letterSpacing: 0, marginBottom: 2 },  // 10=nano ✓
  footerPrice: { fontSize: FontSize['3xl'], fontWeight: FontWeight.extrabold, color: C.textPrimary },  // 20='3xl' ✓
  footerPriceDuration: { fontSize: FontSize.base, color: C.textSecondary, fontWeight: FontWeight.semibold },  // 13=base ✓
  bookBtn: {
    backgroundColor: C.primary, borderRadius: BorderRadius.md, paddingHorizontal: 28, paddingVertical: Spacing['2xl'],  // 12=md ✓
    alignItems: 'center', justifyContent: 'center',
  },
  bookBtnDisabled: { backgroundColor: C.textMuted },
  bookBtnHighRisk: { backgroundColor: C.error },
  bookBtnText: { color: C.white, fontSize: FontSize.lg, fontWeight: FontWeight.bold },                 // 15=lg ✓
  // "Notify me when available" footer button (full space)
  notifyBtn: { backgroundColor: C.primary },
  notifyBtnActive: { backgroundColor: C.primaryBg, borderWidth: 1.5, borderColor: C.primary },
  notifyBtnActiveText: { color: C.primary },
  notifyBtnInner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },

  // Skeleton placeholder shown while background fetch is in flight
  skeletonChip: { backgroundColor: C.surfaceBg, height: 14, width: 40, borderRadius: BorderRadius.xs },  // 4=xs ✓

  // Report listing link
  reportLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: Spacing.xl, marginBottom: Spacing['3xl'] },
  reportLinkText: { fontSize: FontSize.sm, color: C.textMuted, fontWeight: FontWeight.medium },

  // Report modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: C.white, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing['3xl'], paddingBottom: 36 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.borderMuted, alignSelf: 'center', marginBottom: Spacing['2xl'] },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  modalTitle: { fontSize: FontSize['2xl'], fontWeight: FontWeight.bold, color: C.textPrimary },
  modalSub: { fontSize: FontSize.base, color: C.textSecondary, marginBottom: Spacing['3xl'], lineHeight: 19 },
  contextCard: { backgroundColor: C.screenBg, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: C.border, padding: Spacing.xl, marginBottom: Spacing['3xl'] },
  contextRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 },
  contextLabel: { fontSize: FontSize.sm, color: C.textMuted, fontWeight: FontWeight.medium },
  contextVal: { fontSize: FontSize.sm, color: C.textPrimary, fontWeight: FontWeight.semibold, flexShrink: 1, marginLeft: Spacing.lg, textAlign: 'right' },
  fieldLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: C.textSecondary, marginBottom: Spacing.lg, textTransform: 'uppercase', letterSpacing: 0.5 },
  reasonRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, paddingVertical: Spacing.lg, paddingHorizontal: Spacing.xl, borderRadius: BorderRadius.md, marginBottom: Spacing.sm, backgroundColor: C.screenBg, borderWidth: 1, borderColor: C.border },
  reasonRowActive: { backgroundColor: C.primaryBg, borderColor: C.primary },
  radioOuter: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  radioOuterActive: { borderColor: C.primary },
  radioInner: { width: 9, height: 9, borderRadius: 5, backgroundColor: C.primary },
  reasonText: { fontSize: FontSize.base, color: C.textBody, fontWeight: FontWeight.medium },
  reasonTextActive: { color: C.primary, fontWeight: FontWeight.semibold },
  descInput: { backgroundColor: C.screenBg, borderWidth: 1, borderColor: C.border, borderRadius: BorderRadius.lg, padding: Spacing.xl, fontSize: FontSize.base, color: C.textPrimary, minHeight: 80, marginBottom: Spacing['3xl'] },
  submitBtn: { backgroundColor: C.error, borderRadius: BorderRadius.button, paddingVertical: Spacing['3xl'], alignItems: 'center' },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: C.white, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
});

export default SpaceDetailScreen;
