import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
  Image,
  FlatList,
  ScrollView,
  Modal,
  ActivityIndicator,
  Linking,
  RefreshControl,
  DeviceEventEmitter} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { NETWORK_RECONNECTED } from '../../store/networkStore';
import { getDeviceLocation } from '../../utils/location';
import { pickMedia } from '../../utils/pickMedia';
import LeafletMap from '../../components/LeafletMap';
import PageHeader from '../../components/PageHeader';
import { LinearGradient } from 'expo-linear-gradient';
import { getRatingStyle, formatCount } from '../../utils/ratingUtils';
import FormLabel from '../../components/FormLabel';
import {
  Bell,
  Search,
  MapPin,
  Car,
  Clock,
  Navigation,
  ChevronRight,
  X,
  Target,
  Calendar,
  User,
  Plus,
  SlidersHorizontal,
  RotateCw,
  SearchX,
} from 'lucide-react-native';
import Svg, { Path, Defs, RadialGradient, Stop } from 'react-native-svg';
import { api } from '../../services/api';
import { FontSize, FontWeight, BorderRadius, Spacing, ExtendedColors } from '../../theme';
import type { ColorsType } from '../../theme';
import { useTheme } from '../../hooks/useTheme';
import MyVehiclesTab from '../../components/FindSpace/MyVehiclesTab';
import ActiveSessionsTab from '../../components/FindSpace/ActiveSessionsTab';
import BookingHistoryTab from '../../components/FindSpace/BookingHistoryTab';
import { makeFindSpaceStyles } from '../../components/FindSpace/findSpaceStyles';
import FilterSheet from '../../components/FindSpace/FilterSheet';
import FindSpaceMapTab from './_components/FindSpaceMapTab';


// Search radius options (km). 5 km is the default — best balance for city parking.
const RADIUS_OPTIONS = [1, 3, 5, 10];
const DEFAULT_RADIUS_KM = 5;

// Space-type options for the filter sheet — must match the backend enum exactly.
const SPACE_TYPE_OPTIONS = [
  'Independent House', 'Rented House', 'Apartment Owner Slot', 'Apartment Tenant Slot',
  'Gated Villa', 'Shop Front Parking', 'Office Parking', 'Vacant Private Land',
  'Inside Compound', 'Open Frontage Area',
];
// Map zoom delta that fits a circle of the given radius at 80% screen coverage
const regionDeltaForRadius = (radiusKm: number) => Math.max(0.02, ((radiusKm * 2) / 111) * 1.2);

const FindSpaceScreen = () => {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeFindSpaceStyles(colors), [colors]);
  const { tab, openTab } = useLocalSearchParams<{ tab?: string; openTab?: string }>();
  const mapRef = useRef<any>(null);
  const [activeTab, setActiveTab] = useState(openTab || tab || 'map');
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState<any>(null);
  // Center the search radius is drawn around (GPS by default, the searched area after a search)
  const [searchCenter, setSearchCenter] = useState<any>(null);
  // Label for where the search is centered — shown in a chip near the search bar
  const [searchLabel, setSearchLabel] = useState('Near Me');
  // User-adjustable search radius (km) — drives both the API query and the map circle
  const [searchRadiusKm, setSearchRadiusKm] = useState(DEFAULT_RADIUS_KM);
  // Mirror of searchRadiusKm that's always current — read by fetches that may run from
  // stale closures (e.g. the mount-time GPS effect) so they never query the wrong radius
  const searchRadiusRef = useRef(DEFAULT_RADIUS_KM);
  const [parkingSpaces, setParkingSpaces] = useState<any[]>([]);
  const [spacesLoading, setSpacesLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSpace, setSelectedSpace] = useState<any>(null);
  const [showRadius, setShowRadius] = useState(true);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  // True while the recenter FAB is actively fetching a GPS fix (shows a spinner).
  const [isLocating, setIsLocating] = useState(false);
  // Analytics from last search — why spaces were hidden
  const [searchAnalytics, setSearchAnalytics] = useState<any>(null);

  // ── Search filters (backend already supports parkingFor / spaceType / sort) ──
  const [showFilters, setShowFilters] = useState(false);
  const [filterVehicle, setFilterVehicle] = useState<'all' | 'Car' | 'Bike'>('all');
  const [filterSpaceTypes, setFilterSpaceTypes] = useState<string[]>([]);
  const [filterSort, setFilterSort] = useState<'distance' | 'price'>('distance');
  // Refs so fetches from stale closures always read the current filters.
  const filterVehicleRef = useRef<'all' | 'Car' | 'Bike'>('all');
  const filterSpaceTypesRef = useRef<string[]>([]);
  const filterSortRef = useRef<'distance' | 'price'>('distance');
  // "Search this area" button — shown after the user pans the map away from the
  // current search center, so they can re-query the visible region.
  const [pannedCenter, setPannedCenter] = useState<{ latitude: number; longitude: number } | null>(null);

  // Client-side search cache: (lat,lng,radius,filters) → { spaces, timestamp }
  // Results cached for 5 minutes (300,000 ms). Prevents re-fetching when panning back.
  const searchCacheRef = useRef<Map<string, { spaces: any[]; timestamp: number }>>(new Map());
  const CACHE_DURATION_MS = 300000; // 5 minutes

  const getCacheKey = useCallback((lat: number, lng: number, radius: number, filters: any) => {
    return `${lat.toFixed(4)}_${lng.toFixed(4)}_${radius}_${JSON.stringify(filters)}`;
  }, []);

  // Vehicles state - loaded from API
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isRefreshingVehicles, setIsRefreshingVehicles] = useState(false);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<any>(null);
  const [editIsSubmitting, setEditIsSubmitting] = useState(false);
  const [newVehicleName, setNewVehicleName] = useState('');
  const [newVehiclePlate, setNewVehiclePlate] = useState('');
  const [newVehicleType, setNewVehicleType] = useState('Car');
  const [newVehicleCapacity, setNewVehicleCapacity] = useState('5 Seater');
  const [newVehicleFrontPhotoUri, setNewVehicleFrontPhotoUri] = useState<string | null>(null);
  const [newVehicleSidePhotoUri, setNewVehicleSidePhotoUri] = useState<string | null>(null);
  const [newVehicleRCBookUri, setNewVehicleRCBookUri] = useState<string | null>(null);
  const [newVehicleRole, setNewVehicleRole] = useState('Owner');
  const [vehicleAuthAccepted, setVehicleAuthAccepted] = useState(false);

  // Edit vehicle form state
  const [editVehicleName, setEditVehicleName] = useState('');
  const [editVehiclePlate, setEditVehiclePlate] = useState('');
  const [editVehicleType, setEditVehicleType] = useState('Car');
  const [editVehicleCapacity, setEditVehicleCapacity] = useState('5 Seater');
  const [editVehicleRole, setEditVehicleRole] = useState('Owner');
  // Edit vehicle photos — populated from API URL on open, replaced by local URI on new pick
  const [editFrontPhotoUri, setEditFrontPhotoUri] = useState<string | null>(null);
  const [editSidePhotoUri, setEditSidePhotoUri] = useState<string | null>(null);
  const [editRCBookUri, setEditRCBookUri] = useState<string | null>(null);

  // Active booking + history — REAL data from GET /bookings/my (no fake/local flow).
  // The Active tab routes the user to the real active-session screen; History shows
  // the user's actual completed bookings. No client-side OTP, no fabricated rows.
  const [activeBooking, setActiveBooking] = useState<any>(null);
  const [activeLoading, setActiveLoading] = useState(false);
  const [activeError, setActiveError] = useState<string | null>(null);

  const [historyBookings, setHistoryBookings] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRefreshing, setHistoryRefreshing] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Pull the user's real bookings; split into the current active/pending one and
  // the completed history. Errors set an error flag (so the tabs can show a retry
  // instead of a misleading "empty" state).
  const loadMyBookings = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setHistoryRefreshing(true);
    } else {
      setActiveLoading(true);
      setHistoryLoading(true);
    }
    setActiveError(null);
    setHistoryError(null);
    try {
      const json = await api.get('/bookings/my?limit=50');
      const bookings: any[] = json?.bookings ?? json?.data ?? [];

      // "Active" = the single live/pending booking the user should act on.
      const live =
        bookings.find((b) => b.status === 'ACTIVE') ||
        bookings.find((b) => b.status === 'APPROVED') ||
        bookings.find((b) => b.status === 'PENDING_APPROVAL') ||
        null;
      setActiveBooking(live);

      // History = completed bookings only.
      const completed = bookings
        .filter((b) => b.status === 'COMPLETED')
        .map((b) => ({
          id: String(b.id),
          spaceName: b.space?.name || 'Parking Space',
          address: b.space?.address || '',
          date: b.createdAt
            ? new Date(b.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
            : '',
          price: b.totalAmount ?? 0,
          duration: b.duration ? `${b.duration} hour${b.duration > 1 ? 's' : ''}` : '—',
          vehiclePlate: b.vehicle?.licensePlate || '',
          status: 'COMPLETED',
          rating: b.rating ?? 0,
        }));
      setHistoryBookings(completed);
    } catch (e) {
      const msg = (e as Error)?.message || 'Could not load your bookings.';
      setActiveError(msg);
      setHistoryError(msg);
    } finally {
      setActiveLoading(false);
      setHistoryLoading(false);
      setHistoryRefreshing(false);
    }
  }, []);

  // Load real bookings whenever the Active/History tab is opened.
  useEffect(() => {
    if (activeTab === 'active' || activeTab === 'history') {
      loadMyBookings();
    }
  }, [activeTab, loadMyBookings]);


  const pickVehiclePhoto = async (
    setter: (uri: string | null) => void,
    allowDocs = false
  ) => {
    try {
      const asset = await pickMedia({ allowsEditing: !allowDocs });
      if (asset) setter(asset.uri);
    } catch {
      Alert.alert('Error', 'Failed to pick photo');
    }
  };

  const handleSaveVehicle = async () => {
    if (!newVehicleName.trim()) {
      Alert.alert('Error', 'Please enter a vehicle name (e.g. Maruti Swift)');
      return;
    }
    if (!newVehiclePlate.trim()) {
      Alert.alert('Error', 'Please enter a registration plate number');
      return;
    }

    const capacityMap: Record<string, number> = {
      '2 Seater': 2,
      '4 Seater': 4,
      '5 Seater': 5,
      '7 Seater': 7,
    };

    try {
      const created = await api.post('/vehicles', {
        brandModel: newVehicleName.trim(),
        licensePlate: newVehiclePlate.toUpperCase().replace(/\s+/g, ''),
        vehicleType: newVehicleType === 'Car' ? 'CAR' : 'BIKE',
        capacity: newVehicleType === 'Car' ? (capacityMap[newVehicleCapacity] || 5) : 2,
        ownershipType: newVehicleRole === 'Owner' ? 'OWNER' : 'DRIVER',
      });

      // Upload photos to Supabase (best-effort — don't fail the whole save if photos fail)
      const vehicleId = created?.vehicle?.id ?? created?.id;
      if (vehicleId && (newVehicleFrontPhotoUri || newVehicleSidePhotoUri || newVehicleRCBookUri)) {
        const guess = (uri: string) => {
          const ext = (uri.split('.').pop() || '').toLowerCase();
          if (ext === 'png') return { ext: 'png', type: 'image/png' };
          if (ext === 'webp') return { ext: 'webp', type: 'image/webp' };
          return { ext: 'jpg', type: 'image/jpeg' };
        };
        const mediaFiles: Array<{ field: string; uri: string; name: string; type: string }> = [];
        if (newVehicleFrontPhotoUri) { const g = guess(newVehicleFrontPhotoUri); mediaFiles.push({ field: 'frontPhoto', uri: newVehicleFrontPhotoUri, name: `front.${g.ext}`, type: g.type }); }
        if (newVehicleSidePhotoUri)  { const g = guess(newVehicleSidePhotoUri);  mediaFiles.push({ field: 'sidePhoto',  uri: newVehicleSidePhotoUri,  name: `side.${g.ext}`,  type: g.type }); }
        if (newVehicleRCBookUri)     { const g = guess(newVehicleRCBookUri);     mediaFiles.push({ field: 'rcBook',     uri: newVehicleRCBookUri,     name: `rc.${g.ext}`,    type: g.type }); }
        try {
          if (__DEV__) console.log('[VEHICLE] uploading media:', mediaFiles.map(m => ({ field: m.field, uri: m.uri.slice(0, 40) })));
          await api.upload(`/vehicles/${vehicleId}/media`, mediaFiles);
        } catch (e) {
          const msg = (e as Error)?.message || 'unknown error';
          if (__DEV__) console.log('[VEHICLE] media upload FAILED:', msg, e);
          Alert.alert('Photo upload failed', `Vehicle saved, but photos didn't upload: ${msg}. Open the vehicle to retry.`);
        }
      }

      setNewVehicleName('');
      setNewVehiclePlate('');
      setNewVehicleType('Car');
      setNewVehicleCapacity('5 Seater');
      setNewVehicleFrontPhotoUri(null);
      setNewVehicleSidePhotoUri(null);
      setNewVehicleRCBookUri(null);
      setNewVehicleRole('Owner');
      setVehicleAuthAccepted(false);
      setShowAddVehicle(false);
      Alert.alert('Success', 'Vehicle added successfully!');
      await loadVehiclesFromAPI();
    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    }
  };

  const handleRefreshVehicles = async () => {
    setIsRefreshingVehicles(true);
    await loadVehiclesFromAPI();
    setIsRefreshingVehicles(false);
  };

  const handleEditPress = (vehicle: any) => {
    setEditingVehicle(vehicle);
    setEditVehicleName(vehicle.name);
    setEditVehiclePlate(vehicle.plate);
    setEditVehicleType(vehicle.type);
    setEditVehicleCapacity(vehicle.capacity || '5 Seater');
    const mappedRole = vehicle.role === 'OWNER' ? 'Owner' : vehicle.role === 'DRIVER' ? 'Driver' : vehicle.role;
    setEditVehicleRole(mappedRole);
    // Prefill existing photos from API — resolved Supabase URLs
    setEditFrontPhotoUri(vehicle.frontPhotoUrl || null);
    setEditSidePhotoUri(vehicle.sidePhotoUrl || null);
    setEditRCBookUri(vehicle.rcBookUrl || null);
    setShowEditModal(true);
  };

  const handleUpdateVehicle = async () => {
    if (!editingVehicle || !editVehicleName.trim() || !editVehiclePlate.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      setEditIsSubmitting(true);
      const capacityMap: Record<string, number> = { '2 Seater': 2, '4 Seater': 4, '5 Seater': 5, '7 Seater': 7 };

      await api.put(`/vehicles/${editingVehicle.id}`, {
        brandModel: editVehicleName.trim(),
        licensePlate: editVehiclePlate.toUpperCase().replace(/\s+/g, ''),
        vehicleType: editVehicleType === 'Car' ? 'CAR' : 'BIKE',
        capacity: capacityMap[editVehicleCapacity] || 5,
        ownershipType: editVehicleRole === 'Owner' ? 'OWNER' : 'DRIVER',
      });

      // Upload any newly picked file (skip only confirmed remote http(s) Supabase URLs).
      const needsUpload = (uri: string) => !!uri && !/^https?:\/\//i.test(uri);
      const guess = (uri: string) => {
        const ext = (uri.split('.').pop() || '').toLowerCase();
        if (ext === 'png') return { ext: 'png', type: 'image/png' };
        if (ext === 'pdf') return { ext: 'pdf', type: 'application/pdf' };
        return { ext: 'jpg', type: 'image/jpeg' };
      };
      const editMediaFiles: Array<{ field: string; uri: string; name: string; type: string }> = [];
      if (editFrontPhotoUri && needsUpload(editFrontPhotoUri)) { const g = guess(editFrontPhotoUri); editMediaFiles.push({ field: 'frontPhoto', uri: editFrontPhotoUri, name: `front.${g.ext}`, type: g.type }); }
      if (editSidePhotoUri  && needsUpload(editSidePhotoUri))  { const g = guess(editSidePhotoUri);  editMediaFiles.push({ field: 'sidePhoto',  uri: editSidePhotoUri,  name: `side.${g.ext}`,  type: g.type }); }
      if (editRCBookUri     && needsUpload(editRCBookUri))     { const g = guess(editRCBookUri);     editMediaFiles.push({ field: 'rcBook',     uri: editRCBookUri,     name: `rcbook.${g.ext}`, type: g.type }); }
      if (editMediaFiles.length > 0) {
        try {
          await api.upload(`/vehicles/${editingVehicle.id}/media`, editMediaFiles);
        } catch (e) {
          Alert.alert('Photo upload failed', `Vehicle details saved, but the photos didn't upload: ${(e as Error)?.message || 'unknown error'}`);
        }
      }

      Alert.alert('Success', 'Vehicle updated successfully!');
      setShowEditModal(false);
      setEditingVehicle(null);
      setEditFrontPhotoUri(null);
      setEditSidePhotoUri(null);
      setEditRCBookUri(null);
      await loadVehiclesFromAPI();
    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    } finally {
      setEditIsSubmitting(false);
    }
  };

  const handleDeleteVehicle = (id: string) => {
    Alert.alert('Delete Vehicle', 'Are you sure you want to remove this vehicle?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/vehicles/${id}`);
            Alert.alert('Success', 'Vehicle deleted successfully!');
            await loadVehiclesFromAPI();
          } catch (error) {
            Alert.alert('Error', (error as Error).message);
          }
        },
      },
    ]);
  };

  const handleSetActiveVehicle = async (id: string) => {
    // Optimistic: reflect the new default immediately, then persist. The flag is
    // what checkout reads to pre-select a vehicle, so it must hit the backend.
    setVehicles((prev) => prev.map((v) => ({ ...v, active: v.id === id })));
    try {
      await api.put(`/vehicles/${id}/default`);
    } catch (e: any) {
      // Roll back to the server's truth on failure.
      Alert.alert('Error', e?.message || 'Could not set default vehicle.');
      loadVehiclesFromAPI();
    }
  };

  // Real location search using Nominatim (OpenStreetMap - FREE).
  // `addressdetails=1` gives a structured address so we can show a clean
  // "Place name" + "area, city" pair like Google Places, instead of a raw blob.
  const searchRealLocations = async (query: string) => {
    if (!query.trim() || query.length < 2) return [];

    try {
      // Route through backend /api/geocode/search instead of calling Nominatim directly.
      // This provides rate-limit control and caching on the server side.
      const data = await api.post('/geocode/search', { search: query });
      const results = data.results || [];

      if (Array.isArray(results)) {
        return results.map((result) => {
          const a = result.address || {};
          // Primary line = the most specific name; secondary = area + city.
          const primary =
            result.displayName ? String(result.displayName).split(',')[0] : 'Location';
          const secondaryParts = [
            a.suburb || a.neighbourhood || a.road,
            a.city || a.town || a.village || a.county,
            a.state,
          ].filter((p) => p && p !== primary);
          const secondary = secondaryParts.length
            ? Array.from(new Set(secondaryParts)).join(', ')
            : (result.displayName ? String(result.displayName).split(',').slice(1, 3).join(',').trim() : '');
          return {
            id: String(result.id),
            name: primary,
            description: secondary,
            latitude: isFinite(result.lat) ? result.lat : 0,
            longitude: isFinite(result.lng) ? result.lng : 0,
            type: 'location',
          };
        });
      }
      return [];
    } catch (error) {
      if (__DEV__) console.log('[GEOCODE] Error:', error);
      return [];
    }
  };

  // Load vehicles from API
  useEffect(() => {
    loadVehiclesFromAPI();
  }, []);

  const loadVehiclesFromAPI = async () => {
    try {
      setVehiclesLoading(true);
      const data = await api.get('/vehicles');
      const formattedVehicles = (data.data || []).map((v: any) => ({
        id: v.id,
        name: v.brandModel,
        plate: v.licensePlate,
        type: v.vehicleType === 'CAR' ? 'Car' : 'Bike',
        capacity: `${v.capacity} Seater`,
        role: v.ownershipType,
        active: !!v.isDefault, // the user's default vehicle (pre-selected at checkout)
        // Resolved Supabase URLs (or null) — used for display and edit-mode prefill
        frontPhotoUrl: v.frontPhotoUrl || null,
        sidePhotoUrl: v.sidePhotoUrl || null,
        rcBookUrl: v.rcBookUrl || null,
        rcVerified: v.rcVerified || false,
      }));

      if (__DEV__) console.log('[FIND_SPACE] ✅ Loaded vehicles:', formattedVehicles.length);
      setVehicles(formattedVehicles);
    } catch (error) {
      if (__DEV__) console.log('[FIND_SPACE] Error loading vehicles:', error);
      setVehicles([]);
    } finally {
      setVehiclesLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const json = await api.get('/home/notifications');
      if (!json.success) return;
      // Use the server-computed unreadCount (single source of truth, shared with
      // the home bell). Opening the inbox stamps notificationsReadAt server-side,
      // so this clears correctly — no more stale AsyncStorage badge.
      setUnreadCount(json.unreadCount ?? 0);
    } catch (e) {
      if (__DEV__) console.log('[FIND_SPACE] unread count error:', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadUnreadCount();
      // If navigated with a tab param, switch to that tab
      if (tab && tab !== activeTab) {
        setActiveTab(tab);
      }
    }, [tab])
  );

  // Center the map on the user, falling back to the default city center when GPS
  // is unavailable. Shared so the mount-time auto-detect and the "recenter" FAB
  // behave identically.
  const DEFAULT_CENTER = { latitude: 13.0827, longitude: 80.2707 }; // Chennai

  const centerOnCoords = useCallback((coords: { latitude: number; longitude: number }, isUser: boolean) => {
    if (isUser) {
      setUserLocation(coords);
      setSearchCenter(coords);
    } else {
      // Fallback city center — used as the search center, but don't pretend it's
      // the user's blue dot (leave userLocation null so we don't show a fake dot).
      setSearchCenter(coords);
    }
    const delta = regionDeltaForRadius(searchRadiusRef.current);
    mapRef.current?.animateToRegion({ ...coords, latitudeDelta: delta, longitudeDelta: delta }, 1000);
    fetchParkingSpaces(coords.latitude, coords.longitude);
  }, []);

  // Recenter FAB: actively (re)fetch the GPS fix and snap the map to "Near Me".
  // Unlike the silent mount-time detect, this PROMPTS the user to enable GPS if
  // it's off — because they explicitly asked to go to their location. This means
  // the button works even if auto-detect failed on open (location previously not
  // detected → tapping the FAB now retries and prompts).
  const recenterToMe = useCallback(async () => {
    if (isLocating) return;
    setIsLocating(true);
    try {
      const result = await getDeviceLocation({ promptToEnable: true });
      if (result.ok && result.coords) {
        setUserLocation(result.coords);
        setSearchCenter(result.coords);
        setSearchLabel('Near Me');
        setSearchQuery('');
        setSelectedSpace(null);
        const delta = regionDeltaForRadius(searchRadiusRef.current);
        mapRef.current?.animateToRegion({ ...result.coords, latitudeDelta: delta, longitudeDelta: delta }, 1000);
        fetchParkingSpaces(result.coords.latitude, result.coords.longitude, searchRadiusRef.current);
      } else if (result.failure === 'permission-denied') {
        Alert.alert(
          'Location permission needed',
          'Allow location access to center the map on you.',
          [
            { text: 'Not now', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ],
        );
      } else if (result.failure === 'timeout') {
        Alert.alert('Could not get your location', 'We couldn\'t get a GPS fix. Make sure you have a clear signal and try again.');
      }
      // services-off already showed its own prompt inside the helper.
    } finally {
      setIsLocating(false);
    }
  }, [isLocating]);

  // Get the user's current location on mount (one-time). Uses the robust helper
  // (last-known fix + balanced accuracy + hard timeout) so it can't hang and
  // reliably resolves on real devices.
  useEffect(() => {
    (async () => {
      // Respect the Location Services preference from Settings. If the user has
      // turned it OFF, don't request GPS — fall back to the default city center.
      try {
        const prefs = await api.get('/user-preferences');
        if (prefs?.success && prefs.preferences?.locationServices === false) {
          centerOnCoords(DEFAULT_CENTER, false);
          return;
        }
      } catch {
        // If prefs can't be read, fall through to the normal permission flow.
      }

      // Silent auto-detect: don't nag with the "turn on GPS" prompt on open.
      const result = await getDeviceLocation({ promptToEnable: false });
      if (result.ok && result.coords) {
        centerOnCoords(result.coords, true);
      } else {
        // Permission denied / GPS off / timed out → show the default city so the
        // map isn't empty. The recenter FAB lets the user retry with a prompt.
        centerOnCoords(DEFAULT_CENTER, false);
      }
    })();
  }, [centerOnCoords]);

  // Fetch verified parking spaces from API (geo-aware + filters)
  const fetchParkingSpaces = async (lat: number, lng: number, radiusKm = searchRadiusRef.current) => {
    try {
      setSpacesLoading(true);

      // Apply the active filters (refs so this is correct even from stale closures).
      // Backend accepts parkingFor (Car|Bike|Both), spaceType, and sort=distance|price.
      const sort = filterSortRef.current;
      const filters = {
        vehicle: filterVehicleRef.current,
        spaceTypes: filterSpaceTypesRef.current,
        sort,
      };

      // Check cache first
      const cacheKey = getCacheKey(lat, lng, radiusKm, filters);
      const cachedResult = searchCacheRef.current.get(cacheKey);
      if (cachedResult && Date.now() - cachedResult.timestamp < CACHE_DURATION_MS) {
        // Use cached result
        setParkingSpaces(cachedResult.spaces);
        setSpacesLoading(false);
        return;
      }

      const params = [
        `lat=${lat}`,
        `lng=${lng}`,
        `radius=${radiusKm}`,
        `sort=${sort}`,
        'limit=50',
      ];
      if (filterVehicleRef.current !== 'all') {
        // The backend includes 'Both' spaces when filtering by Car/Bike, so passing
        // just the chosen vehicle is correct.
        params.push(`parkingFor=${filterVehicleRef.current}`);
      }
      if (filterSpaceTypesRef.current.length > 0) {
        // Comma-separated list; the backend matches with IN (...).
        params.push(`spaceType=${encodeURIComponent(filterSpaceTypesRef.current.join(','))}`);
      }

      // Backend computes distanceKm with Haversine + bounding-box prefilter
      const json = await api.get(`/spaces/search?${params.join('&')}`);
      const rawSpaces: any[] = Array.isArray(json) ? json : json.data || json.spaces || [];
      // Extract analytics (why spaces were hidden)
      if (json && json.analytics) {
        setSearchAnalytics(json.analytics);
      }

      const formatDistance = (km?: number) => {
        if (km == null || isNaN(km)) return '';
        return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
      };

      const mapped = rawSpaces.map((s: any) => {
        // Prefer server-computed distance; fall back to client Haversine if missing
        let distKm: number | undefined = typeof s.distanceKm === 'number' ? s.distanceKm : undefined;
        if (distKm == null && s.lat != null && s.lng != null) {
          const dLat = (s.lat - lat) * (Math.PI / 180);
          const dLng = (s.lng - lng) * (Math.PI / 180);
          const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat * (Math.PI / 180)) * Math.cos(s.lat * (Math.PI / 180)) *
            Math.sin(dLng / 2) ** 2;
          distKm = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        }

        return {
          id: String(s.id),
          name: s.name,
          latitude: s.lat,
          longitude: s.lng,
          price: s.hourlyRate,
          rating: s.ratingAvg ?? 0,
          available: s.availableSpots ?? s.capacity ?? 0,
          // Real space photo (front photo preferred) resolved by the API. Falls
          // back to the Unsplash placeholder in the card if the space has no media.
          image: s.imageUrl ?? null,
          distanceKm: distKm,
          distance: formatDistance(distKm),
          address: s.address ?? '',
          area: s.address?.split(',').slice(-3, -1).join(',').trim() || s.address,
          reviews: s.ratingCount ?? 0,
          amenities: s.amenities || [],
          capacity: s.capacity ?? null,
          // Three states: 'closed' (outside the owner's operating hours) takes
          // priority, then 'booked' (no free slots), else 'available'. The map
          // marker + detail badge all read this.
          status: s.isOpenNow === false
            ? 'closed'
            : (s.availableSpots ?? s.capacity ?? 1) <= 0 ? 'booked' : 'available',
          isOpenNow: s.isOpenNow !== false, // default true if backend omitted it
          spaceType: s.spaceType,
          parkingFor: s.parkingFor,
          availability: s.availability,
          startTime: s.startTime ?? null,
          endTime: s.endTime ?? null,
          ownerId: String(s.ownerId),
        };
      });

      // Cache the result
      searchCacheRef.current.set(cacheKey, { spaces: mapped, timestamp: Date.now() });
      setParkingSpaces(mapped);
    } catch (error) {
      if (__DEV__) console.log('[PARKING] Error fetching spaces:', error);
      setParkingSpaces([]);
    } finally {
      setSpacesLoading(false);
    }
  };

  // Fetch suggestions — parking spaces (local) + real locations (Nominatim).
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) {
        setSuggestions([]);
        setSearching(false);
        return;
      }

      const query = searchQuery.toLowerCase();

      // Local parking matches show instantly (no network).
      const parkingSuggestions = parkingSpaces
        .filter(space => space.name.toLowerCase().includes(query))
        .map(space => ({ ...space, type: 'parking' }));
      setSuggestions(parkingSuggestions);

      // Then the geocoded locations (shows the in-bar spinner while it loads).
      setSearching(true);
      const realLocations = await searchRealLocations(searchQuery);
      setSearching(false);
      setSuggestions([...parkingSuggestions, ...realLocations]);
    };

    const timer = setTimeout(fetchSuggestions, 300); // Debounce 300ms
    return () => clearTimeout(timer);
  }, [searchQuery, parkingSpaces]);

  // Handle suggestion selection
  const handleSuggestionPress = async (item: any) => {
    setSearchQuery(item.name);
    setShowSuggestions(false);

    setSearchLabel(item.name);
    if (item.type === 'parking' || !item.type) {
      const parkingSpace = { ...item, type: 'parking' };
      setSelectedSpace(parkingSpace);
      animateToLocation(item.latitude, item.longitude);
    } else {
      // For real locations, fetch coordinates from place_id
      setSelectedSpace(null);
      await getLocationCoordinates(item.id, item.name);
    }
  };

  // Get coordinates for real location (Nominatim already provides lat/lng in search results)
  const getLocationCoordinates = async (placeId: string, name: string) => {
    // Find the location in suggestions (it already has lat/lng from search)
    const location = suggestions.find(s => s.id === placeId);
    if (location?.latitude && location?.longitude) {
      animateToLocation(location.latitude, location.longitude);
    }
  };

  // Animate map to location and fetch spaces near it
  const animateToLocation = (latitude: number, longitude: number) => {
    // The radius circle should follow the searched area, not the user's GPS
    setSearchCenter({ latitude, longitude });
    const delta = regionDeltaForRadius(searchRadiusKm);
    if (mapRef.current) {
      mapRef.current?.animateToRegion({
        latitude,
        longitude,
        latitudeDelta: delta,
        longitudeDelta: delta,
      }, 1000);
    }
    fetchParkingSpaces(latitude, longitude, searchRadiusKm);
  };

  // Change the search radius — re-fetches around the current center and refits the map
  const applyRadius = (radiusKm: number) => {
    searchRadiusRef.current = radiusKm;
    setSearchRadiusKm(radiusKm);
    // The selected space may fall outside the new radius — close its stale detail card
    setSelectedSpace(null);
    const center = searchCenter || userLocation;
    if (center) {
      const delta = regionDeltaForRadius(radiusKm);
      mapRef.current?.animateToRegion({
        latitude: center.latitude,
        longitude: center.longitude,
        latitudeDelta: delta,
        longitudeDelta: delta,
      }, 600);
      fetchParkingSpaces(center.latitude, center.longitude, radiusKm);
    }
    // If no center yet (GPS still resolving), the mount-time GPS effect will fetch
    // using searchRadiusRef.current — so the chosen radius is honored once it resolves.
  };

  // Apply the chosen filters and re-fetch around the current center.
  const applyFilters = (next: {
    vehicle: 'all' | 'Car' | 'Bike';
    spaceTypes: string[];
    sort: 'distance' | 'price';
  }) => {
    filterVehicleRef.current = next.vehicle;
    filterSpaceTypesRef.current = next.spaceTypes;
    filterSortRef.current = next.sort;
    setFilterVehicle(next.vehicle);
    setFilterSpaceTypes(next.spaceTypes);
    setFilterSort(next.sort);
    setShowFilters(false);
    setSelectedSpace(null);
    const center = searchCenter || userLocation;
    if (center) fetchParkingSpaces(center.latitude, center.longitude, searchRadiusRef.current);
  };

  // True when any filter is active — drives the filter button's "on" styling + badge.
  const activeFilterCount =
    (filterVehicle !== 'all' ? 1 : 0) +
    (filterSpaceTypes.length > 0 ? 1 : 0) +
    (filterSort !== 'distance' ? 1 : 0);

  // "Search this area" — re-query around wherever the user has panned the map to.
  const searchThisArea = () => {
    if (!pannedCenter) return;
    setSearchCenter(pannedCenter);
    setSearchLabel('This area');
    setSelectedSpace(null);
    fetchParkingSpaces(pannedCenter.latitude, pannedCenter.longitude, searchRadiusRef.current);
    setPannedCenter(null);
  };

  // Re-fetch when connectivity is restored (offline banner's "Retry" / auto-
  // reconnect) so we don't show stale data. Re-run the spaces search around the
  // current center, plus vehicles, the unread badge, and the active/history
  // bookings if one of those tabs is open.
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(NETWORK_RECONNECTED, () => {
      const center = searchCenter || userLocation;
      if (center) fetchParkingSpaces(center.latitude, center.longitude, searchRadiusRef.current);
      loadVehiclesFromAPI();
      loadUnreadCount();
      if (activeTab === 'active' || activeTab === 'history') loadMyBookings();
    });
    return () => sub.remove();
  }, [searchCenter, userLocation, activeTab, loadMyBookings]);

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Show all fetched spaces — fetchParkingSpaces already scopes to the relevant area
  const filteredParkingSpaces = parkingSpaces;

  const initialRegion = {
    latitude: userLocation?.latitude ?? 13.0827,
    longitude: userLocation?.longitude ?? 80.2707,
    latitudeDelta: regionDeltaForRadius(searchRadiusKm),
    longitudeDelta: regionDeltaForRadius(searchRadiusKm),
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header — single PageHeader component for all tabs */}
      {activeTab === 'map' ? (
        <PageHeader
          logo
          onBack={() => router.replace('/(home)')}
          right={
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.iconButton}
              onPress={() => router.push('/(home)/notifications')}
            >
              <Bell size={18} color={colors.textDark} strokeWidth={2.5} />
              {unreadCount > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          }
        />
      ) : (
        <PageHeader
          title={
            activeTab === 'vehicle' ? 'My Vehicles' : activeTab === 'active' ? 'Active Session' : 'Booking History'
          }
          onBack={() => {
            if (activeTab === 'vehicle' && showAddVehicle) {
              setShowAddVehicle(false);
            } else if (activeTab === 'vehicle' && showEditModal) {
              setShowEditModal(false);
              setEditingVehicle(null);
            } else {
              // Top-level destination → back always lands on Home (router.back()
              // is unreliable across the different entry paths into this screen).
              router.replace('/(home)');
            }
          }}
          right={
            activeTab === 'vehicle' && !showAddVehicle && !showEditModal ? (
              <TouchableOpacity onPress={() => setShowAddVehicle(!showAddVehicle)}>
                <Plus size={20} color={colors.primary} strokeWidth={2.2} />
              </TouchableOpacity>
            ) : undefined
          }
        />
      )}

      {/* Tab Switched Content */}
      {activeTab === 'map' && (
        <FindSpaceMapTab
          mapRef={mapRef}
          initialRegion={initialRegion}
          userLocation={userLocation}
          searchCenter={searchCenter}
          searchLabel={searchLabel}
          searchRadiusKm={searchRadiusKm}
          filteredParkingSpaces={filteredParkingSpaces}
          selectedSpace={selectedSpace}
          setSelectedSpace={setSelectedSpace}
          showSuggestions={showSuggestions}
          setShowSuggestions={setShowSuggestions}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          suggestions={suggestions}
          searching={searching}
          showRadius={showRadius}
          setShowRadius={setShowRadius}
          pannedCenter={pannedCenter}
          setPannedCenter={setPannedCenter}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          filterVehicle={filterVehicle}
          filterSpaceTypes={filterSpaceTypes}
          filterSort={filterSort}
          isLocating={isLocating}
          spacesLoading={spacesLoading}
          activeFilterCount={activeFilterCount}
          styles={styles}
          colors={colors}
          handleSuggestionPress={handleSuggestionPress}
          recenterToMe={recenterToMe}
          applyRadius={applyRadius}
          applyFilters={applyFilters}
          searchThisArea={searchThisArea}
          searchAnalytics={searchAnalytics}
        />
      )}

      {activeTab === 'vehicle' && (
        <MyVehiclesTab
          vehiclesLoading={vehiclesLoading}
          isRefreshingVehicles={isRefreshingVehicles}
          handleRefreshVehicles={handleRefreshVehicles}
          showAddVehicle={showAddVehicle}
          setShowAddVehicle={setShowAddVehicle}
          showEditModal={showEditModal}
          setShowEditModal={setShowEditModal}
          editingVehicle={editingVehicle}
          setEditingVehicle={setEditingVehicle}
          editIsSubmitting={editIsSubmitting}
          newVehicleName={newVehicleName}
          setNewVehicleName={setNewVehicleName}
          newVehiclePlate={newVehiclePlate}
          setNewVehiclePlate={setNewVehiclePlate}
          newVehicleType={newVehicleType}
          setNewVehicleType={setNewVehicleType}
          newVehicleCapacity={newVehicleCapacity}
          setNewVehicleCapacity={setNewVehicleCapacity}
          newVehicleFrontPhotoUri={newVehicleFrontPhotoUri}
          newVehicleSidePhotoUri={newVehicleSidePhotoUri}
          newVehicleRCBookUri={newVehicleRCBookUri}
          onPickFrontPhoto={() => pickVehiclePhoto(setNewVehicleFrontPhotoUri)}
          onPickSidePhoto={() => pickVehiclePhoto(setNewVehicleSidePhotoUri)}
          onPickRCBook={() => pickVehiclePhoto(setNewVehicleRCBookUri, true)}
          newVehicleRole={newVehicleRole}
          setNewVehicleRole={setNewVehicleRole}
          vehicleAuthAccepted={vehicleAuthAccepted}
          setVehicleAuthAccepted={setVehicleAuthAccepted}
          handleSaveVehicle={handleSaveVehicle}
          editVehicleName={editVehicleName}
          setEditVehicleName={setEditVehicleName}
          editVehiclePlate={editVehiclePlate}
          setEditVehiclePlate={setEditVehiclePlate}
          editVehicleType={editVehicleType}
          setEditVehicleType={setEditVehicleType}
          editVehicleCapacity={editVehicleCapacity}
          setEditVehicleCapacity={setEditVehicleCapacity}
          editVehicleRole={editVehicleRole}
          setEditVehicleRole={setEditVehicleRole}
          editFrontPhotoUri={editFrontPhotoUri}
          editSidePhotoUri={editSidePhotoUri}
          editRCBookUri={editRCBookUri}
          onEditPickFrontPhoto={() => pickVehiclePhoto(setEditFrontPhotoUri)}
          onEditPickSidePhoto={() => pickVehiclePhoto(setEditSidePhotoUri)}
          onEditPickRCBook={() => pickVehiclePhoto(setEditRCBookUri, true)}
          handleUpdateVehicle={handleUpdateVehicle}
          vehicles={vehicles}
          handleSetActiveVehicle={handleSetActiveVehicle}
          handleDeleteVehicle={handleDeleteVehicle}
          handleEditPress={handleEditPress}
        />
      )}
      {activeTab === 'active' && (
        <ActiveSessionsTab
          activeBooking={activeBooking}
          loading={activeLoading}
          error={activeError}
          onRetry={loadMyBookings}
          setActiveTab={setActiveTab}
          onOpenActiveSession={() => {}}
        />
      )}
      {activeTab === 'history' && (
        <BookingHistoryTab
          historyBookings={historyBookings}
          loading={historyLoading}
          refreshing={historyRefreshing}
          error={historyError}
          onRetry={loadMyBookings}
          onRefresh={() => loadMyBookings(true)}
        />
      )}

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navTab}
          activeOpacity={0.7}
          onPress={() => setActiveTab('map')}
        >
          <MapPin size={24} color={activeTab === 'map' ? colors.primary : colors.textSecondary} strokeWidth={activeTab === 'map' ? 2.4 : 2.2} />
          <Text style={[styles.navText, activeTab === 'map' && styles.navTextActive]}>Explore</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTab}
          activeOpacity={0.7}
          onPress={() => setActiveTab('vehicle')}
        >
          <Car size={24} color={activeTab === 'vehicle' ? colors.primary : colors.textSecondary} strokeWidth={activeTab === 'vehicle' ? 2.4 : 2.2} />
          <Text style={[styles.navText, activeTab === 'vehicle' && styles.navTextActive]}>Vehicle</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTab}
          activeOpacity={0.7}
          onPress={() => setActiveTab('active')}
        >
          <Clock size={24} color={activeTab === 'active' ? colors.primary : colors.textSecondary} strokeWidth={activeTab === 'active' ? 2.4 : 2.2} />
          <Text style={[styles.navText, activeTab === 'active' && styles.navTextActive]}>Active</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTab}
          activeOpacity={0.7}
          onPress={() => setActiveTab('history')}
        >
          <Calendar size={24} color={activeTab === 'history' ? colors.primary : colors.textSecondary} strokeWidth={activeTab === 'history' ? 2.4 : 2.2} />
          <Text style={[styles.navText, activeTab === 'history' && styles.navTextActive]}>History</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};


export default FindSpaceScreen;
