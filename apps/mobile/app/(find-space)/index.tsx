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
  RefreshControl} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import LeafletMap from '../../components/LeafletMap';
import PageHeader from '../../components/PageHeader';
import { LinearGradient } from 'expo-linear-gradient';
import { getRatingStyle, formatCount } from '../../utils/ratingUtils';
import FormLabel from '../../components/FormLabel';
import {
  ChevronLeft,
  Bell,
  Search,
  MapPin,
  Car,
  Clock,
  FileText,
  Navigation,
  ChevronRight,
  X,
  Target,
  Compass,
  Calendar,
  Heart,
  User,
  Plus,
  Trash2,
  CheckCircle2,
  Phone,
  MessageSquare,
  PlusCircle,
  Camera,
  UploadCloud,
  Square,
  CheckSquare,
} from 'lucide-react-native';
import Svg, { Path, Defs, RadialGradient, Stop } from 'react-native-svg';
import { api } from '../../services/api';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, ExtendedColors } from '../../theme';
import MyVehiclesTab from '../../components/FindSpace/MyVehiclesTab';
import ActiveSessionsTab from '../../components/FindSpace/ActiveSessionsTab';
import BookingHistoryTab from '../../components/FindSpace/BookingHistoryTab';
import { styles } from '../../components/FindSpace/findSpaceStyles';

const PinIcon = () => (
  <Svg width={22} height={22} viewBox="0 0 512 512">
    <Defs>
      <RadialGradient id="pinGrad" cx="40%" cy="30%" r="70%">
        <Stop offset="0%" stopColor={Colors.primaryGradient} />
        <Stop offset="100%" stopColor={Colors.primaryDark} />
      </RadialGradient>
    </Defs>
    <Path
      fill="url(#pinGrad)"
      d="M256 32C167.6 32 96 103.6 96 192c0 112 160 288 160 288s160-176 160-288C416 103.6 344.4 32 256 32zm0 224c-35.3 0-64-28.7-64-64s28.7-64 64-64 64 28.7 64 64-28.7 64-64 64z"
    />
  </Svg>
);

// Search radius options (km). 5 km is the default — best balance for city parking.
const RADIUS_OPTIONS = [1, 3, 5, 10];
const DEFAULT_RADIUS_KM = 5;
// Map zoom delta that fits a circle of the given radius at 80% screen coverage
const regionDeltaForRadius = (radiusKm: number) => Math.max(0.02, ((radiusKm * 2) / 111) * 1.2);

const FindSpaceScreen = () => {
  const router = useRouter();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const mapRef = useRef<any>(null);
  const [activeTab, setActiveTab] = useState(tab || 'map');
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

  // Active bookings state - loaded from API (empty until real data)
  const [activeBooking, setActiveBooking] = useState<any>(null);

  const [otpInput, setOtpInput] = useState('');

  // Time remaining in seconds for active session
  const [timeRemaining, setTimeRemaining] = useState(0);

  // Booking history - loaded from API
  const [historyBookings, setHistoryBookings] = useState<any[]>([]);

  // Countdown timer effect for active parking session
  useEffect(() => {
    let interval: any = null;
    if (activeBooking && activeBooking.status === 'PARKING') {
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeBooking]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const pickVehiclePhoto = async (
    setter: (uri: string | null) => void,
    allowDocs = false
  ) => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photo library.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: allowDocs
          ? ImagePicker.MediaTypeOptions.Images
          : ImagePicker.MediaTypeOptions.Images,
        allowsEditing: !allowDocs,
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]) {
        setter(result.assets[0].uri);
      }
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

  const handleSetActiveVehicle = (id: string) => {
    setVehicles((prev) =>
      prev.map((v) => ({
        ...v,
        active: v.id === id,
      }))
    );
  };

  const handleVerifyOTP = (enteredOtp: string) => {
    if (activeBooking && enteredOtp === activeBooking.otp) {
      setActiveBooking((prev: any) => ({
        ...prev,
        status: 'PARKING',
      }));
      setTimeRemaining(7200); // Reset timer to 2 hours
      Alert.alert('Check-in Successful', 'OTP verified! Your parking session has started.');
    } else {
      Alert.alert('Verification Failed', 'Incorrect OTP. Please check your OTP and try again.');
    }
  };

  const handleLeaveSession = () => {
    if (!activeBooking) return;
    Alert.alert(
      'Confirm Exit',
      'Are you sure you want to end your parking session? The space owner will be notified to release the space.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Leaving',
          onPress: () => {
            // Add session log to history
            const newHistoryItem = {
              id: activeBooking.id,
              spaceName: activeBooking.spaceName,
              address: activeBooking.address,
              date: 'Today, ' + new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
              price: activeBooking.totalPrice,
              duration: `${activeBooking.durationHours} hours`,
              vehiclePlate: activeBooking.vehiclePlate,
              status: 'COMPLETED',
              rating: 0, // not rated yet — real rating loads on next fetch
            };
            setHistoryBookings((prev) => [newHistoryItem, ...prev]);
            setActiveBooking(null);
            Alert.alert('Session Ended', 'You have successfully released the parking space. Owner will release space from their dashboard.');
          },
        },
      ]
    );
  };

  // Real location search using Nominatim (OpenStreetMap - FREE).
  // `addressdetails=1` gives a structured address so we can show a clean
  // "Place name" + "area, city" pair like Google Places, instead of a raw blob.
  const searchRealLocations = async (query: string) => {
    if (!query.trim() || query.length < 2) return [];

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5&countrycodes=in`,
        { headers: { 'User-Agent': 'ParkSwift/1.0 (parking app)', Accept: 'application/json' } }
      );
      // Nominatim returns plain-text errors (not JSON) when rate-limited/blocked
      const text = await response.text();
      let data: any;
      try { data = JSON.parse(text); } catch { return []; }

      if (Array.isArray(data)) {
        return data.map((result) => {
          const a = result.address || {};
          // Primary line = the most specific name; secondary = area + city.
          const primary =
            result.name ||
            a.amenity || a.building || a.road || a.suburb || a.neighbourhood ||
            a.city || a.town || a.village ||
            (result.display_name ? String(result.display_name).split(',')[0] : 'Location');
          const secondaryParts = [
            a.suburb || a.neighbourhood || a.road,
            a.city || a.town || a.village || a.county,
            a.state,
          ].filter((p) => p && p !== primary);
          const secondary = secondaryParts.length
            ? Array.from(new Set(secondaryParts)).join(', ')
            : (result.display_name ? String(result.display_name).split(',').slice(1, 3).join(',').trim() : '');
          return {
            id: String(result.osm_id || result.place_id),
            name: primary,
            description: secondary,
            latitude: parseFloat(result.lat),
            longitude: parseFloat(result.lon),
            type: 'location',
          };
        });
      }
      return [];
    } catch (error) {
      if (__DEV__) console.log('[NOMINATIM] Error:', error);
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
        active: false,
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

  // Get user's current location (one-time)
  useEffect(() => {
    (async () => {
      try {
        // Respect the Location Services preference from Settings. If the user has
        // turned it OFF, don't request GPS — fall back to the default city center.
        try {
          const prefs = await api.get('/user-preferences');
          if (prefs?.success && prefs.preferences?.locationServices === false) {
            const fb = { latitude: 13.0827, longitude: 80.2707 };
            setUserLocation(fb);
            setSearchCenter(fb);
            const delta = regionDeltaForRadius(searchRadiusRef.current);
            mapRef.current?.animateToRegion({ ...fb, latitudeDelta: delta, longitudeDelta: delta }, 1000);
            fetchParkingSpaces(fb.latitude, fb.longitude);
            return;
          }
        } catch {
          // If prefs can't be read, fall through to the normal permission flow.
        }

        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          const fb = { latitude: 13.0827, longitude: 80.2707 };
          setUserLocation(fb);
          setSearchCenter(fb);
          // Zoom to fit the current radius and load spaces so the map isn't empty on denial
          const delta = regionDeltaForRadius(searchRadiusRef.current);
          mapRef.current?.animateToRegion({ ...fb, latitudeDelta: delta, longitudeDelta: delta }, 1000);
          fetchParkingSpaces(fb.latitude, fb.longitude);
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High
        });
        const { latitude, longitude } = location.coords;

        setUserLocation({ latitude, longitude });
        setSearchCenter({ latitude, longitude });

        if (mapRef.current) {
          const delta = regionDeltaForRadius(searchRadiusRef.current);
          mapRef.current?.animateToRegion({
            latitude,
            longitude,
            latitudeDelta: delta,
            longitudeDelta: delta,
          }, 1000);
        }

        fetchParkingSpaces(latitude, longitude);
      } catch (error) {
        const fb = { latitude: 13.0827, longitude: 80.2707 };
        setUserLocation(fb);
        setSearchCenter(fb);
        const delta = regionDeltaForRadius(searchRadiusRef.current);
        mapRef.current?.animateToRegion({ ...fb, latitudeDelta: delta, longitudeDelta: delta }, 1000);
        fetchParkingSpaces(fb.latitude, fb.longitude);
      }
    })();
  }, []);

  // Fetch verified parking spaces from API (geo-aware)
  const fetchParkingSpaces = async (lat: number, lng: number, radiusKm = searchRadiusRef.current) => {
    try {
      setSpacesLoading(true);

      // Backend computes distanceKm with Haversine + bounding-box prefilter
      const json = await api.get(`/spaces/search?lat=${lat}&lng=${lng}&radius=${radiusKm}&sort=distance&limit=50`);
      const rawSpaces: any[] = Array.isArray(json) ? json : json.data || json.spaces || [];

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
          image: null,
          distanceKm: distKm,
          distance: formatDistance(distKm),
          area: s.address?.split(',').slice(-3, -1).join(',').trim() || s.address,
          reviews: s.ratingCount ?? 0,
          amenities: s.amenities || [],
          status: (s.availableSpots ?? s.capacity ?? 1) <= 0 ? 'booked' : 'available',
          spaceType: s.spaceType,
          parkingFor: s.parkingFor,
          availability: s.availability,
          ownerId: String(s.ownerId),
        };
      });

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
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      {activeTab === 'map' ? (
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.menuIconButton}
            onPress={() => {
              // Find-Parking is a top-level destination — its back button should
              // ALWAYS land on Home, regardless of how we got here (push from
              // home, the session bar, a deep link, etc.). router.back() is
              // unreliable across those entry paths, so navigate to home directly.
              router.replace('/(home)');
            }}
          >
            <ChevronLeft size={18} color={Colors.textDark} strokeWidth={2.5} />
          </TouchableOpacity>

          <View style={styles.logoContainer}>
            <PinIcon />
            <Text style={styles.logoText}>
              Park<Text style={{ color: Colors.primary }}>Swift</Text>
            </Text>
          </View>

          <View style={styles.rightActions}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.iconButton}
              onPress={() => router.push('/(home)/notifications')}
            >
              <Bell size={18} color={Colors.textDark} strokeWidth={2.5} />
              {unreadCount > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
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
                <Plus size={20} color={Colors.primary} strokeWidth={2.2} />
              </TouchableOpacity>
            ) : undefined
          }
        />
      )}

      {/* Tab Switched Content */}
      {activeTab === 'map' && (
        <>
          <View style={styles.mapContainer}>
        <LeafletMap
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={initialRegion}
          circle={
            showRadius && (searchCenter || userLocation)
              ? {
                  lat: (searchCenter || userLocation).latitude,
                  lng: (searchCenter || userLocation).longitude,
                  radiusMeters: searchRadiusKm * 1000,
                }
              : null
          }
          markers={[
            ...(userLocation
              ? [{ id: '__user__', lat: userLocation.latitude, lng: userLocation.longitude, kind: 'user' as const }]
              : []),
            ...filteredParkingSpaces.map((space) => ({
              id: space.id,
              lat: space.latitude,
              lng: space.longitude,
              kind: 'price' as const,
              label: `₹${space.price}`,
              spots: space.available ?? 0,
              rating: space.rating > 0 ? space.rating : undefined,
              status: (space.status === 'available' ? 'available' : 'booked') as 'available' | 'booked',
              selected: selectedSpace?.id === space.id,
            })),
          ]}
          onMarkerPress={(id) => {
            if (id === '__user__') return;
            const space = filteredParkingSpaces.find((s) => s.id === id);
            if (space) handleSuggestionPress(space);
          }}
          onMapPress={() => setSelectedSpace(null)}
        />

        {/* Search Bar with Suggestions */}
        <View style={styles.searchBarContainer}>
          <View style={[styles.searchBox, showSuggestions && styles.searchBoxActive]}>
            <Search size={18} color={Colors.textSecondary} strokeWidth={2.5} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for area, street or parking"
              placeholderTextColor={Colors.textMuted}
              value={searchQuery}
              returnKeyType="search"
              onChangeText={(text) => {
                setSearchQuery(text);
                setShowSuggestions(text.length > 0);
              }}
              onFocus={() => setShowSuggestions(searchQuery.length > 0)}
            />
            {searching ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : searchQuery.length > 0 ? (
              <TouchableOpacity onPress={() => {
                setSearchQuery('');
                setShowSuggestions(false);
              }} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                <View style={styles.searchClearBtn}>
                  <X size={13} color={Colors.white} strokeWidth={3} />
                </View>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Search-center chip — tells the user where the search is centered + radius */}
          {!showSuggestions && (
            <View style={styles.searchMetaRow}>
              <View style={styles.searchChip}>
                <MapPin size={13} color={ExtendedColors.indigoAccent} strokeWidth={2.5} />
                <Text style={styles.searchChipText} numberOfLines={1}>{searchLabel}</Text>
              </View>
              <View style={styles.radiusSelector}>
                {RADIUS_OPTIONS.map((r) => {
                  const active = searchRadiusKm === r;
                  return (
                    <TouchableOpacity
                      key={r}
                      style={[styles.radiusOption, active && styles.radiusOptionActive]}
                      onPress={() => applyRadius(r)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.radiusOptionText, active && styles.radiusOptionTextActive]}>{r}km</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <View style={styles.suggestionsBox}>
              <FlatList
                data={suggestions}
                keyExtractor={(item) => String(item.id)}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={styles.suggestionDivider} />}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.suggestionItem}
                    onPress={() => handleSuggestionPress(item)}
                    activeOpacity={0.6}
                  >
                    <View style={[styles.suggestionIcon, item.type === 'parking' && styles.suggestionIconParking]}>
                      {item.type === 'parking' ? (
                        <Text style={{ fontSize: 13, fontWeight: '800', color: Colors.primary }}>P</Text>
                      ) : (
                        <MapPin size={16} color={Colors.textSecondary} strokeWidth={2.5} />
                      )}
                    </View>
                    <View style={styles.suggestionContent}>
                      <Text style={styles.suggestionName} numberOfLines={1}>{item.name}</Text>
                      {!!(item.type === 'parking' ? true : item.description) && (
                        <Text style={styles.suggestionMeta} numberOfLines={1}>
                          {item.type === 'parking'
                            ? `₹${item.price}/hr • ${item.available} available`
                            : item.description}
                        </Text>
                      )}
                    </View>
                    <ChevronRight size={16} color={Colors.borderMuted} strokeWidth={2.5} />
                  </TouchableOpacity>
                )}
              />
            </View>
          )}

          {/* Searching / no-results state */}
          {showSuggestions && suggestions.length === 0 && searchQuery.length > 0 && (
            <View style={styles.suggestionsBox}>
              <View style={styles.noSuggestions}>
                {searching ? (
                  <>
                    <ActivityIndicator size="small" color={Colors.primary} />
                    <Text style={styles.noSuggestionsText}>Searching…</Text>
                  </>
                ) : (
                  <Text style={styles.noSuggestionsText}>No results found</Text>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Spaces loading indicator */}
        {spacesLoading && (
          <View style={styles.spacesLoadingOverlay}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.spacesLoadingText}>Finding spaces...</Text>
          </View>
        )}

        {/* Floating Actions on the Right */}
        <View style={[
          styles.floatingRight,
          {
            bottom: selectedSpace
              ? (Platform.OS === 'ios' ? 76 + 220 : 58 + 220)
              : (Platform.OS === 'ios' ? 76 + 16 : 58 + 16)
          }
        ]}>
          {/* Radius Toggle Button */}
          <TouchableOpacity 
            style={[styles.floatingCircleBtn, showRadius && styles.radiusButtonActive]}
            onPress={() => setShowRadius(!showRadius)}
            activeOpacity={0.8}
          >
            <Target size={20} color={showRadius ? ExtendedColors.indigoAccent : Colors.textPrimary} strokeWidth={2.5} />
          </TouchableOpacity>

          {/* Navigation Button */}
          <TouchableOpacity 
            style={[styles.floatingCircleBtn, { backgroundColor: ExtendedColors.indigoAccent }]}
            activeOpacity={0.8}
            onPress={() => {
              if (userLocation) {
                // Recenter to GPS — circle, label and spaces all go back to "Near Me"
                setSearchCenter(userLocation);
                setSearchLabel('Near Me');
                setSearchQuery('');
                setSelectedSpace(null);
                const delta = regionDeltaForRadius(searchRadiusKm);
                mapRef.current?.animateToRegion({
                  latitude: userLocation.latitude,
                  longitude: userLocation.longitude,
                  latitudeDelta: delta,
                  longitudeDelta: delta,
                }, 1000);
                fetchParkingSpaces(userLocation.latitude, userLocation.longitude, searchRadiusKm);
              }
            }}
          >
            <Navigation size={20} color={Colors.white} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        {/* Legend Card overlay on the map */}
        {!selectedSpace && (
          <View style={styles.legendCard}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.successAlt }]} />
              <View style={styles.legendTextContainer}>
                <Text style={styles.legendTitle}>Available</Text>
                <Text style={styles.legendSubtitle}>Open for booking</Text>
              </View>
            </View>
            <View style={styles.legendDivider} />
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.errorAlt }]} />
              <View style={styles.legendTextContainer}>
                <Text style={styles.legendTitle}>Booked</Text>
                <Text style={styles.legendSubtitle}>Not available</Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Bottom Parking Space Card - PREMIUM */}
      {selectedSpace && selectedSpace.type === 'parking' && (
        <View style={styles.spaceCard}>
          <TouchableOpacity 
            style={styles.closeCardBtn} 
            onPress={() => setSelectedSpace(null)}
            activeOpacity={0.7}
          >
            <X size={14} color={Colors.textMuted} strokeWidth={2.5} />
          </TouchableOpacity>

          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHandle} />
          </View>
          
          <View style={styles.cardMainRow}>
            {/* Left image thumbnail */}
            <Image 
              source={{ uri: selectedSpace.image || 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?q=80&w=200&auto=format&fit=crop' }} 
              style={styles.cardImage} 
            />

            {/* Center column info */}
            <View style={styles.cardInfoCol}>
              <Text style={styles.spaceName} numberOfLines={1} ellipsizeMode="tail">
                {selectedSpace.name}
              </Text>

              <View style={styles.badgeRow}>
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
                {/* Risk badge */}
                {selectedSpace.spaceType === 'Open Frontage Area' && (
                  <View style={{ paddingHorizontal: 6, paddingVertical: 2, backgroundColor: ExtendedColors.redTint, borderRadius: BorderRadius.risk, borderWidth: 1, borderColor: ExtendedColors.redBorder }}>
                    <Text style={{ fontSize: FontSize.micro, fontWeight: FontWeight.extrabold, color: ExtendedColors.redTextDeep }}>HIGH RISK</Text>
                  </View>
                )}
                {selectedSpace.spaceType && ['Rented House','Apartment Tenant Slot','Shop Front Parking','Inside Compound'].includes(selectedSpace.spaceType) && (
                  <View style={{ paddingHorizontal: 6, paddingVertical: 2, backgroundColor: Colors.warningBgAlt, borderRadius: BorderRadius.risk, borderWidth: 1, borderColor: ExtendedColors.warningYellowBorderAlt }}>
                    <Text style={{ fontSize: FontSize.micro, fontWeight: FontWeight.extrabold, color: ExtendedColors.warningAmber }}>MED RISK</Text>
                  </View>
                )}
                <View style={[
                  styles.statusBadge,
                  selectedSpace.status === 'available' ? styles.statusBadgeAvailable : styles.statusBadgeBooked
                ]}>
                  <Text style={[
                    styles.statusBadgeText,
                    selectedSpace.status === 'available' ? styles.statusBadgeTextAvailable : styles.statusBadgeTextBooked
                  ]}>
                    {selectedSpace.status === 'available' ? 'Available' : 'Booked'}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                <Text style={styles.distanceAreaText}>{selectedSpace.distance || '0.2 km'} • </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: getRatingStyle(selectedSpace.rating).bgColor, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 4 }}>
                  {!getRatingStyle(selectedSpace.rating).isNew && (
                    <Text style={{ color: getRatingStyle(selectedSpace.rating).iconColor, fontSize: 12, marginRight: 2 }}>★</Text>
                  )}
                  <Text style={{ color: getRatingStyle(selectedSpace.rating).textColor, fontSize: 12, fontWeight: '700' }}>
                    {getRatingStyle(selectedSpace.rating).label}
                  </Text>
                </View>
                {selectedSpace.reviews > 0 && (
                  <Text style={styles.reviewCount}> ({formatCount(selectedSpace.reviews)})</Text>
                )}
              </View>
            </View>

            {/* Right column Chevron & Price */}
            <View style={styles.cardRightCol}>
              <TouchableOpacity 
                style={styles.chevronTouchBtn} 
                activeOpacity={0.7}
                onPress={() => {
                  router.push({
                    pathname: '/(find-space)/space-detail',
                    params: {
                      spaceId: selectedSpace.id,
                      spaceName: selectedSpace.name,
                      address: selectedSpace.area ? `${selectedSpace.name}, ${selectedSpace.area}, Chennai` : `${selectedSpace.name}, Chennai`,
                      pricePerHour: selectedSpace.price,
                      availableSlots: selectedSpace.available ?? 0,
                      rating: selectedSpace.rating ?? 0,
                      distance: selectedSpace.distance ? parseFloat(selectedSpace.distance) : 0.4,
                      lat: selectedSpace.latitude,
                      lng: selectedSpace.longitude,
                      ownerId: selectedSpace.ownerId,
                      spaceType: selectedSpace.spaceType || '',
                      amenities: JSON.stringify(selectedSpace.amenities || []),
                      frontPhotoUrl: selectedSpace.frontPhotoUrl || '',
                      totalSlots: selectedSpace.capacity || 15,
                    }
                  });
                }}
              >
                <ChevronRight size={22} color={Colors.primary} strokeWidth={2.5} />
              </TouchableOpacity>

              <View style={styles.priceContainer}>
                <Text style={styles.priceText}>₹{selectedSpace.price}</Text>
                <Text style={styles.priceUnit}>/hr</Text>
              </View>
            </View>
          </View>

          {/* Details & Amenities row */}
          {selectedSpace.amenities && (
            <View style={styles.compactAmenitiesRow}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.amenitiesScrollContent}
              >
                {selectedSpace.amenities.map((amenity: any, idx: number) => (
                  <View key={idx} style={styles.amenityBadge}>
                    <Text style={styles.amenityText}>{amenity}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      )}

        </>
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
          setActiveTab={setActiveTab}
          timeRemaining={timeRemaining}
          formatTime={formatTime}
          handleVerifyOTP={handleVerifyOTP}
          handleLeaveSession={handleLeaveSession}
        />
      )}
      {activeTab === 'history' && (
        <BookingHistoryTab
          historyBookings={historyBookings}
        />
      )}

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navTab}
          activeOpacity={0.7}
          onPress={() => setActiveTab('map')}
        >
          <MapPin size={20} color={activeTab === 'map' ? Colors.primary : Colors.textSecondary} strokeWidth={activeTab === 'map' ? 2.4 : 2.2} />
          <Text style={[styles.navText, activeTab === 'map' && styles.navTextActive]}>Explore</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.navTab}
          activeOpacity={0.7}
          onPress={() => setActiveTab('vehicle')}
        >
          <Car size={20} color={activeTab === 'vehicle' ? Colors.primary : Colors.textSecondary} strokeWidth={activeTab === 'vehicle' ? 2.4 : 2.2} />
          <Text style={[styles.navText, activeTab === 'vehicle' && styles.navTextActive]}>Vehicle</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTab}
          activeOpacity={0.7}
          onPress={() => setActiveTab('active')}
        >
          <Clock size={20} color={activeTab === 'active' ? Colors.primary : Colors.textSecondary} strokeWidth={activeTab === 'active' ? 2.4 : 2.2} />
          <Text style={[styles.navText, activeTab === 'active' && styles.navTextActive]}>Active</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navTab}
          activeOpacity={0.7}
          onPress={() => setActiveTab('history')}
        >
          <Calendar size={20} color={activeTab === 'history' ? Colors.primary : Colors.textSecondary} strokeWidth={activeTab === 'history' ? 2.4 : 2.2} />
          <Text style={[styles.navText, activeTab === 'history' && styles.navTextActive]}>History</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};


export default FindSpaceScreen;
