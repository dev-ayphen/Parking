import { StyleSheet, Platform } from 'react-native';
import type { ColorsType } from '../../theme';
import { FontSize, FontWeight, BorderRadius, Spacing, ExtendedColors } from '../../theme';
import { TAB_BAR_TOTAL } from '../../constants/tabBar';

export const makeFindSpaceStyles = (colors: ColorsType) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  // Matches the canonical PageHeader.backButton (36×36).
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.circle,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  bellBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: colors.primary,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  bellBadgeText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: FontWeight.boldAlias,
    lineHeight: 12,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  searchBarContainer: {
    position: 'absolute',
    top: Spacing.xl,
    left: Spacing.xl,
    right: Spacing.xl,
    zIndex: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 28,                               // full pill — Google-Maps style
    paddingHorizontal: Spacing['2xl'],
    height: 52,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLighter,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  // When the dropdown is open, square the bottom so bar + list read as one card.
  searchBoxActive: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: 0,
  },
  searchClearBtn: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.lg,                           // 15 — slightly larger, readable
    color: colors.textPrimary,
    paddingVertical: 0,                             // kill default vertical padding
    letterSpacing: 0,                               // force normal spacing (no scatter)
    textAlign: 'left',
  },
  searchMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
  searchChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.white,
    borderColor: colors.borderMedium,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 5,
    borderRadius: BorderRadius.circleXl,           // 20 = circleXl ✓
    flexShrink: 1,
  },
  searchChipText: {
    fontSize: FontSize.sm,                          // 12 = sm ✓
    fontWeight: FontWeight.bold,
    color: colors.textBody,
    flexShrink: 1,
  },
  radiusSelector: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: BorderRadius.circleXl,           // 20 = circleXl ✓
    padding: 3,
    gap: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  radiusOption: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: BorderRadius.lg,                 // 16 = lg ✓
  },
  radiusOptionActive: {
    backgroundColor: colors.textPrimary,
  },
  radiusOptionText: {
    fontSize: FontSize.xs,                          // 11 = xs ✓
    fontWeight: FontWeight.bold,
    color: colors.textSecondary,
  },
  radiusOptionTextActive: {
    color: colors.white,
  },
  // Right side of the search meta row: radius selector + filter button together.
  metaRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  filterBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.circleXl,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  filterBtnActive: {
    backgroundColor: colors.textPrimary,
  },
  filterBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  filterBadgeText: {
    fontSize: FontSize.tiny,
    fontWeight: FontWeight.bold,
    color: colors.white,
  },
  // "Search this area" floating pill, centered below the search bar.
  searchAreaWrap: {
    position: 'absolute',
    top: 132,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 30,
  },
  searchAreaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.white,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 9,
    borderRadius: BorderRadius.circleXl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  searchAreaText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: colors.textPrimary,
  },
  suggestionsBox: {
    backgroundColor: colors.white,
    borderBottomLeftRadius: 28,                     // match the top pill radius for symmetry
    borderBottomRightRadius: 28,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: colors.borderLighter,
    marginTop: 0,                                   // flush with squared search box
    maxHeight: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 6,
    overflow: 'hidden',
  },
  suggestionDivider: {
    height: 1,
    backgroundColor: colors.borderLighter,
    marginLeft: 56,                                 // indent past the icon, like Google
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    gap: Spacing.lg,
  },
  suggestionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionIconParking: {
    backgroundColor: colors.primaryBg,
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionName: {
    fontSize: FontSize.md,                          // 14 = md ✓
    fontWeight: FontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  suggestionMeta: {
    fontSize: FontSize.sm,                          // 12 = sm ✓
    color: colors.textSecondary,
  },
  noSuggestions: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing['3xl'],
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  noSuggestionsText: {
    fontSize: FontSize.md,                          // 14 = md ✓
    color: colors.textMuted,
    fontWeight: FontWeight.medium,
  },
  // Richer "no results" empty state — icon + title + recovery hint
  emptyResults: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing['2xl'],
  },
  emptyResultsIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.circle,
    backgroundColor: colors.screenBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emptyResultsTitle: {
    fontSize: FontSize.md,                           // 14 = md ✓
    color: colors.textSecondary,
    fontWeight: FontWeight.semibold,
  },
  emptyResultsHint: {
    fontSize: FontSize.sm,                           // 12 = sm ✓
    color: colors.textMuted,
    fontWeight: FontWeight.medium,
    marginTop: 2,
    textAlign: 'center',
  },
  spacesLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
    pointerEvents: 'none',
  },
  spacesLoadingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: colors.white,
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.circleXl,
    elevation: 4,
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  spacesLoadingText: {
    fontSize: FontSize.base,                        // 13 = base ✓
    fontWeight: FontWeight.semibold,
    color: colors.primary,
  },
  floatingRight: {
    position: 'absolute',
    right: Spacing['3xl'],
    zIndex: 25,
    gap: Spacing.xl,
  },
  floatingCircleBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    // Soft, rounded shadow. A tight shadowRadius (≈4) made iOS render the shadow
    // as a hard SQUARE box behind the round button; a larger, lighter radius lets
    // the shadow diffuse into a circular halo that follows the borderRadius.
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  radiusButtonActive: {
    borderColor: colors.textPrimary,
    backgroundColor: colors.surfaceBg,
    borderWidth: 2,
  },
  spaceCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginHorizontal: Spacing.xl,
    paddingHorizontal: Spacing['3xl'],
    paddingTop: Spacing.xl,
    paddingBottom: Spacing['3xl'],
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.10,
    shadowRadius: 18,
    elevation: 12,
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 91 : 80,
    left: 0,
    right: 0,
    zIndex: 15,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    paddingTop: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  cardHandle: {
    width: 38,
    height: 4,
    borderRadius: BorderRadius.dot,                 // 2 = dot ✓
    backgroundColor: colors.border,
  },
  closeCardBtn: {
    position: 'absolute',
    right: Spacing['3xl'],
    top: Spacing.lg,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceBg,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  cardImage: {
    width: 80,
    height: 80,
    borderRadius: 14,
    backgroundColor: colors.surfaceBg,
    overflow: 'hidden',
  },
  cardInfoCol: {
    flex: 1,
    marginLeft: Spacing.xl,
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  spaceName: {
    fontSize: FontSize.xl,                          // 16 = xl ✓
    fontWeight: FontWeight.bold,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  verifiedBadge: {
    backgroundColor: ExtendedColors.verifiedBg,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,                  // 4 = xs ✓
  },
  verifiedText: {
    fontSize: FontSize.nano,                        // 10 = nano ✓
    color: colors.successAlt,
    fontWeight: FontWeight.bold,
  },
  distanceAreaText: {
    fontSize: FontSize.base,                        // 13 = base ✓
    color: colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  ratingStar: {
    color: ExtendedColors.starLegacy,
    fontSize: FontSize.base,
  },
  ratingValue: {
    color: ExtendedColors.darkCard,
    fontWeight: FontWeight.bold,
  },
  reviewCount: {
    color: colors.textSecondary,
    fontWeight: FontWeight.normal,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  starText: {
    fontSize: FontSize.md,                          // 14 = md ✓
    color: colors.warningAlt,
  },
  ratingText: {
    fontSize: FontSize.base,                        // 13 = base ✓
    fontWeight: FontWeight.semibold,
    color: colors.textPrimary,
  },
  reviewsText: {
    fontSize: FontSize.base,
    color: colors.textSecondary,
    fontWeight: FontWeight.normal,
  },
  cardRightCol: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingVertical: 2,
    paddingLeft: Spacing.md,
  },
  chevronTouchBtn: {
    padding: 2,
    marginTop: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 2,
  },
  priceText: {
    fontSize: FontSize['4xl'],                      // 24 = 4xl ✓
    fontWeight: FontWeight.extrabold,
    color: colors.textPrimary,
  },
  priceUnit: {
    fontSize: FontSize.base,                        // 13 = base ✓
    color: colors.textSecondary,
    fontWeight: FontWeight.medium,
    marginLeft: 2,
  },
  compactAmenitiesRow: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  amenitiesScrollContent: {
    gap: Spacing.md,
  },
  amenityBadge: {
    backgroundColor: colors.primaryBg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.badge,               // 6 = badge ✓
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  amenityText: {
    fontSize: FontSize.xs,                          // 11 = xs ✓
    color: colors.primary,
    fontWeight: FontWeight.bold,
  },
  filterSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: BorderRadius.circleXl,    // 20 = circleXl ✓
    borderTopRightRadius: BorderRadius.circleXl,
    paddingTop: Spacing['3xl'],
    paddingHorizontal: Spacing['3xl'],
    paddingBottom: Platform.OS === 'ios' ? 32 : Spacing['3xl'],
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  filterHandle: {
    width: 40,
    height: 4,
    borderRadius: BorderRadius.dot,                 // 2 = dot ✓
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: Spacing.xl,
  },
  filterContent: {
    gap: Spacing['3xl'],
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterTitle: {
    fontSize: FontSize.xl,                          // 16 = xl ✓
    fontWeight: FontWeight.bold,
    color: colors.textPrimary,
  },
  filterOptions: {
    gap: Spacing.lg,
  },
  filterOption: {
    paddingHorizontal: Spacing['3xl'],
    paddingVertical: Spacing.xl,
    borderRadius: BorderRadius.input,               // 10 = input ✓
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.screenBg,
  },
  filterOptionActive: {
    backgroundColor: colors.primaryBg,
    borderColor: colors.primary,
  },
  filterOptionText: {
    fontSize: FontSize.md,                          // 14 = md ✓
    color: colors.textBody,
    fontWeight: FontWeight.medium,
  },
  filterOptionTextActive: {
    color: colors.primary,
    fontWeight: FontWeight.semibold,
  },
  applyBtn: {
    paddingVertical: Spacing.xl,
    backgroundColor: colors.primary,
    borderRadius: BorderRadius.input,               // 10 = input ✓
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  applyBtnText: {
    fontSize: FontSize.lg,                          // 15 = lg ✓
    fontWeight: FontWeight.bold,
    color: colors.white,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBg,
    height: Platform.OS === 'ios' ? 83 : 72,
    paddingBottom: Platform.OS === 'ios' ? Spacing.screenH : Spacing.md,
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 8,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  navTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  navText: {
    fontSize: FontSize.nano,                        // 10 = nano ✓
    color: colors.textSecondary,
    fontWeight: FontWeight.semibold,
    letterSpacing: -0.1,
  },
  navTextActive: {
    color: colors.primary,
    fontWeight: FontWeight.bold,
  },
  pricePill: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.circleXl,           // 20 = circleXl ✓
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  pillAvailable: {
    backgroundColor: colors.white,
  },
  pillBooked: {
    backgroundColor: colors.surfaceBg,
    opacity: 0.8,
  },
  pillSelected: {
    backgroundColor: colors.textPrimary,
    transform: [{ scale: 1.1 }],
    borderColor: colors.textPrimary,
  },
  pillText: {
    fontSize: FontSize.base,                        // 13 = base ✓
    fontWeight: FontWeight.extrabold,
    letterSpacing: -0.2,
  },
  pillTextAvailable: {
    color: colors.textPrimary,
  },
  pillTextBooked: {
    color: colors.textMuted,
  },
  pillTextSelected: {
    color: colors.white,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,                  // 4 = xs ✓
    marginLeft: Spacing.sm,
  },
  statusBadgeAvailable: {
    backgroundColor: ExtendedColors.greenBg,
  },
  statusBadgeBooked: {
    backgroundColor: ExtendedColors.redBg,
  },
  statusBadgeText: {
    fontSize: FontSize.micro,                       // 9 = micro ✓
    fontWeight: FontWeight.bold,
  },
  statusBadgeTextAvailable: {
    color: ExtendedColors.googleGreenDeep,
  },
  statusBadgeTextBooked: {
    color: ExtendedColors.redTextGoogle,
  },
  legendCard: {
    position: 'absolute',
    bottom: TAB_BAR_TOTAL + Spacing.xl,
    left: Spacing['3xl'],
    width: 280,
    backgroundColor: colors.white,
    borderRadius: BorderRadius.lg,                  // 16 = lg ✓
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 10,
    borderWidth: 1,
    borderColor: colors.surfaceBg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendTextContainer: {
    flexDirection: 'column',
  },
  legendTitle: {
    fontSize: FontSize.xs,                          // 11 = xs ✓
    fontWeight: FontWeight.bold,
    color: colors.textPrimary,
  },
  legendSubtitle: {
    fontSize: FontSize.micro,                       // 9 = micro ✓
    color: colors.textSecondary,
    marginTop: 1,
  },
  legendDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.surfaceBg,
    marginHorizontal: Spacing.md,
  },
  // Vehicles, Active Session, and History Styles
  headerTabTitle: {
    fontSize: FontSize['2xl'],                      // 18 = 2xl ✓
    fontWeight: FontWeight.bold,
    color: colors.textPrimary,
  },
  addVehicleBtnHeader: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.circle,             // 19 = circle ✓
    backgroundColor: ExtendedColors.primaryTint1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContent: {
    flex: 1,
    backgroundColor: colors.screenBg,
  },
  tabContentContainer: {
    padding: Spacing.screenH,
    // Clear the absolute bottom nav (iOS 83 / Android 72) plus a small gap so the
    // last list row is never hidden behind the bar.
    paddingBottom: Platform.OS === 'ios' ? 100 : 90,
  },
  sectionHeading: {
    fontSize: FontSize.xl,                          // 16 = xl ✓
    fontWeight: FontWeight.bold,
    color: colors.textPrimary,
    marginBottom: Spacing.xl,
    marginTop: Spacing.md,
  },
  // Add Vehicle Form Card
  formCard: {
    backgroundColor: colors.white,
    borderRadius: BorderRadius.lg,                  // 16 = lg ✓
    padding: Spacing.screenH,
    marginBottom: Spacing.screenH,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  formTitle: {
    fontSize: FontSize.xl,                          // 16 = xl ✓
    fontWeight: FontWeight.bold,
    color: colors.textPrimary,
    marginBottom: Spacing['3xl'],
  },
  inputLabel: {
    fontSize: FontSize.base,                        // 13 = base ✓
    fontWeight: FontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.xl,
  },
  formInput: {
    height: 48,
    backgroundColor: colors.screenBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: BorderRadius.input,               // 10 = input ✓
    paddingHorizontal: Spacing['3xl'],
    fontSize: FontSize.md,                          // 14 = md ✓
    color: colors.textPrimary,
    marginBottom: Spacing['3xl'],
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xs,
    marginBottom: Spacing['3xl'],
  },
  chipRowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginTop: Spacing.xs,
    marginBottom: Spacing['3xl'],
  },
  photoUploadRow: {
    flexDirection: 'row',
    gap: Spacing.xl,
    marginBottom: Spacing['3xl'],
  },
  uploadBox: {
    flex: 1,
    height: 80,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.md,                  // 12 = md ✓
    backgroundColor: colors.screenBg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  fullWidthUploadBox: {
    height: 80,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.md,                  // 12 = md ✓
    backgroundColor: colors.screenBg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    marginBottom: Spacing['3xl'],
  },
  uploadBoxSuccess: {
    borderColor: colors.successAlt,
    backgroundColor: colors.successBgAlt,
    borderStyle: 'solid',
  },
  uploadBoxText: {
    fontSize: FontSize.sm,                          // 12 = sm ✓
    fontWeight: FontWeight.semibold,
    color: colors.textSecondary,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xl,
    marginBottom: Spacing.screenH,
    paddingVertical: Spacing.md,
  },
  checkboxLabel: {
    fontSize: FontSize.md,                          // 14 = md ✓
    color: colors.textPrimary,
    fontWeight: FontWeight.medium,
    flex: 1,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: BorderRadius.badge,               // 6 = badge ✓
    borderWidth: 2,
    borderColor: colors.borderMedium,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeChip: {
    flex: 1,
    height: 38,
    backgroundColor: colors.screenBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: BorderRadius.circle,              // 19 = circle ✓
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeChipActive: {
    backgroundColor: ExtendedColors.primaryTint1,
    borderColor: colors.primary,
  },
  typeChipText: {
    fontSize: FontSize.sm,                          // 12 = sm ✓
    fontWeight: FontWeight.semibold,
    color: colors.textSecondary,
  },
  typeChipTextActive: {
    color: colors.primary,
  },
  formActionsRow: {
    flexDirection: 'row',
    gap: Spacing.xl,
    marginTop: Spacing.md,
  },
  cancelFormBtn: {
    flex: 1,
    height: 46,
    borderRadius: BorderRadius.input,               // 10 = input ✓
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceBg,
  },
  cancelFormBtnText: {
    fontSize: FontSize.md,                          // 14 = md ✓
    fontWeight: FontWeight.semibold,
    color: colors.textSecondary,
  },
  saveFormBtn: {
    flex: 1.5,
    height: 46,
    borderRadius: BorderRadius.input,               // 10 = input ✓
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  saveFormBtnText: {
    fontSize: FontSize.md,                          // 14 = md ✓
    fontWeight: FontWeight.semibold,
    color: colors.white,
  },
  // Empty states
  emptyStateContainer: {
    backgroundColor: colors.white,
    borderRadius: BorderRadius.lg,                  // 16 = lg ✓
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: FontSize.md,                          // 14 = md ✓
    color: colors.textSecondary,
    marginTop: Spacing.xl,
    marginBottom: Spacing['3xl'],
  },
  emptyStateBtn: {
    paddingHorizontal: Spacing.screenH,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.circleXl,           // 20 = circleXl ✓
    backgroundColor: colors.primary,
  },
  emptyStateBtnText: {
    fontSize: FontSize.base,                        // 13 = base ✓
    fontWeight: FontWeight.bold,
    color: colors.white,
  },
  // Vehicle Card List
  vehicleCard: {
    backgroundColor: colors.white,
    borderRadius: BorderRadius.button,              // 14 = button ✓
    padding: Spacing['3xl'],
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  vehicleCardActive: {
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  vehicleInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing['3xl'],
  },
  vehicleIconBgActive: {
    backgroundColor: ExtendedColors.primaryTint1,
  },
  vehicleDetailsCol: {
    flex: 1,
  },
  vehicleNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  vehicleNameText: {
    fontSize: FontSize.lg,                          // 15 = lg ✓
    fontWeight: FontWeight.bold,
    color: colors.textPrimary,
  },
  activeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,                  // 4 = xs ✓
    backgroundColor: colors.primary,
  },
  activeBadgeText: {
    fontSize: FontSize.micro,                       // 9 = micro ✓
    fontWeight: FontWeight.extrabold,
    color: colors.white,
  },
  vehiclePlateText: {
    fontSize: FontSize.base,                        // 13 = base ✓
    fontWeight: FontWeight.semibold,
    color: colors.textBody,
    marginTop: 2,
  },
  vehicleTypeText: {
    fontSize: FontSize.xs,                          // 11 = xs ✓
    color: colors.textMuted,
    marginTop: 2,
  },
  vehicleActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteVehicleBtn: {
    padding: Spacing.md,
  },
  editVehicleBtn: {
    padding: Spacing.md,
    marginLeft: Spacing.xs,
  },
  tipContainer: {
    backgroundColor: colors.surfaceBg,
    borderRadius: BorderRadius.md,                  // 12 = md ✓
    padding: Spacing['3xl'],
    marginTop: Spacing.screenH,
  },
  tipTitle: {
    fontSize: FontSize.base,                        // 13 = base ✓
    fontWeight: FontWeight.bold,
    color: colors.textDark,
    marginBottom: Spacing.xs,
  },
  tipText: {
    fontSize: FontSize.sm,                          // 12 = sm ✓
    color: colors.textBody,
    lineHeight: 18,
  },
  // Empty tab view state
  emptyTabContent: {
    flex: 1,
    backgroundColor: colors.screenBg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyStateHeading: {
    fontSize: FontSize['2xl'],                      // 18 = 2xl ✓
    fontWeight: FontWeight.bold,
    color: colors.textPrimary,
    marginTop: Spacing['3xl'],
    marginBottom: Spacing.md,
  },
  emptyStateSubtext: {
    fontSize: FontSize.md,                          // 14 = md ✓
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing['4xl'],
  },
  exploreBtn: {
    paddingHorizontal: Spacing['4xl'],
    paddingVertical: Spacing.xl,
    borderRadius: 24,
    backgroundColor: colors.primary,
  },
  exploreBtnText: {
    fontSize: FontSize.md,                          // 14 = md ✓
    fontWeight: FontWeight.bold,
    color: colors.white,
  },
  // Active session status banners
  statusAlertBanner: {
    borderRadius: BorderRadius.input,               // 10 = input ✓
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing['3xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing['3xl'],
  },
  statusActiveBanner: {
    backgroundColor: ExtendedColors.greenTint,
  },
  statusPendingBanner: {
    backgroundColor: ExtendedColors.warningYellow,
  },
  statusAlertText: {
    fontSize: FontSize.sm,                          // 12 = sm ✓
    fontWeight: FontWeight.extrabold,
    letterSpacing: 0,
  },
  statusActiveText: {
    color: ExtendedColors.greenTextDeep,
  },
  statusPendingText: {
    color: ExtendedColors.warningMid,
  },
  // OTP entry widget
  otpCardContainer: {
    backgroundColor: colors.white,
    borderRadius: BorderRadius.lg,                  // 16 = lg ✓
    padding: Spacing.screenH,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: Spacing['3xl'],
  },
  otpCardTitle: {
    fontSize: FontSize.md,                          // 14 = md ✓
    fontWeight: FontWeight.bold,
    color: colors.textSecondary,
    marginBottom: Spacing.md,
  },
  otpCodeValue: {
    fontSize: FontSize['9xl'],                      // 36 = 9xl ✓
    fontWeight: FontWeight.extrabold,
    color: colors.primary,
    letterSpacing: 8,
    marginVertical: Spacing.xl,
  },
  otpInstructionText: {
    fontSize: FontSize.sm,                          // 12 = sm ✓
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Spacing['3xl'],
  },
  otpVerifyForm: {
    width: '100%',
    marginTop: Spacing.md,
  },
  otpVerifyBtn: {
    backgroundColor: colors.primary,
    borderRadius: BorderRadius.md,                  // 12 = md ✓
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    width: '100%',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  otpVerifyBtnText: {
    fontSize: FontSize.lg,                          // 15 = lg ✓
    fontWeight: FontWeight.bold,
    color: colors.white,
  },
  // Active Timer Card
  timerCard: {
    backgroundColor: colors.textPrimary,
    borderRadius: BorderRadius.lg,                  // 16 = lg ✓
    padding: Spacing['4xl'],
    alignItems: 'center',
    marginBottom: Spacing['3xl'],
  },
  timerLabel: {
    fontSize: FontSize.sm,                          // 12 = sm ✓
    fontWeight: FontWeight.bold,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  timerCountdown: {
    fontSize: FontSize['10xl'],                     // 38 = 10xl ✓
    fontWeight: FontWeight.extrabold,
    color: colors.white,
    fontVariant: ['tabular-nums'],
    marginVertical: Spacing.xl,
  },
  timerProgressBg: {
    width: '100%',
    height: 6,
    backgroundColor: colors.textDark,
    borderRadius: BorderRadius.indicator,           // 3 = indicator ✓
    overflow: 'hidden',
    marginBottom: Spacing['2xl'],
  },
  timerProgressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  timerMetadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  timerMetaText: {
    fontSize: FontSize.sm,                          // 12 = sm ✓
    color: colors.textMuted,
  },
  // Detail card
  detailCard: {
    backgroundColor: colors.white,
    borderRadius: BorderRadius.lg,                  // 16 = lg ✓
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: Spacing['3xl'],
  },
  detailSectionTitle: {
    fontSize: FontSize.base,                        // 13 = base ✓
    fontWeight: FontWeight.bold,
    color: colors.textSecondary,
    letterSpacing: 0,
    marginBottom: Spacing.lg,
  },
  detailSpaceName: {
    fontSize: FontSize.lg,                          // 15 = lg ✓
    fontWeight: FontWeight.bold,
    color: colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  detailAddress: {
    fontSize: FontSize.base,                        // 13 = base ✓
    color: colors.textSecondary,
    lineHeight: 18,
  },
  detailSeparator: {
    height: 1,
    backgroundColor: colors.surfaceBg,
    marginVertical: Spacing['2xl'],
  },
  metaInfoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaInfoItem: {
    flex: 1,
  },
  metaItemLabel: {
    fontSize: FontSize.xs,                          // 11 = xs ✓
    fontWeight: FontWeight.semibold,
    color: colors.textMuted,
    marginBottom: Spacing.xs,
  },
  metaItemValue: {
    fontSize: FontSize.base,                        // 13 = base ✓
    fontWeight: FontWeight.bold,
    color: colors.textDark,
  },
  metaItemSub: {
    fontSize: FontSize.xs,                          // 11 = xs ✓
    color: colors.textSecondary,
    marginTop: 1,
  },
  // Owner profile card
  ownerCard: {
    backgroundColor: colors.white,
    borderRadius: BorderRadius.lg,                  // 16 = lg ✓
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: Spacing['3xl'],
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ownerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: Spacing.xl,
  },
  ownerInfo: {
    flex: 1,
  },
  ownerNameText: {
    fontSize: FontSize.md,                          // 14 = md ✓
    fontWeight: FontWeight.bold,
    color: colors.textPrimary,
  },
  ownerRatingText: {
    fontSize: FontSize.sm,                          // 12 = sm ✓
    color: colors.textSecondary,
    marginTop: 2,
  },
  ownerActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  ownerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.screenBg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Session controls
  sessionControlActions: {
    flexDirection: 'row',
    gap: Spacing.xl,
    marginTop: Spacing.md,
  },
  navigationBtn: {
    flex: 1,
    height: 48,
    borderRadius: BorderRadius.md,                  // 12 = md ✓
    backgroundColor: colors.textPrimary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  navigationBtnText: {
    fontSize: FontSize.md,                          // 14 = md ✓
    fontWeight: FontWeight.bold,
    color: colors.white,
  },
  leaveSessionBtn: {
    flex: 1,
    height: 48,
    borderRadius: BorderRadius.md,                  // 12 = md ✓
    backgroundColor: colors.errorAlt,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  leaveSessionBtnText: {
    fontSize: FontSize.md,                          // 14 = md ✓
    fontWeight: FontWeight.bold,
    color: colors.white,
  },
  // History logs styles
  historyCard: {
    backgroundColor: colors.white,
    borderRadius: BorderRadius.lg,                  // 16 = lg ✓
    padding: Spacing['3xl'],
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: Spacing.xl,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  // Title block must flex so a long space name / address wraps instead of pushing
  // the status badge off the right edge of the card.
  historyHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  historySpaceName: {
    fontSize: FontSize.lg,                          // 15 = lg ✓
    fontWeight: FontWeight.bold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  historyAddress: {
    fontSize: FontSize.sm,                          // 12 = sm ✓
    color: colors.textSecondary,
  },
  historyStatusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.badge,               // 6 = badge ✓
    flexShrink: 0,                                  // never squeeze/clip the badge
  },
  statusBadgeCompleted: {
    backgroundColor: ExtendedColors.greenTint,
  },
  statusBadgeCancelled: {
    backgroundColor: ExtendedColors.redTint,
  },
  historyStatusText: {
    fontSize: FontSize.nano,                        // 10 = nano ✓
    fontWeight: FontWeight.extrabold,
    letterSpacing: 0,
  },
  statusTextCompleted: {
    color: ExtendedColors.greenTextDeep,
  },
  statusTextCancelled: {
    color: ExtendedColors.redTextMid,
  },
  historyDivider: {
    height: 1,
    backgroundColor: colors.surfaceBg,
    marginVertical: Spacing.xl,
  },
  historyDetailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  historyDetailsCol: {
    flex: 1,
  },
  historyDetailLabel: {
    fontSize: FontSize.xs,                          // 11 = xs ✓
    fontWeight: FontWeight.semibold,
    color: colors.textMuted,
    marginBottom: 2,
  },
  historyDetailValue: {
    fontSize: FontSize.sm,                          // 12 = sm ✓
    fontWeight: FontWeight.bold,
    color: colors.textBody,
  },
  historyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xl,
    paddingTop: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBg,
  },
  historyFooterLabel: {
    fontSize: FontSize.xs,                          // 11 = xs ✓
    color: colors.textSecondary,
  },
  historyStars: {
    flexDirection: 'row',
    gap: 2,
  },
  starChar: {
    fontSize: FontSize.sm,                          // 12 = sm ✓
  },
  starCharSelected: {
    color: ExtendedColors.starDark,
  },
  starCharEmpty: {
    color: colors.border,
  },
  editModalContainer: {
    flex: 1,
    backgroundColor: colors.screenBg,
  },
  editModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing['3xl'],
    paddingVertical: Spacing.xl,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  editModalTitle: {
    fontSize: FontSize['2xl'],                      // 18 = 2xl ✓
    fontWeight: FontWeight.bold,
    color: colors.textPrimary,
  },
  editModalContent: {
    flex: 1,
    paddingHorizontal: Spacing['3xl'],
    paddingVertical: Spacing['3xl'],
  },
  editFieldLabel: {
    fontSize: FontSize.md,                          // 14 = md ✓
    fontWeight: FontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: Spacing.md,
    marginTop: Spacing.xl,
  },
  editTextInput: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: BorderRadius.sm,                  // 8 = sm ✓
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    fontSize: FontSize.md,                          // 14 = md ✓
    color: colors.textPrimary,
    backgroundColor: colors.white,
  },
  editTypeContainer: {
    flexDirection: 'row',
    gap: Spacing.xl,
    marginBottom: Spacing['3xl'],
  },
  editTypeBtn: {
    flex: 1,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.sm,                  // 8 = sm ✓
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
  },
  editTypeBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryBg,
  },
  editTypeText: {
    fontSize: FontSize.base,                        // 13 = base ✓
    fontWeight: FontWeight.semibold,
    color: colors.textSecondary,
  },
  editTypeTextActive: {
    color: colors.primary,
  },
  editCapacityContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing['3xl'],
  },
  editCapacityBtn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,                  // 8 = sm ✓
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  editCapacityBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryBg,
  },
  editCapacityText: {
    fontSize: FontSize.sm,                          // 12 = sm ✓
    fontWeight: FontWeight.semibold,
    color: colors.textSecondary,
  },
  editCapacityTextActive: {
    color: colors.primary,
  },
  editModalFooter: {
    flexDirection: 'row',
    gap: Spacing.xl,
    paddingHorizontal: Spacing['3xl'],
    paddingVertical: Spacing.xl,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  editCancelBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: BorderRadius.sm,                  // 8 = sm ✓
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  editCancelBtnText: {
    color: colors.primary,
    fontSize: FontSize.md,                          // 14 = md ✓
    fontWeight: FontWeight.bold,
  },
  editUpdateBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: BorderRadius.sm,                  // 8 = sm ✓
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  editUpdateBtnText: {
    color: colors.white,
    fontSize: FontSize.md,                          // 14 = md ✓
    fontWeight: FontWeight.bold,
  },
});
