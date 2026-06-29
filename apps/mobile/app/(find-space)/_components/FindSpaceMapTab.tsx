import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  Image,
  FlatList,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import LeafletMap from '../../../components/LeafletMap';
import FilterSheet, { type VehicleFilter, type SortFilter } from '../../../components/FindSpace/FilterSheet';
import { getRatingStyle, formatCount } from '../../../utils/ratingUtils';
import { FontSize, FontWeight, BorderRadius, ExtendedColors } from '../../../theme';
import {
  Search,
  MapPin,
  Navigation,
  ChevronRight,
  X,
  Target,
  RotateCw,
  SearchX,
  SlidersHorizontal,
} from 'lucide-react-native';

const RADIUS_OPTIONS = [1, 3, 5, 10];

export interface FindSpaceMapTabProps {
  styles: any;
  colors: any;
  mapRef: any;
  initialRegion: any;
  showRadius: boolean;
  searchCenter: any;
  userLocation: any;
  searchRadiusKm: number;
  filteredParkingSpaces: any[];
  selectedSpace: any;
  handleSuggestionPress: (space: any) => void;
  setSelectedSpace: (space: any) => void;
  pannedCenter: any;
  setPannedCenter: (center: any) => void;
  searchThisArea: () => void;
  spacesLoading: boolean;
  showFilters: boolean;
  setShowFilters: (visible: boolean) => void;
  filterVehicle: VehicleFilter;
  filterSpaceTypes: string[];
  filterSort: SortFilter;
  applyFilters: (filters: any) => void;
  setShowRadius: (show: boolean) => void;
  recenterToMe: () => void;
  isLocating: boolean;
  showSuggestions: boolean;
  setShowSuggestions: (show: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  suggestions: any[];
  searching: boolean;
  searchLabel: string;
  applyRadius: (r: number) => void;
  activeFilterCount: number;
  searchAnalytics?: any;
  setShowAnalytics?: (show: boolean) => void;
}

const FindSpaceMapTab: React.FC<FindSpaceMapTabProps> = ({
  styles,
  colors,
  mapRef,
  initialRegion,
  showRadius,
  searchCenter,
  userLocation,
  searchRadiusKm,
  filteredParkingSpaces,
  selectedSpace,
  handleSuggestionPress,
  setSelectedSpace,
  pannedCenter,
  setPannedCenter,
  searchThisArea,
  spacesLoading,
  showFilters,
  setShowFilters,
  filterVehicle,
  filterSpaceTypes,
  filterSort,
  applyFilters,
  setShowRadius,
  recenterToMe,
  isLocating,
  showSuggestions,
  setShowSuggestions,
  searchQuery,
  setSearchQuery,
  suggestions,
  searching,
  searchLabel,
  applyRadius,
  activeFilterCount,
  searchAnalytics,
  setShowAnalytics,
}) => {
  const searchAreaDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const isSearchingAreaRef = useRef(false);
  const [showAnalyticsBanner, setShowAnalyticsBanner] = useState(false);

  const handleSearchThisAreaPress = () => {
    if (isSearchingAreaRef.current || spacesLoading) return;
    isSearchingAreaRef.current = true;
    if (searchAreaDebounceRef.current) clearTimeout(searchAreaDebounceRef.current);
    searchAreaDebounceRef.current = setTimeout(() => {
      searchThisArea();
      isSearchingAreaRef.current = false;
    }, 500);
  };
  const router = useRouter();

  return (
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
              status: (space.status === 'available'
                ? 'available'
                : space.status === 'closed'
                  ? 'closed'
                  : 'booked') as 'available' | 'booked' | 'closed',
              selected: selectedSpace?.id === space.id,
            })),
          ]}
          onMarkerPress={(id) => {
            if (id === '__user__') return;
            const space = filteredParkingSpaces.find((s) => s.id === id);
            if (space) handleSuggestionPress(space);
          }}
          onMapPress={() => setSelectedSpace(null)}
          onRegionChange={(c) => {
            // Only offer "Search this area" once the user pans a meaningful distance
            // from the current search center (avoids the button flickering on tiny nudges).
            const center = searchCenter || userLocation;
            if (!center) { setPannedCenter(c); return; }
            const dLat = Math.abs(c.latitude - center.latitude);
            const dLng = Math.abs(c.longitude - center.longitude);
            // ~0.5km threshold (0.0045° ≈ 0.5km)
            if (dLat > 0.0045 || dLng > 0.0045) setPannedCenter(c);
          }}
        />

        {/* Search Bar with Suggestions */}
        <View style={styles.searchBarContainer}>
          <View style={[styles.searchBox, showSuggestions && styles.searchBoxActive]}>
            <Search size={18} color={colors.textSecondary} strokeWidth={2.5} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for area, street or parking"
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              returnKeyType="search"
              onChangeText={(text) => {
                setSearchQuery(text);
                setShowSuggestions(text.length > 0);
              }}
              onFocus={() => setShowSuggestions(searchQuery.length > 0)}
            />
            {searchQuery.length > 0 ? (
              <TouchableOpacity onPress={() => {
                setSearchQuery('');
                setShowSuggestions(false);
              }} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                <View style={styles.searchClearBtn}>
                  <X size={13} color={colors.white} strokeWidth={3} />
                </View>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Search-center chip — tells the user where the search is centered + radius */}
          {!showSuggestions && (
            <View style={styles.searchMetaRow}>
              <View style={styles.searchChip}>
                <MapPin size={13} color={colors.textSecondary} strokeWidth={2.5} />
                <Text style={styles.searchChipText} numberOfLines={1}>{searchLabel}</Text>
              </View>
              <View style={styles.metaRight}>
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
                {/* Filter button — opens the filter sheet; badge shows active count */}
                <TouchableOpacity
                  style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]}
                  onPress={() => setShowFilters(true)}
                  activeOpacity={0.8}
                >
                  <SlidersHorizontal
                    size={16}
                    color={activeFilterCount > 0 ? colors.white : colors.textPrimary}
                    strokeWidth={2.5}
                  />
                  {activeFilterCount > 0 && (
                    <View style={styles.filterBadge}>
                      <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
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
                        <Text style={{ fontSize: 13, fontWeight: '800', color: colors.primary }}>P</Text>
                      ) : (
                        <MapPin size={16} color={colors.textSecondary} strokeWidth={2.5} />
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
                    <ChevronRight size={16} color={colors.borderMuted} strokeWidth={2.5} />
                  </TouchableOpacity>
                )}
              />
            </View>
          )}

          {/* Searching / no-results state */}
          {showSuggestions && suggestions.length === 0 && searchQuery.length > 0 && (
            <View style={styles.suggestionsBox}>
              {searching ? (
                <View style={styles.noSuggestions}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.noSuggestionsText}>Searching…</Text>
                </View>
              ) : (
                <View style={styles.emptyResults}>
                  <View style={styles.emptyResultsIcon}>
                    <SearchX size={22} color={colors.textMuted} strokeWidth={2} />
                  </View>
                  <Text style={styles.emptyResultsTitle}>No results found</Text>
                  <Text style={styles.emptyResultsHint}>Try a different area or street name</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* "Search this area" — appears after the user pans the map away */}
        {pannedCenter && !showSuggestions && (
          <View style={styles.searchAreaWrap} pointerEvents="box-none">
            <TouchableOpacity
              style={[styles.searchAreaBtn, (spacesLoading || isSearchingAreaRef.current) && { opacity: 0.6 }]}
              onPress={handleSearchThisAreaPress}
              activeOpacity={0.85}
              disabled={spacesLoading || isSearchingAreaRef.current}
            >
              {spacesLoading || isSearchingAreaRef.current ? (
                <ActivityIndicator size="small" color={colors.textPrimary} />
              ) : (
                <RotateCw size={15} color={colors.textPrimary} strokeWidth={2.5} />
              )}
              <Text style={styles.searchAreaText}>
                {spacesLoading || isSearchingAreaRef.current ? 'Searching...' : 'Search this area'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Spaces loading indicator — centered on the map */}
        {spacesLoading && (
          <View style={styles.spacesLoadingOverlay} pointerEvents="none">
            <View style={styles.spacesLoadingPill}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.spacesLoadingText}>Finding spaces...</Text>
            </View>
          </View>
        )}

        {/* Analytics banner — why weren't all spaces shown? */}
        {searchAnalytics && (searchAnalytics.hiddenBySubscription > 0 || searchAnalytics.hiddenByFilter > 0) && !showAnalyticsBanner && (
          <View style={[styles.searchAreaWrap, { top: 120 }]} pointerEvents="box-none">
            <View style={[styles.analyticsCard, { backgroundColor: colors.infoBg, borderColor: colors.info }]}>
              <Text style={[styles.analyticsTitle, { color: colors.textPrimary }]}>
                Showing {searchAnalytics.shown} of {searchAnalytics.totalInRadius} spaces
              </Text>
              {searchAnalytics.hiddenBySubscription > 0 && (
                <Text style={[styles.analyticsText, { color: colors.textSecondary }]}>
                  • {searchAnalytics.hiddenBySubscription} hidden: owner plans expired
                </Text>
              )}
              {searchAnalytics.hiddenByFilter > 0 && (
                <Text style={[styles.analyticsText, { color: colors.textSecondary }]}>
                  • {searchAnalytics.hiddenByFilter} hidden: filtered by your settings
                </Text>
              )}
              <TouchableOpacity onPress={() => setShowAnalyticsBanner(true)} style={{ marginTop: 6 }}>
                <Text style={[styles.analyticsDismiss, { color: colors.textMuted }]}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Filter bottom sheet ─────────────────────────────────────────── */}
        <FilterSheet
          visible={showFilters}
          onClose={() => setShowFilters(false)}
          initial={{ vehicle: filterVehicle, spaceTypes: filterSpaceTypes, sort: filterSort }}
          onApply={applyFilters}
        />

        {/* Floating Actions on the Right */}
        <View style={[
          styles.floatingRight,
          {
            bottom: selectedSpace
              ? (Platform.OS === 'ios' ? 83 + 220 : 72 + 220)
              : (Platform.OS === 'ios' ? 83 + 16 : 72 + 16)
          }
        ]}>
          {/* Radius Toggle Button */}
          <TouchableOpacity
            style={[styles.floatingCircleBtn, showRadius && styles.radiusButtonActive]}
            onPress={() => setShowRadius(!showRadius)}
            activeOpacity={0.8}
          >
            <Target size={20} color={colors.textPrimary} strokeWidth={2.5} />
          </TouchableOpacity>

          {/* Navigation Button */}
          <TouchableOpacity
            style={[styles.floatingCircleBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
            onPress={recenterToMe}
            disabled={isLocating}
          >
            {isLocating ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Navigation size={20} color={colors.white} strokeWidth={2.5} />
            )}
          </TouchableOpacity>
        </View>

        {/* Legend Card overlay on the map */}
        {!selectedSpace && (
          <View style={styles.legendCard}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.successAlt }]} />
              <View style={styles.legendTextContainer}>
                <Text style={styles.legendTitle}>Available</Text>
                <Text style={styles.legendSubtitle}>Open for booking</Text>
              </View>
            </View>
            <View style={styles.legendDivider} />
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.errorAlt }]} />
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
          {/* Drag handle */}
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHandle} />
          </View>

          {/* Close button - absolute in top-right */}
          <TouchableOpacity
            style={styles.closeCardBtn}
            onPress={() => setSelectedSpace(null)}
            activeOpacity={0.7}
          >
            <X size={14} color={colors.textMuted} strokeWidth={2.5} />
          </TouchableOpacity>
          <View style={styles.cardMainRow}>
            {/* Left image thumbnail */}
            <Image
              source={{ uri: selectedSpace.image || 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?q=80&w=200&auto=format&fit=crop' }}
              style={styles.cardImage}
              onError={() => {}}
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
                  <View style={{ paddingHorizontal: 6, paddingVertical: 2, backgroundColor: colors.warningBgAlt, borderRadius: BorderRadius.risk, borderWidth: 1, borderColor: ExtendedColors.warningYellowBorderAlt }}>
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
                    {selectedSpace.status === 'available'
                      ? 'Available'
                      : selectedSpace.status === 'closed' ? 'Closed' : 'Booked'}
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
                      // Pass the REAL address (space-detail re-fetches authoritatively;
                      // this is just the initial display, so don't fabricate a city).
                      address: selectedSpace.address || selectedSpace.area || selectedSpace.name,
                      pricePerHour: selectedSpace.price,
                      availableSlots: selectedSpace.available ?? 0,
                      rating: selectedSpace.rating ?? 0,
                      distance: selectedSpace.distance ? parseFloat(selectedSpace.distance) : 0,
                      lat: selectedSpace.latitude,
                      lng: selectedSpace.longitude,
                      ownerId: selectedSpace.ownerId,
                      spaceType: selectedSpace.spaceType || '',
                      amenities: JSON.stringify(selectedSpace.amenities || []),
                      frontPhotoUrl: selectedSpace.frontPhotoUrl || '',
                      totalSlots: selectedSpace.capacity ?? selectedSpace.available ?? 0,
                    }
                  });
                }}
              >
                <ChevronRight size={22} color={colors.primary} strokeWidth={2.5} />
              </TouchableOpacity>

              <View style={styles.priceContainer}>
                <Text style={styles.priceText}>₹{selectedSpace.price}</Text>
                <Text style={styles.priceUnit}>/hr</Text>
              </View>
            </View>
          </View>

          {/* Details & Amenities row */}
          {selectedSpace.amenities && selectedSpace.amenities.length > 0 && (
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
  );
};

export default FindSpaceMapTab;
