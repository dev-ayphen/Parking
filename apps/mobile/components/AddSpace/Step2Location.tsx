import React, { useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { Control, Controller, FieldErrors } from 'react-hook-form';
import { Search, LocateFixed } from 'lucide-react-native';
import LeafletMap, { LeafletMapHandle } from '../LeafletMap';
import FormInput from '../FormInput';
import { makeAddSpaceStyles } from './addSpaceStyles';
import { BorderRadius, FontSize } from '../../theme';
import type { ColorsType } from '../../theme';
import { useTheme } from '../../hooks/useTheme';
import { SpaceFormData } from './Step1BasicDetails';

type Suggestion = { displayName: string; lat: number; lng: number };

type Props = {
  control: Control<SpaceFormData>;
  errors: FieldErrors<SpaceFormData>;
  locationQuery: string;
  setLocationQuery: (v: string) => void;
  isSearchingLocation: boolean;
  searchLocation: () => void;
  locationSuggestions: Suggestion[];
  pickSuggestion: (s: Suggestion) => void;
  markerCoord: { latitude: number; longitude: number };
  reverseGeocode: (lat: number, lng: number) => void;
  useCurrentLocation: () => void;
  isLocatingMe: boolean;
  mapRef: React.RefObject<LeafletMapHandle | null>;
};

const makeStyles = (colors: ColorsType) => ({});

export default function Step2Location({
  control,
  errors,
  locationQuery,
  setLocationQuery,
  isSearchingLocation,
  searchLocation,
  locationSuggestions,
  pickSuggestion,
  markerCoord,
  reverseGeocode,
  useCurrentLocation,
  isLocatingMe,
  mapRef,
}: Props) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeAddSpaceStyles(colors), [colors]);

  return (
    <View style={styles.formCard}>
      <Text style={styles.stepTitle}>Location Details</Text>

      {/* Location Search */}
      <View style={{ position: 'relative', zIndex: 10 }}>
        <View style={styles.locationSearchRow}>
          <Search size={18} color={colors.textMuted} />
          <TextInput
            style={styles.locationSearchInput}
            placeholder="Search location, area, city..."
            placeholderTextColor={colors.textMuted}
            value={locationQuery}
            onChangeText={setLocationQuery}
            onSubmitEditing={searchLocation}
            returnKeyType="search"
            editable={!isSearchingLocation}
          />
          <TouchableOpacity
            style={styles.locationSearchBtn}
            onPress={searchLocation}
            disabled={isSearchingLocation}
          >
            {isSearchingLocation ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.locationSearchBtnText}>Go</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Search suggestions dropdown */}
        {locationSuggestions.length > 0 && (
          <View style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: colors.white,
            borderRadius: BorderRadius.md,
            borderWidth: 1,
            borderColor: colors.border,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.12,
            shadowRadius: 8,
            elevation: 8,
            overflow: 'hidden',
          }}>
            {locationSuggestions.map((s, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => pickSuggestion(s)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  borderBottomWidth: i < locationSuggestions.length - 1 ? 1 : 0,
                  borderBottomColor: colors.border,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                }}
                activeOpacity={0.7}
              >
                <Search size={14} color={colors.textMuted} />
                <Text style={{ fontSize: FontSize.sm, color: colors.textPrimary, flex: 1 }} numberOfLines={2}>
                  {s.displayName}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Use my current location */}
      <TouchableOpacity
        style={styles.currentLocationBtn}
        onPress={useCurrentLocation}
        disabled={isLocatingMe}
        activeOpacity={0.7}
      >
        {isLocatingMe ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <LocateFixed size={16} color={colors.primary} />
        )}
        <Text style={styles.currentLocationBtnText}>
          {isLocatingMe ? 'Getting your location…' : 'Use my current location'}
        </Text>
      </TouchableOpacity>

      {/* Real Map (OpenStreetMap) */}
      <View style={styles.mapContainer}>
        <LeafletMap
          ref={mapRef}
          style={styles.mapView}
          initialRegion={{ latitude: 12.9716, longitude: 77.5946, latitudeDelta: 0.01 }}
          markers={[{ id: 'pin', lat: markerCoord.latitude, lng: markerCoord.longitude, kind: 'pin' }]}
          onMapPress={({ latitude, longitude }) => reverseGeocode(latitude, longitude)}
        />
        <View style={styles.mapHint}>
          <Text style={styles.mapHintText}>Tap on map to pin exact location</Text>
        </View>
      </View>

      {/* Full Address (auto-filled from search, editable) */}
      <View style={styles.formGroup}>
        <Controller
          control={control}
          name="address"
          render={({ field: { onChange, onBlur, value, ref } }) => (
            <FormInput
              ref={ref}
              label="FULL ADDRESS"
              required
              placeholder="Auto-filled from search, or type manually..."
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.address?.message}
              multiline
              numberOfLines={3}
            />
          )}
        />
      </View>

      <View style={styles.formGroup}>
        <Controller
          control={control}
          name="landmark"
          render={({ field: { onChange, onBlur, value, ref } }) => (
            <FormInput
              ref={ref}
              label="LANDMARK (OPTIONAL)"
              placeholder="e.g. Near Main Gate, Behind Shopping Mall"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.landmark?.message}
            />
          )}
        />
      </View>
    </View>
  );
}
