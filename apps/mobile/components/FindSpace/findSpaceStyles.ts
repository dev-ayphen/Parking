import { StyleSheet, Platform } from 'react-native';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, ExtendedColors } from '../../theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenH,
    paddingVertical: Spacing.xl,
    backgroundColor: Colors.white,
    borderBottomWidth: 0,
  },
  menuIconButton: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.circle,              // 19 = circle ✓
    backgroundColor: Colors.screenBg,
    borderWidth: 1,
    borderColor: Colors.surfaceBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  logoText: {
    fontSize: FontSize['2xl'],                      // 18 = 2xl ✓
    fontWeight: FontWeight.black,                   // '900' = black ✓
    color: Colors.textPrimary,
    letterSpacing: -0.6,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2xl'],
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.circle,              // 19 = circle ✓
    backgroundColor: Colors.screenBg,
    borderWidth: 1,
    borderColor: Colors.surfaceBg,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: Colors.primary,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
  bellBadgeText: {
    color: Colors.white,
    fontSize: FontSize.tiny,                        // 8 = tiny ✓
    fontWeight: FontWeight.boldAlias,
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
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,                  // 12 = md ✓
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    gap: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.md,                          // 14 = md ✓
    color: Colors.textPrimary,
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
    backgroundColor: ExtendedColors.indigoBg,
    borderColor: ExtendedColors.indigoBorder,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 5,
    borderRadius: BorderRadius.circleXl,           // 20 = circleXl ✓
    flexShrink: 1,
  },
  searchChipText: {
    fontSize: FontSize.sm,                          // 12 = sm ✓
    fontWeight: FontWeight.bold,
    color: ExtendedColors.indigoText,
    flexShrink: 1,
  },
  radiusSelector: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
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
    backgroundColor: ExtendedColors.indigoAccent,
  },
  radiusOptionText: {
    fontSize: FontSize.xs,                          // 11 = xs ✓
    fontWeight: FontWeight.bold,
    color: Colors.textSecondary,
  },
  radiusOptionTextActive: {
    color: Colors.white,
  },
  suggestionsBox: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,                  // 12 = md ✓
    marginTop: Spacing.md,
    maxHeight: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBg,
    gap: Spacing.lg,
  },
  suggestionIcon: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,                  // 8 = sm ✓
    backgroundColor: ExtendedColors.indigoBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionName: {
    fontSize: FontSize.md,                          // 14 = md ✓
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  suggestionMeta: {
    fontSize: FontSize.sm,                          // 12 = sm ✓
    color: Colors.textSecondary,
  },
  noSuggestions: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing['3xl'],
    alignItems: 'center',
  },
  noSuggestionsText: {
    fontSize: FontSize.md,                          // 14 = md ✓
    color: Colors.textMuted,
    fontWeight: FontWeight.medium,
  },
  spacesLoadingOverlay: {
    position: 'absolute',
    top: Spacing['3xl'],
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.circleXl,           // 20 = circleXl ✓
    elevation: 4,
    shadowColor: Colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    zIndex: 30,
  },
  spacesLoadingText: {
    fontSize: FontSize.base,                        // 13 = base ✓
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
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
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  radiusButtonActive: {
    borderColor: ExtendedColors.indigoAccent,
    backgroundColor: ExtendedColors.indigoBg,
    borderWidth: 2,
  },
  spaceCard: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,           // 24 = xl ✓
    borderTopRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing['3xl'],
    paddingTop: Spacing.xl,
    paddingBottom: Spacing['3xl'],
    shadowColor: Colors.textPrimary,
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 12,
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 76 : 58,
    left: 0,
    right: 0,
    zIndex: 15,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    height: 32,
    marginBottom: Spacing.xl,
  },
  cardHandle: {
    width: 38,
    height: 4,
    borderRadius: BorderRadius.dot,                 // 2 = dot ✓
    backgroundColor: Colors.border,
  },
  closeCardBtn: {
    position: 'absolute',
    right: Spacing['3xl'],
    top: Spacing['2xl'],
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.surfaceBg,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  cardImage: {
    width: 76,
    height: 76,
    borderRadius: BorderRadius.md,                  // 12 = md ✓
    backgroundColor: Colors.surfaceBg,
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
    color: Colors.textPrimary,
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
    color: Colors.successAlt,
    fontWeight: FontWeight.bold,
  },
  distanceAreaText: {
    fontSize: FontSize.base,                        // 13 = base ✓
    color: Colors.textSecondary,
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
    color: Colors.textSecondary,
    fontWeight: FontWeight.normal,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  starText: {
    fontSize: FontSize.md,                          // 14 = md ✓
    color: Colors.warningAlt,
  },
  ratingText: {
    fontSize: FontSize.base,                        // 13 = base ✓
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  reviewsText: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
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
    marginTop: -2,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 2,
  },
  priceText: {
    fontSize: FontSize['4xl'],                      // 24 = 4xl ✓
    fontWeight: FontWeight.extrabold,
    color: Colors.textPrimary,
  },
  priceUnit: {
    fontSize: FontSize.base,                        // 13 = base ✓
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
    marginLeft: 2,
  },
  compactAmenitiesRow: {
    marginTop: Spacing.xl,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBg,
  },
  amenitiesScrollContent: {
    gap: Spacing.md,
  },
  amenityBadge: {
    backgroundColor: ExtendedColors.indigoBg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.badge,               // 6 = badge ✓
    borderWidth: 1,
    borderColor: ExtendedColors.indigoTint,
  },
  amenityText: {
    fontSize: FontSize.xs,                          // 11 = xs ✓
    color: ExtendedColors.indigoAccent,
    fontWeight: FontWeight.bold,
  },
  filterSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
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
    backgroundColor: Colors.border,
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
    color: Colors.textPrimary,
  },
  filterOptions: {
    gap: Spacing.lg,
  },
  filterOption: {
    paddingHorizontal: Spacing['3xl'],
    paddingVertical: Spacing.xl,
    borderRadius: BorderRadius.input,               // 10 = input ✓
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.screenBg,
  },
  filterOptionActive: {
    backgroundColor: ExtendedColors.indigoBg,
    borderColor: ExtendedColors.indigoAccent,
  },
  filterOptionText: {
    fontSize: FontSize.md,                          // 14 = md ✓
    color: Colors.textBody,
    fontWeight: FontWeight.medium,
  },
  filterOptionTextActive: {
    color: ExtendedColors.indigoAccent,
    fontWeight: FontWeight.semibold,
  },
  applyBtn: {
    paddingVertical: Spacing.xl,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.input,               // 10 = input ✓
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  applyBtnText: {
    fontSize: FontSize.lg,                          // 15 = lg ✓
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBg,
    height: Platform.OS === 'ios' ? 76 : 58,
    paddingBottom: Platform.OS === 'ios' ? Spacing.screenH : 0,
    shadowColor: Colors.textPrimary,
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
    color: Colors.textSecondary,
    fontWeight: FontWeight.semibold,
    letterSpacing: -0.1,
  },
  navTextActive: {
    color: Colors.primary,
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
    backgroundColor: Colors.white,
  },
  pillBooked: {
    backgroundColor: Colors.surfaceBg,
    opacity: 0.8,
  },
  pillSelected: {
    backgroundColor: Colors.textPrimary,
    transform: [{ scale: 1.1 }],
    borderColor: Colors.textPrimary,
  },
  pillText: {
    fontSize: FontSize.base,                        // 13 = base ✓
    fontWeight: FontWeight.extrabold,
    letterSpacing: -0.2,
  },
  pillTextAvailable: {
    color: Colors.textPrimary,
  },
  pillTextBooked: {
    color: Colors.textMuted,
  },
  pillTextSelected: {
    color: Colors.white,
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
    bottom: Platform.OS === 'ios' ? 60 : 50,
    left: Spacing['3xl'],
    width: 280,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,                  // 16 = lg ✓
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: Colors.textPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 10,
    borderWidth: 1,
    borderColor: Colors.surfaceBg,
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
    color: Colors.textPrimary,
  },
  legendSubtitle: {
    fontSize: FontSize.micro,                       // 9 = micro ✓
    color: Colors.textSecondary,
    marginTop: 1,
  },
  legendDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.surfaceBg,
    marginHorizontal: Spacing.md,
  },
  // Vehicles, Active Session, and History Styles
  headerTabTitle: {
    fontSize: FontSize['2xl'],                      // 18 = 2xl ✓
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
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
    backgroundColor: Colors.screenBg,
  },
  tabContentContainer: {
    padding: Spacing.screenH,
    paddingBottom: Spacing['7xl'],
  },
  sectionHeading: {
    fontSize: FontSize.xl,                          // 16 = xl ✓
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xl,
    marginTop: Spacing.md,
  },
  // Add Vehicle Form Card
  formCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,                  // 16 = lg ✓
    padding: Spacing.screenH,
    marginBottom: Spacing.screenH,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  formTitle: {
    fontSize: FontSize.xl,                          // 16 = xl ✓
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing['3xl'],
  },
  inputLabel: {
    fontSize: FontSize.base,                        // 13 = base ✓
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.xl,
  },
  formInput: {
    height: 48,
    backgroundColor: Colors.screenBg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.input,               // 10 = input ✓
    paddingHorizontal: Spacing['3xl'],
    fontSize: FontSize.md,                          // 14 = md ✓
    color: Colors.textPrimary,
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
    borderColor: Colors.border,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.md,                  // 12 = md ✓
    backgroundColor: Colors.screenBg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  fullWidthUploadBox: {
    height: 80,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.md,                  // 12 = md ✓
    backgroundColor: Colors.screenBg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    marginBottom: Spacing['3xl'],
  },
  uploadBoxSuccess: {
    borderColor: Colors.successAlt,
    backgroundColor: Colors.successBgAlt,
    borderStyle: 'solid',
  },
  uploadBoxText: {
    fontSize: FontSize.sm,                          // 12 = sm ✓
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
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
    color: Colors.textPrimary,
    fontWeight: FontWeight.medium,
    flex: 1,
  },
  typeChip: {
    flex: 1,
    height: 38,
    backgroundColor: Colors.screenBg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.circle,              // 19 = circle ✓
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeChipActive: {
    backgroundColor: ExtendedColors.primaryTint1,
    borderColor: Colors.primary,
  },
  typeChipText: {
    fontSize: FontSize.sm,                          // 12 = sm ✓
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  typeChipTextActive: {
    color: Colors.primary,
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
    backgroundColor: Colors.surfaceBg,
  },
  cancelFormBtnText: {
    fontSize: FontSize.md,                          // 14 = md ✓
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  saveFormBtn: {
    flex: 1.5,
    height: 46,
    borderRadius: BorderRadius.input,               // 10 = input ✓
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  saveFormBtnText: {
    fontSize: FontSize.md,                          // 14 = md ✓
    fontWeight: FontWeight.semibold,
    color: Colors.white,
  },
  // Empty states
  emptyStateContainer: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,                  // 16 = lg ✓
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: FontSize.md,                          // 14 = md ✓
    color: Colors.textSecondary,
    marginTop: Spacing.xl,
    marginBottom: Spacing['3xl'],
  },
  emptyStateBtn: {
    paddingHorizontal: Spacing.screenH,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.circleXl,           // 20 = circleXl ✓
    backgroundColor: Colors.primary,
  },
  emptyStateBtnText: {
    fontSize: FontSize.base,                        // 13 = base ✓
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  // Vehicle Card List
  vehicleCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.button,              // 14 = button ✓
    padding: Spacing['3xl'],
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.textPrimary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  vehicleCardActive: {
    borderColor: Colors.primary,
    backgroundColor: ExtendedColors.primaryTint1,
  },
  vehicleInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing['3xl'],
  },
  vehicleIconBgActive: {
    backgroundColor: Colors.primary,
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
    color: Colors.textPrimary,
  },
  activeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,                  // 4 = xs ✓
    backgroundColor: Colors.primary,
  },
  activeBadgeText: {
    fontSize: FontSize.micro,                       // 9 = micro ✓
    fontWeight: FontWeight.extrabold,
    color: Colors.white,
  },
  vehiclePlateText: {
    fontSize: FontSize.base,                        // 13 = base ✓
    fontWeight: FontWeight.semibold,
    color: Colors.textBody,
    marginTop: 2,
  },
  vehicleTypeText: {
    fontSize: FontSize.xs,                          // 11 = xs ✓
    color: Colors.textMuted,
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
    backgroundColor: Colors.surfaceBg,
    borderRadius: BorderRadius.md,                  // 12 = md ✓
    padding: Spacing['3xl'],
    marginTop: Spacing.screenH,
  },
  tipTitle: {
    fontSize: FontSize.base,                        // 13 = base ✓
    fontWeight: FontWeight.bold,
    color: Colors.textDark,
    marginBottom: Spacing.xs,
  },
  tipText: {
    fontSize: FontSize.sm,                          // 12 = sm ✓
    color: Colors.textBody,
    lineHeight: 18,
  },
  // Empty tab view state
  emptyTabContent: {
    flex: 1,
    backgroundColor: Colors.screenBg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyStateHeading: {
    fontSize: FontSize['2xl'],                      // 18 = 2xl ✓
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginTop: Spacing['3xl'],
    marginBottom: Spacing.md,
  },
  emptyStateSubtext: {
    fontSize: FontSize.md,                          // 14 = md ✓
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing['4xl'],
  },
  exploreBtn: {
    paddingHorizontal: Spacing['4xl'],
    paddingVertical: Spacing.xl,
    borderRadius: 24,
    backgroundColor: Colors.primary,
  },
  exploreBtnText: {
    fontSize: FontSize.md,                          // 14 = md ✓
    fontWeight: FontWeight.bold,
    color: Colors.white,
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
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,                  // 16 = lg ✓
    padding: Spacing.screenH,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing['3xl'],
  },
  otpCardTitle: {
    fontSize: FontSize.md,                          // 14 = md ✓
    fontWeight: FontWeight.bold,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  otpCodeValue: {
    fontSize: FontSize['9xl'],                      // 36 = 9xl ✓
    fontWeight: FontWeight.extrabold,
    color: Colors.primary,
    letterSpacing: 8,
    marginVertical: Spacing.xl,
  },
  otpInstructionText: {
    fontSize: FontSize.sm,                          // 12 = sm ✓
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Spacing['3xl'],
  },
  otpVerifyForm: {
    width: '100%',
    marginTop: Spacing.md,
  },
  otpVerifyBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,                  // 12 = md ✓
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    width: '100%',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  otpVerifyBtnText: {
    fontSize: FontSize.lg,                          // 15 = lg ✓
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  // Active Timer Card
  timerCard: {
    backgroundColor: Colors.textPrimary,
    borderRadius: BorderRadius.lg,                  // 16 = lg ✓
    padding: Spacing['4xl'],
    alignItems: 'center',
    marginBottom: Spacing['3xl'],
  },
  timerLabel: {
    fontSize: FontSize.sm,                          // 12 = sm ✓
    fontWeight: FontWeight.bold,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  timerCountdown: {
    fontSize: FontSize['10xl'],                     // 38 = 10xl ✓
    fontWeight: FontWeight.extrabold,
    color: Colors.white,
    fontVariant: ['tabular-nums'],
    marginVertical: Spacing.xl,
  },
  timerProgressBg: {
    width: '100%',
    height: 6,
    backgroundColor: Colors.textDark,
    borderRadius: BorderRadius.indicator,           // 3 = indicator ✓
    overflow: 'hidden',
    marginBottom: Spacing['2xl'],
  },
  timerProgressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  timerMetadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  timerMetaText: {
    fontSize: FontSize.sm,                          // 12 = sm ✓
    color: Colors.textMuted,
  },
  // Detail card
  detailCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,                  // 16 = lg ✓
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing['3xl'],
  },
  detailSectionTitle: {
    fontSize: FontSize.base,                        // 13 = base ✓
    fontWeight: FontWeight.bold,
    color: Colors.textSecondary,
    letterSpacing: 0,
    marginBottom: Spacing.lg,
  },
  detailSpaceName: {
    fontSize: FontSize.lg,                          // 15 = lg ✓
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  detailAddress: {
    fontSize: FontSize.base,                        // 13 = base ✓
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  detailSeparator: {
    height: 1,
    backgroundColor: Colors.surfaceBg,
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
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  metaItemValue: {
    fontSize: FontSize.base,                        // 13 = base ✓
    fontWeight: FontWeight.bold,
    color: Colors.textDark,
  },
  metaItemSub: {
    fontSize: FontSize.xs,                          // 11 = xs ✓
    color: Colors.textSecondary,
    marginTop: 1,
  },
  // Owner profile card
  ownerCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,                  // 16 = lg ✓
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
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
    color: Colors.textPrimary,
  },
  ownerRatingText: {
    fontSize: FontSize.sm,                          // 12 = sm ✓
    color: Colors.textSecondary,
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
    backgroundColor: Colors.screenBg,
    borderWidth: 1,
    borderColor: Colors.border,
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
    backgroundColor: Colors.textPrimary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  navigationBtnText: {
    fontSize: FontSize.md,                          // 14 = md ✓
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  leaveSessionBtn: {
    flex: 1,
    height: 48,
    borderRadius: BorderRadius.md,                  // 12 = md ✓
    backgroundColor: Colors.errorAlt,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  leaveSessionBtnText: {
    fontSize: FontSize.md,                          // 14 = md ✓
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  // History logs styles
  historyCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,                  // 16 = lg ✓
    padding: Spacing['3xl'],
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.xl,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  historySpaceName: {
    fontSize: FontSize.lg,                          // 15 = lg ✓
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  historyAddress: {
    fontSize: FontSize.sm,                          // 12 = sm ✓
    color: Colors.textSecondary,
  },
  historyStatusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.badge,               // 6 = badge ✓
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
    backgroundColor: Colors.surfaceBg,
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
    color: Colors.textMuted,
    marginBottom: 2,
  },
  historyDetailValue: {
    fontSize: FontSize.sm,                          // 12 = sm ✓
    fontWeight: FontWeight.bold,
    color: Colors.textBody,
  },
  historyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xl,
    paddingTop: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBg,
  },
  historyFooterLabel: {
    fontSize: FontSize.xs,                          // 11 = xs ✓
    color: Colors.textSecondary,
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
    color: Colors.border,
  },
  editModalContainer: {
    flex: 1,
    backgroundColor: Colors.screenBg,
  },
  editModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing['3xl'],
    paddingVertical: Spacing.xl,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  editModalTitle: {
    fontSize: FontSize['2xl'],                      // 18 = 2xl ✓
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  editModalContent: {
    flex: 1,
    paddingHorizontal: Spacing['3xl'],
    paddingVertical: Spacing['3xl'],
  },
  editFieldLabel: {
    fontSize: FontSize.md,                          // 14 = md ✓
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    marginTop: Spacing.xl,
  },
  editTextInput: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,                  // 8 = sm ✓
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    fontSize: FontSize.md,                          // 14 = md ✓
    color: Colors.textPrimary,
    backgroundColor: Colors.white,
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
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    alignItems: 'center',
  },
  editTypeBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryBg,
  },
  editTypeText: {
    fontSize: FontSize.base,                        // 13 = base ✓
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  editTypeTextActive: {
    color: Colors.primary,
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
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  editCapacityBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryBg,
  },
  editCapacityText: {
    fontSize: FontSize.sm,                          // 12 = sm ✓
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  editCapacityTextActive: {
    color: Colors.primary,
  },
  editModalFooter: {
    flexDirection: 'row',
    gap: Spacing.xl,
    paddingHorizontal: Spacing['3xl'],
    paddingVertical: Spacing.xl,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  editCancelBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.sm,                  // 8 = sm ✓
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  editCancelBtnText: {
    color: Colors.primary,
    fontSize: FontSize.md,                          // 14 = md ✓
    fontWeight: FontWeight.bold,
  },
  editUpdateBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,                  // 8 = sm ✓
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  editUpdateBtnText: {
    color: Colors.white,
    fontSize: FontSize.md,                          // 14 = md ✓
    fontWeight: FontWeight.bold,
  },
});
