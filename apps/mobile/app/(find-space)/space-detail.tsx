import React, { useState, useEffect, useMemo } from 'react';
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
  Image} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, Clock, Car, Shield, Zap, Droplets, Star, Camera, User, AlertTriangle, CalendarClock, Minus, Plus, PlayCircle, Image as ImageIcon } from 'lucide-react-native';
import LeafletMap from '../../components/LeafletMap';
import PageHeader from '../../components/PageHeader';
import { VideoView, useVideoPlayer } from 'expo-video';
import { api } from '../../services/api';
import { getRatingStyle } from '../../utils/ratingUtils';
import { useAuthStore } from '../../store/authStore';
import { FontSize, FontWeight, BorderRadius, Spacing, ExtendedColors } from '../../theme';
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

  // Parse params (instant display while the full record loads)
  const spaceId = parseInt(params.spaceId as string, 10);
  const pSpaceName = (params.spaceName as string) || 'Parking Space';
  const pAddress = (params.address as string) || 'Unknown Address';
  const pPricePerHour = parseInt(params.pricePerHour as string, 10) || 50;
  const pAvailableSlots = parseInt(params.availableSlots as string, 10) || 5;
  const pTotalSlots = parseInt(params.totalSlots as string, 10) || 15;
  const distance = parseFloat(params.distance as string) || 0;
  const pLat = parseFloat(params.lat as string) || 13.0827;
  const pLng = parseFloat(params.lng as string) || 80.2707;
  const pFrontPhotoUrl = (params.frontPhotoUrl as string) || '';
  const pRawAmenities: string[] = (() => {
    try { return JSON.parse(params.amenities as string || '[]'); }
    catch { return []; }
  })();

  // Fetch the full space record
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const json = await api.get(`/spaces/${spaceId}`);
        if (alive) setSpace(json.space || json.data || json);
      } catch (e) {
        if (__DEV__) console.log('[SPACE_DETAIL] fetch error', e);
      } finally {
        if (alive) setFetching(false);
      }
    })();
    return () => { alive = false; };
  }, [spaceId]);

  // Merge — prefer the fetched record, fall back to params
  const spaceName = space?.name ?? pSpaceName;
  const address = space?.address ?? pAddress;
  const landmark = space?.landmark ?? null;
  const pricePerHour = space?.hourlyRate ?? pPricePerHour;
  const totalSlots = space?.capacity ?? pTotalSlots;
  // Live availability from API (capacity − active bookings); params only as pre-load fallback
  const availableSlots = space?.availableSpots ?? pAvailableSlots;
  // Real space rating (0 ⇒ no reviews yet ⇒ "New" badge); never use the fake param default
  const rating = space?.ratingAvg ?? 0;
  const ratingCount = space?.ratingCount ?? 0;
  const lat = space?.lat ?? pLat;
  const lng = space?.lng ?? pLng;
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

  // Calculate totals (no GST)
  const basePrice = pricePerHour * selectedDurationHours;
  const totalPrice = basePrice;

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

  const handleBookNow = () => {
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

  const rs = getRatingStyle(rating);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <PageHeader title="Space Details" onBack={() => router.back()} />

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
                  {fetching ? (
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
                <Text style={styles.addressText}>{address}{landmark ? ` · ${landmark}` : ''}</Text>
              </View>

              <View style={styles.cardDivider} />

              <View style={styles.metaRow}>
                <View style={[styles.ratingChip, { backgroundColor: rs.bgColor }]}>
                  {!rs.isNew && <Star size={12} color={rs.iconColor} fill={rs.iconColor} />}
                  <Text style={[styles.ratingChipText, { color: rs.textColor }]}>{rs.label}</Text>
                </View>
                {ratingCount > 0 && <Text style={styles.metaMuted}>{ratingCount} review{ratingCount !== 1 ? 's' : ''}</Text>}
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
                  {fetching ? (
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
                {ownerName && (
                  <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                    <View style={styles.detailRowLeft}>
                      <User size={16} color={C.textSecondary} strokeWidth={2} />
                      <Text style={styles.detailLabel}>Space Owner</Text>
                    </View>
                    <View style={styles.compactOwner}>
                      {ownerPhoto ? (
                        <Image source={{ uri: ownerPhoto }} style={styles.compactOwnerAvatar} />
                      ) : null}
                      <Text style={styles.detailValue}>{ownerName}</Text>
                    </View>
                  </View>
                )}
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
            {risk && riskKey !== 'LOW' && (
              <View style={[styles.riskBanner, { backgroundColor: risk.bg, borderColor: risk.border }]}>
                <AlertTriangle size={16} color={risk.color} />
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
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Location</Text>
              <View style={styles.miniMap} pointerEvents="none">
                <LeafletMap
                  interactive={false}
                  initialRegion={{ latitude: lat, longitude: lng, latitudeDelta: 0.008 }}
                  markers={[{ id: 'space', lat, lng, kind: 'pin' }]}
                />
              </View>
            </View>

            {/* ── Price Summary ── */}
            <View style={styles.priceCard}>
              <View style={styles.priceRow}>
                <Text style={styles.priceRowLabel}>₹{pricePerHour} × {selectedDurationHours}h</Text>
                <Text style={styles.priceRowValue}>₹{basePrice}</Text>
              </View>
              <View style={styles.priceDivider} />
              <View style={styles.priceRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>₹{totalPrice}</Text>
              </View>
            </View>

          </View>
        </Animated.View>
      </ScrollView>

      {/* ── Sticky Footer ── */}
      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <Text style={styles.footerPriceLabel}>Total Price</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: Spacing.xs }}>
            <Text style={styles.footerPrice}>₹{totalPrice}</Text>
            <Text style={styles.footerPriceDuration}>/ {selectedDurationHours}h</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.bookBtn, availableSlots <= 0 && !isOwnSpace && styles.bookBtnDisabled]}
          onPress={availableSlots <= 0 && !isOwnSpace ? undefined : handleBookNow}
          activeOpacity={availableSlots <= 0 && !isOwnSpace ? 1 : 0.8}
          disabled={loading || (availableSlots <= 0 && !isOwnSpace)}
        >
          {loading ? (
            <ActivityIndicator color={C.white} size="small" />
          ) : (
            <Text style={styles.bookBtnText}>
              {isOwnSpace ? 'Manage Space' : availableSlots <= 0 ? 'Fully Occupied' : 'Book Now'}
            </Text>
          )}
        </TouchableOpacity>
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
  addressText: { flex: 1, fontSize: FontSize.sm, color: C.textBody, lineHeight: 16, fontWeight: FontWeight.medium },  // 12=sm ✓
  priceBadge: { backgroundColor: C.primaryBg, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: ExtendedColors.primaryBorder },  // 8=sm ✓
  priceBadgeValue: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold, color: C.primary },     // 16=xl ✓
  priceBadgeUnit: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: ExtendedColors.primaryRed },  // 11=xs ✓

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flexWrap: 'wrap', marginBottom: Spacing.xl },
  metaMuted: { fontSize: FontSize.xs, color: C.textMuted, fontWeight: FontWeight.medium },              // 11=xs ✓
  ratingChip: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: BorderRadius.badge },  // 6=badge ✓
  ratingChipText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  riskChip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: BorderRadius.badge, borderWidth: 1 },
  riskChipText: { fontSize: FontSize.nano, fontWeight: FontWeight.bold },                                    // 10=nano ✓

  riskBanner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, paddingHorizontal: Spacing['2xl'], paddingVertical: Spacing.xl, borderRadius: BorderRadius.md, borderWidth: 1, marginBottom: Spacing['3xl'] },
  riskBannerText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, flex: 1 },                        // 12=sm ✓

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
  bookBtnText: { color: C.white, fontSize: FontSize.lg, fontWeight: FontWeight.bold },                 // 15=lg ✓

  // Skeleton placeholder shown while background fetch is in flight
  skeletonChip: { backgroundColor: C.surfaceBg, height: 14, width: 40, borderRadius: BorderRadius.xs },  // 4=xs ✓
});

export default SpaceDetailScreen;
