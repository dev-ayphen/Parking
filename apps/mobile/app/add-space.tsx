import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { CheckCircle } from 'lucide-react-native';
import { LeafletMapHandle } from '../components/LeafletMap';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { PageHeader } from '../components';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '../services/api';
import { Colors, FontSize, FontWeight, BorderRadius, ExtendedColors } from '../theme';
import { styles } from '../components/AddSpace/addSpaceStyles';
import Step1BasicDetails from '../components/AddSpace/Step1BasicDetails';
import Step2Location from '../components/AddSpace/Step2Location';
import Step3Pricing from '../components/AddSpace/Step3Pricing';
import Step4Documents from '../components/AddSpace/Step4Documents';
import Step5Compliance from '../components/AddSpace/Step5Compliance';

// The canonical space types the form accepts (must match the Zod enum below).
const VALID_SPACE_TYPES = [
  'Independent House',
  'Rented House',
  'Apartment Owner Slot',
  'Apartment Tenant Slot',
  'Gated Villa',
  'Shop Front Parking',
  'Office Parking',
  'Vacant Private Land',
  'Inside Compound',
  'Open Frontage Area',
] as const;

// Legacy / short space-type values stored on older spaces → current canonical value.
// Pre-taxonomy listings saved values like "Apartment" that no longer exist as options,
// which would otherwise fail Zod validation and block editing.
const LEGACY_SPACE_TYPE_MAP: Record<string, (typeof VALID_SPACE_TYPES)[number]> = {
  Apartment: 'Apartment Owner Slot',
  House: 'Independent House',
  Villa: 'Gated Villa',
  Shop: 'Shop Front Parking',
  Office: 'Office Parking',
  Land: 'Vacant Private Land',
  Compound: 'Inside Compound',
  Roadside: 'Open Frontage Area',
  'Open Frontage': 'Open Frontage Area',
};

// Coerce any stored spaceType into a valid one (or undefined → forces re-pick).
function normalizeSpaceType(raw: unknown): (typeof VALID_SPACE_TYPES)[number] | undefined {
  if (typeof raw !== 'string') return undefined;
  if ((VALID_SPACE_TYPES as readonly string[]).includes(raw)) {
    return raw as (typeof VALID_SPACE_TYPES)[number];
  }
  return LEGACY_SPACE_TYPE_MAP[raw];
}

// Space-type → required proof options (COMPLIANCE_AND_TERMS.md)
const SPACE_DOC_REQUIREMENTS: Record<string, string[]> = {
  'Independent House': ['EB Bill', 'Property Tax', 'Water Bill'],
  'Rented House': ['Rental Agreement', 'EB Bill'],
  'Apartment Owner Slot': ['Maintenance Bill', 'Parking Allocation Photo'],
  'Apartment Tenant Slot': ['Rental Agreement', 'Parking Permission'],
  'Gated Villa': ['Property Tax', 'EB Bill'],
  'Shop Front Parking': ['Shop License', 'GST Certificate', 'Rental Agreement'],
  'Office Parking': ['Company ID', 'Parking Permission'],
  'Vacant Private Land': ['Land Tax Receipt', 'Patta Copy'],
  'Inside Compound': ['Address Proof', 'Compound Photos'],
  'Open Frontage Area': [], // Images only — admin review, no doc type needed
};

// Zod Schema matching the backend with COMPLIANCE validations
const createSpaceSchema = z
  .object({
    // Step 1: Basic Details
    spaceName: z
      .string()
      .min(1, 'Space name is required')
      .min(2, 'Minimum 2 characters')
      .max(100, 'Maximum 100 characters'),
    spaceType: z.enum(
      [
        'Independent House',
        'Rented House',
        'Apartment Owner Slot',
        'Apartment Tenant Slot',
        'Gated Villa',
        'Shop Front Parking',
        'Office Parking',
        'Vacant Private Land',
        'Inside Compound',
        'Open Frontage Area',
      ],
      { errorMap: () => ({ message: 'Please select a space type' }) }
    ),
    parkingFor: z.enum(['Car', 'Bike', 'Both'], {
      errorMap: () => ({ message: 'Please specify parking type (Car, Bike, or Both)' }),
    }),
    capacity: z.coerce
      .number()
      .min(1, 'Capacity must be at least 1 parking spot')
      .max(10, 'Capacity cannot exceed 10 spots'),

    // Step 2: Location
    address: z
      .string()
      .min(1, 'Address is required')
      .min(5, 'Minimum 5 characters')
      .max(200, 'Maximum 200 characters'),
    landmark: z.string().max(100).optional(),
    latitude: z.coerce.number().min(-90, 'Invalid latitude').max(90, 'Invalid latitude'),
    longitude: z.coerce.number().min(-180, 'Invalid longitude').max(180, 'Invalid longitude'),

    // Step 3: Pricing & Timing
    hourlyPrice: z
      .string()
      .min(1, 'Hourly price is required')
      .regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid price (e.g., 50 or 50.50)'),
    dailyRate: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid daily rate (e.g., 400)')
      .optional()
      .or(z.literal('')),
    monthlyRate: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid monthly rate (e.g., 8000)')
      .optional()
      .or(z.literal('')),
    availability: z.enum(['24 Hours', 'Custom Hours', 'Weekdays Only'], {
      errorMap: () => ({ message: 'Please select availability hours' }),
    }),
    amenities: z.array(z.string()),
    startTime: z.string().optional(),
    endTime: z.string().optional(),

    // Step 4: Photos & Documents
    frontPhoto: z
      .boolean()
      .refine((val) => val === true, 'Front photo is required for verification'),
    areaPhoto: z.boolean().optional(),
    areaVideo: z.boolean().optional(),
    visibility: z.enum(['Private', 'Shared', 'Roadside']).optional(),
    docType: z
      .enum(
        [
          'EB Bill',
          'Property Tax',
          'Water Bill',
          'Rental Agreement',
          'Maintenance Bill',
          'Parking Allocation Photo',
          'Parking Permission',
          'Shop License',
          'GST Certificate',
          'Company ID',
          'Land Tax Receipt',
          'Patta Copy',
          'Address Proof',
          'Compound Photos',
        ],
        { errorMap: () => ({ message: 'Please select a valid document type for this space' }) }
      )
      .optional(),

    // Step 5: Compliance Consent (REQUIRED per COMPLIANCE_AND_TERMS.md)
    acceptOwnerResponsibility: z
      .boolean()
      .refine(
        (val) => val === true,
        'You must confirm ownership or authorization. False claims may result in suspension and legal action.'
      ),
    acceptLegalCompliance: z
      .boolean()
      .refine(
        (val) => val === true,
        'You must confirm compliance with local municipal and parking authority regulations.'
      ),
    acceptNonViolation: z
      .boolean()
      .refine(
        (val) => val === true,
        'You must confirm this space does not block public roads, footpaths, or emergency access.'
      ),
  })

  .refine(
    (data) => {
      if (data.availability === 'Custom Hours') {
        return (
          !!(data.startTime && data.startTime.trim()) && !!(data.endTime && data.endTime.trim())
        );
      }
      return true;
    },
    { message: 'Start and end times are required for Custom Hours', path: ['startTime'] }
  );

type SpaceFormData = z.infer<typeof createSpaceSchema>;

export default function AddSpaceScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ edit?: string }>();
  const editId = params.edit ? parseInt(params.edit, 10) : null;
  const isEdit = editId !== null && !Number.isNaN(editId);
  const [loadingEdit, setLoadingEdit] = useState(isEdit);
  const [step, setStep] = useState(1);
  const [submittedSpace, setSubmittedSpace] = useState<{
    id: number;
    name: string;
    spaceType: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSpaceTypeModal, setShowSpaceTypeModal] = useState(false);
  const [showParkingForModal, setShowParkingForModal] = useState(false);
  const [showDocTypeModal, setShowDocTypeModal] = useState(false);
  const [locationQuery, setLocationQuery] = useState('');
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<Array<{
    displayName: string;
    lat: number;
    lng: number;
  }>>([]);
  const [markerCoord, setMarkerCoord] = useState({ latitude: 12.9716, longitude: 77.5946 });
  const mapRef = useRef<LeafletMapHandle>(null);
  const [uploadedDocs, setUploadedDocs] = useState<Array<{ name: string; uri: string }>>([]);
  // Real media URIs for space photos/video (uploaded after the space is created).
  const [frontPhotoUri, setFrontPhotoUri] = useState<string | null>(null);
  const [areaPhotoUri, setAreaPhotoUri] = useState<string | null>(null);
  const [areaVideoUri, setAreaVideoUri] = useState<string | null>(null);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [modalAvailability, setModalAvailability] = useState('');
  const [modalStartTime, setModalStartTime] = useState('');
  const [modalEndTime, setModalEndTime] = useState('');
  const [startAmPm, setStartAmPm] = useState<'AM' | 'PM'>('AM');
  const [endAmPm, setEndAmPm] = useState<'AM' | 'PM'>('PM');
  const [showAmenitiesModal, setShowAmenitiesModal] = useState(false);
  const [tempAmenities, setTempAmenities] = useState<string[]>([]);

  const EMPTY_DEFAULTS = {
    spaceName: '',
    capacity: 1,
    address: '',
    landmark: '',
    latitude: 12.9716,
    longitude: 77.5946,
    hourlyPrice: '',
    dailyRate: '',
    monthlyRate: '',
    amenities: [] as string[],
    startTime: '',
    endTime: '',
    frontPhoto: false,
    areaPhoto: false,
    areaVideo: false,
    acceptOwnerResponsibility: false,
    acceptLegalCompliance: false,
    acceptNonViolation: false,
  };

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    trigger,
    reset,
    formState: { errors },
  } = useForm<SpaceFormData>({
    resolver: zodResolver(createSpaceSchema),
    defaultValues: EMPTY_DEFAULTS,
  });

  // Reset everything when screen is focused (handles back-navigation reuse).
  // Skip the reset in edit mode — the prefill effect below populates the form instead.
  useFocusEffect(
    useCallback(() => {
      if (isEdit) return;
      reset(EMPTY_DEFAULTS);
      setStep(1);
      setUploadedDocs([]);
      setLocationQuery('');
      setMarkerCoord({ latitude: 12.9716, longitude: 77.5946 });
    }, [isEdit])
  );

  // Edit mode: fetch the existing space and prefill the form once.
  useEffect(() => {
    if (!isEdit || editId === null) return;
    let cancelled = false;
    (async () => {
      try {
        setLoadingEdit(true);
        const res = await api.get(`/spaces/${editId}`);
        const sp = res?.space ?? res; // controller may wrap in { space } or return raw
        if (!sp || cancelled) return;

        const lat = sp.lat ?? 12.9716;
        const lng = sp.lng ?? 77.5946;

        // Coerce legacy/short stored values into the current valid enum so editing
        // an older listing doesn't immediately fail validation on Step 1.
        const normalizedType = normalizeSpaceType(sp.spaceType);
        const normalizedParkingFor = (['Car', 'Bike', 'Both'] as const).includes(sp.parkingFor)
          ? sp.parkingFor
          : undefined;

        reset({
          spaceName: sp.name ?? '',
          spaceType: normalizedType,
          parkingFor: normalizedParkingFor,
          capacity: sp.capacity ?? 1,
          address: sp.address ?? '',
          landmark: sp.landmark ?? '',
          latitude: lat,
          longitude: lng,
          hourlyPrice: sp.hourlyRate != null ? String(sp.hourlyRate) : '',
          dailyRate: sp.dailyRate != null ? String(sp.dailyRate) : '',
          monthlyRate: sp.monthlyRate != null ? String(sp.monthlyRate) : '',
          availability: sp.availability,
          startTime: sp.startTime ?? '',
          endTime: sp.endTime ?? '',
          amenities: sp.amenities ?? [],
          visibility: sp.visibility ?? undefined,
          docType: sp.docType ?? undefined,
          // Photos already exist on the server — mark as present so validation passes
          frontPhoto: !!sp.frontPhotoUrl,
          areaPhoto: !!sp.areaPhotoUrl,
          areaVideo: !!sp.videoUrl,
          // Compliance acknowledgments were accepted at creation; pre-check them for edit
          acceptOwnerResponsibility: true,
          acceptLegalCompliance: true,
          acceptNonViolation: true,
        });
        setMarkerCoord({ latitude: lat, longitude: lng });
      } catch (e) {
        if (!cancelled) Alert.alert('Error', 'Could not load space details for editing.');
      } finally {
        if (!cancelled) setLoadingEdit(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEdit, editId, reset]);

  const applyLocation = (lat: number, lng: number, displayAddress: string) => {
    setValue('latitude', lat, { shouldValidate: true });
    setValue('longitude', lng, { shouldValidate: true });
    setValue('address', displayAddress, { shouldValidate: true });
    const coord = { latitude: lat, longitude: lng };
    setMarkerCoord(coord);
    mapRef.current?.animateToRegion({ ...coord, latitudeDelta: 0.01 });
  };

  // Build a human-readable address from a Nominatim address object.
  // Priority: local neighbourhood/suburb name first, then road, then city, then state.
  // This prevents coarse admin zones (e.g. "Zone 14") overriding the real area name.
  const buildAddress = (addr: Record<string, string>, fallback: string): string => {
    const neighbourhood =
      addr.quarter ||
      addr.neighbourhood ||
      addr.suburb ||
      addr.village ||
      addr.hamlet ||
      addr.locality;
    const road = addr.road || addr.pedestrian || addr.footway || addr.path;
    const city = addr.city || addr.town || addr.county;
    const state = addr.state;
    const parts = [neighbourhood, road, city, state].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : fallback;
  };

  // Search: fetch up to 5 results and show a dropdown so the user picks the right one.
  const searchLocation = async () => {
    if (!locationQuery.trim()) return;
    setIsSearchingLocation(true);
    setLocationSuggestions([]);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationQuery)}&format=json&limit=5&addressdetails=1&countrycodes=in`,
        { headers: { 'User-Agent': 'ParkSwift/1.0' } }
      );
      const results = await res.json();
      if (results.length === 0) {
        Alert.alert('Not Found', 'No location found. Try a different name.');
        return;
      }
      if (results.length === 1) {
        // Only one result — apply directly, no need for a picker
        const place = results[0];
        applyLocation(
          parseFloat(place.lat),
          parseFloat(place.lon),
          buildAddress(place.address || {}, place.display_name)
        );
        return;
      }
      // Multiple results — show dropdown
      setLocationSuggestions(
        results.map((p: any) => ({
          displayName: buildAddress(p.address || {}, p.display_name),
          lat: parseFloat(p.lat),
          lng: parseFloat(p.lon),
        }))
      );
    } catch {
      Alert.alert('Search Failed', 'Unable to search. Check your connection.');
    } finally {
      setIsSearchingLocation(false);
    }
  };

  const pickSuggestion = (s: { displayName: string; lat: number; lng: number }) => {
    setLocationSuggestions([]);
    setLocationQuery(s.displayName);
    applyLocation(s.lat, s.lng, s.displayName);
  };

  // Reverse geocode: same priority order — neighbourhood before road to avoid admin zone names.
  const reverseGeocode = async (lat: number, lng: number) => {
    setLocationSuggestions([]); // close any open dropdown
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=16&addressdetails=1`,
        { headers: { 'User-Agent': 'ParkSwift/1.0' } }
      );
      const data = await res.json();
      if (data.address) {
        applyLocation(lat, lng, buildAddress(data.address, data.display_name));
      }
    } catch {}
  };

  const handlePickDocument = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photo library.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });
      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        const name = asset.fileName || `document_${Date.now()}.jpg`;
        setUploadedDocs((prev) => [...prev, { name, uri: asset.uri }]);
      }
    } catch {
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  // Pick a space photo (front/area) and remember its URI + set the form flag.
  const pickSpacePhoto = async (
    kind: 'front' | 'area',
    field: 'frontPhoto' | 'areaPhoto'
  ) => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photo library.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const uri = result.assets[0].uri;
      if (kind === 'front') setFrontPhotoUri(uri);
      else setAreaPhotoUri(uri);
      setValue(field, true, { shouldValidate: true });
    } catch {
      Alert.alert('Error', 'Failed to pick photo');
    }
  };

  // Pick a short area video.
  const pickAreaVideo = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photo library.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        quality: 0.8,
        videoMaxDuration: 30,
      });
      if (result.canceled || !result.assets?.[0]) return;
      setAreaVideoUri(result.assets[0].uri);
      setValue('areaVideo', true);
    } catch {
      Alert.alert('Error', 'Failed to pick video');
    }
  };

  // Auto-format typed digits into HH:MM (e.g. "0930" → "09:30")
  const formatTimeInput = (raw: string): string => {
    const digits = raw.replace(/\D/g, '').slice(0, 4);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}:${digits.slice(2)}`;
  };

  const isTimeValid = (t: string) => /^(0[1-9]|1[0-2]):[0-5][0-9]$/.test(t);

  const handleNext = async () => {
    let fieldsToValidate: (keyof SpaceFormData)[] = [];

    if (step === 1) {
      fieldsToValidate = ['spaceName', 'spaceType', 'parkingFor', 'capacity'];
    } else if (step === 2) {
      fieldsToValidate = ['address', 'latitude', 'longitude'];
    } else if (step === 3) {
      fieldsToValidate = ['hourlyPrice', 'availability'];
    } else if (step === 4) {
      fieldsToValidate = ['frontPhoto'];
      const isValid = await trigger(fieldsToValidate);
      if (isValid) {
        if (watch('spaceType') !== 'Open Frontage Area' && uploadedDocs.length === 0) {
          Alert.alert(
            'Document Required',
            'Please upload at least one required proof document before proceeding.'
          );
          return;
        }
        setStep(step + 1);
      }
      return;
    }

    const isValid = await trigger(fieldsToValidate);
    if (isValid && step < 5) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      router.back();
    }
  };

  const onSubmit = async (data: SpaceFormData) => {
    try {
      setIsSubmitting(true);
      const payload = {
        spaceName: data.spaceName,
        spaceType: data.spaceType,
        parkingFor: data.parkingFor,
        capacity: data.capacity,
        address: data.address,
        landmark: data.landmark || undefined,
        latitude: data.latitude,
        longitude: data.longitude,
        hourlyPrice: data.hourlyPrice,
        dailyRate: data.dailyRate ? parseFloat(data.dailyRate) : undefined,
        monthlyRate: data.monthlyRate ? parseFloat(data.monthlyRate) : undefined,
        availability: data.availability,
        startTime: data.startTime || undefined,
        endTime: data.endTime || undefined,
        amenities: data.amenities,
        frontPhoto: data.frontPhoto,
        areaPhoto: data.areaPhoto || undefined,
        areaVideo: data.areaVideo || undefined,
        visibility: data.visibility || undefined,
        docType: data.docType || undefined,
        acceptOwnerResponsibility: data.acceptOwnerResponsibility,
        acceptLegalCompliance: data.acceptLegalCompliance,
        acceptNonViolation: data.acceptNonViolation,
        confirmed: true,
      };

      const responseData = isEdit
        ? await api.put(`/spaces/${editId}`, payload)
        : await api.post('/spaces', payload);
      const space = responseData.space;

      // Upload real photos/video to the new space (best-effort — space already exists).
      const mediaFiles: Array<{ field: string; uri: string; name: string; type: string }> = [];
      const guess = (uri: string) => {
        const ext = (uri.split('.').pop() || '').toLowerCase();
        if (ext === 'png') return { ext: 'png', type: 'image/png' };
        if (ext === 'webp') return { ext: 'webp', type: 'image/webp' };
        if (ext === 'mov') return { ext: 'mov', type: 'video/quicktime' };
        if (ext === 'mp4') return { ext: 'mp4', type: 'video/mp4' };
        return { ext: 'jpg', type: 'image/jpeg' };
      };
      if (frontPhotoUri) { const g = guess(frontPhotoUri); mediaFiles.push({ field: 'frontPhoto', uri: frontPhotoUri, name: `front.${g.ext}`, type: g.type }); }
      if (areaPhotoUri)  { const g = guess(areaPhotoUri);  mediaFiles.push({ field: 'areaPhoto',  uri: areaPhotoUri,  name: `area.${g.ext}`,  type: g.type }); }
      if (areaVideoUri)  { const g = guess(areaVideoUri);  mediaFiles.push({ field: 'areaVideo',  uri: areaVideoUri,  name: `video.${g.ext}`, type: g.type }); }

      if (mediaFiles.length > 0) {
        try {
          await api.upload(`/spaces/${space.id}/media`, mediaFiles);
        } catch (e) {
          if (__DEV__) console.log('[ADD-SPACE] media upload failed', e);
        }
      }

      // Upload each proof document to backend → Supabase private bucket
      for (const doc of uploadedDocs) {
        try {
          const ext = (doc.uri.split('.').pop() || 'jpg').toLowerCase();
          const mimeType = ext === 'png' ? 'image/png' : ext === 'pdf' ? 'application/pdf' : 'image/jpeg';
          const docType = data.docType || 'Address Proof';
          await api.upload(
            `/spaces/${space.id}/documents`,
            [{ field: 'file', uri: doc.uri, name: doc.name, type: mimeType }],
            { documentType: docType, documentLabel: doc.name }
          );
        } catch (e) {
          if (__DEV__) console.log('[ADD-SPACE] doc upload failed', doc.name, e);
        }
      }

      setSubmittedSpace({
        id: space.id,
        name: space.name,
        spaceType: space.spaceType,
      });
    } catch (error) {
      Alert.alert('Submission Failed', (error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Success screen ─────────────────────────────────────────────────────
  if (submittedSpace) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        <ScrollView
          contentContainerStyle={styles.successContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Icon */}
          <View style={styles.successIconWrap}>
            <View style={styles.successIconOuter}>
              <CheckCircle size={56} color={Colors.success} strokeWidth={1.5} />
            </View>
          </View>

          <Text style={styles.successTitle}>{isEdit ? 'Space Updated!' : 'Space Submitted!'}</Text>
          <Text style={styles.successSubtitle}>
            {isEdit
              ? "Your changes have been saved. If the space was rejected, it's been resubmitted for review."
              : "Your space has been sent to admin for verification. You'll be notified once it's approved."}
          </Text>

          {/* Submission details card */}
          <View style={styles.successCard}>
            <View style={styles.successDetailRow}>
              <Text style={styles.successDetailLabel}>Space Name</Text>
              <Text style={styles.successDetailValue}>{submittedSpace.name}</Text>
            </View>
            <View style={styles.successDetailRow}>
              <Text style={styles.successDetailLabel}>Space Type</Text>
              <Text style={styles.successDetailValue}>{submittedSpace.spaceType}</Text>
            </View>
            <View style={styles.successDetailRow}>
              <Text style={styles.successDetailLabel}>Submission ID</Text>
              <Text style={styles.successDetailValue}>
                #SP{String(submittedSpace.id).padStart(5, '0')}
              </Text>
            </View>
            <View style={[styles.successDetailRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.successDetailLabel}>Status</Text>
              <View style={styles.successStatusChip}>
                <View style={styles.successStatusDot} />
                <Text style={styles.successStatusText}>Pending Review</Text>
              </View>
            </View>
          </View>

          {/* Info box */}
          <View style={styles.successInfoBox}>
            <Text style={styles.successInfoText}>
              📋 Admin will review your documents and space details. Approval usually takes 1–2
              business days.
            </Text>
          </View>

          {/* Actions */}
          <TouchableOpacity
            style={styles.successPrimaryBtn}
            onPress={() => router.replace('/(my-spaces)')}
          >
            <Text style={styles.successPrimaryBtnText}>Go to My Spaces</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.successSecondaryBtn}
            onPress={() => router.replace('/(home)')}
          >
            <Text style={styles.successSecondaryBtnText}>Back to Home</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // While fetching the space to edit, show a spinner so fields don't flash empty
  if (loadingEdit) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        <PageHeader title="Edit Space" onBack={() => router.back()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <PageHeader
        title={`${isEdit ? 'Edit Space' : 'Add Space'}  ${step}/5`}
        onBack={handleBack}
        right={
          <TouchableOpacity
            style={[styles.headerBtn, isSubmitting && styles.headerBtnDisabled]}
            onPress={
              step < 5
                ? handleNext
                : handleSubmit(onSubmit, (errs) => {
                    const first = Object.values(errs)[0];
                    const msg = (first as any)?.message || 'Please check all required fields';
                    Alert.alert('Cannot Submit', msg);
                  })
            }
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Text style={styles.headerBtnText}>{step === 5 ? 'Submit' : 'Next'}</Text>
            )}
          </TouchableOpacity>
        }
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* COMPLIANCE NOTICE - Shown on Step 1 only */}
          {step === 1 && (
            <View style={styles.complianceBanner}>
              <Text style={styles.complianceTitle}>⚠️ Compliance Required</Text>
              <Text style={styles.complianceText}>
                You must provide valid ownership proof. False listings may result in account
                suspension and legal action.
              </Text>
            </View>
          )}

          {/* STEP 1: BASIC DETAILS */}
          {step === 1 && (
            <Step1BasicDetails
              control={control as any}
              errors={errors as any}
              watch={watch as any}
              setValue={setValue as any}
              showSpaceTypeModal={showSpaceTypeModal}
              setShowSpaceTypeModal={setShowSpaceTypeModal}
              showParkingForModal={showParkingForModal}
              setShowParkingForModal={setShowParkingForModal}
            />
          )}

          {/* STEP 2: LOCATION */}
          {step === 2 && (
            <Step2Location
              control={control as any}
              errors={errors as any}
              locationQuery={locationQuery}
              setLocationQuery={setLocationQuery}
              isSearchingLocation={isSearchingLocation}
              searchLocation={searchLocation}
              locationSuggestions={locationSuggestions}
              pickSuggestion={pickSuggestion}
              markerCoord={markerCoord}
              reverseGeocode={reverseGeocode}
              mapRef={mapRef}
            />
          )}

          {/* STEP 3: PRICING & TIMING */}
          {step === 3 && (
            <Step3Pricing
              control={control as any}
              errors={errors as any}
              watch={watch as any}
              setValue={setValue as any}
              showAvailabilityModal={showAvailabilityModal}
              setShowAvailabilityModal={setShowAvailabilityModal}
              modalAvailability={modalAvailability}
              setModalAvailability={setModalAvailability}
              modalStartTime={modalStartTime}
              setModalStartTime={setModalStartTime}
              modalEndTime={modalEndTime}
              setModalEndTime={setModalEndTime}
              startAmPm={startAmPm}
              setStartAmPm={setStartAmPm}
              endAmPm={endAmPm}
              setEndAmPm={setEndAmPm}
              showAmenitiesModal={showAmenitiesModal}
              setShowAmenitiesModal={setShowAmenitiesModal}
              tempAmenities={tempAmenities}
              setTempAmenities={setTempAmenities}
              formatTimeInput={formatTimeInput}
              isTimeValid={isTimeValid}
            />
          )}

          {/* STEP 4: PHOTOS & DOCUMENTS */}
          {step === 4 && (
            <Step4Documents
              control={control as any}
              errors={errors as any}
              watch={watch as any}
              setValue={setValue as any}
              showSpaceTypeModal={showSpaceTypeModal}
              setShowSpaceTypeModal={setShowSpaceTypeModal}
              uploadedDocs={uploadedDocs}
              setUploadedDocs={setUploadedDocs}
              handlePickDocument={handlePickDocument}
              frontPhotoUri={frontPhotoUri}
              areaPhotoUri={areaPhotoUri}
              areaVideoUri={areaVideoUri}
              onPickFrontPhoto={() => pickSpacePhoto('front', 'frontPhoto')}
              onPickAreaPhoto={() => pickSpacePhoto('area', 'areaPhoto')}
              onPickAreaVideo={pickAreaVideo}
            />
          )}

          {/* STEP 5: CONFIRM & SUBMIT */}
          {step === 5 && (
            <Step5Compliance
              errors={errors as any}
              watch={watch as any}
              setValue={setValue as any}
              uploadedDocs={uploadedDocs}
            />
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
