import React, { useEffect, useState, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
} from 'react-native';
import { X, Car, Bike, ArrowDownUp, Check, ChevronDown, ChevronUp, Home, Building2, TreePine } from 'lucide-react-native';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing } from '../../theme';

export type VehicleFilter = 'all' | 'Car' | 'Bike';
export type SortFilter = 'distance' | 'price';

export interface FilterValue {
  vehicle: VehicleFilter;
  /** Concrete backend spaceType values selected (possibly several via a group). */
  spaceTypes: string[];
  sort: SortFilter;
}

// Friendly top-level categories → the underlying backend spaceType values.
// Picking a category selects all its types; the user can still expand to fine-tune.
export const SPACE_CATEGORIES: { key: string; label: string; Icon: any; types: string[] }[] = [
  {
    key: 'residential',
    label: 'Residential',
    Icon: Home,
    types: [
      'Independent House', 'Rented House', 'Apartment Owner Slot',
      'Apartment Tenant Slot', 'Gated Villa', 'Inside Compound',
    ],
  },
  {
    key: 'commercial',
    label: 'Commercial',
    Icon: Building2,
    types: ['Shop Front Parking', 'Office Parking', 'Open Frontage Area'],
  },
  {
    key: 'roadside',
    label: 'Roadside',
    Icon: TreePine,
    types: ['Vacant Private Land'],
  },
];

interface FilterSheetProps {
  visible: boolean;
  onClose: () => void;
  initial: FilterValue;
  onApply: (next: FilterValue) => void;
}

// True if every type in `group` is currently selected.
const groupFullySelected = (selected: string[], types: string[]) =>
  types.length > 0 && types.every((t) => selected.includes(t));

// How many types of a group are selected — drives the "2/6" count pill.
const groupSelectedCount = (selected: string[], types: string[]) =>
  types.filter((t) => selected.includes(t)).length;

/**
 * Bottom-sheet filter for the parking map. Holds DRAFT state so the user can
 * change options freely and only commit on "Apply". "Reset" clears everything
 * back to defaults. All values map 1:1 to params the backend search already
 * accepts (parkingFor / spaceType / sort).
 */
const FilterSheet: React.FC<FilterSheetProps> = ({ visible, onClose, initial, onApply }) => {
  const [vehicle, setVehicle] = useState<VehicleFilter>(initial.vehicle);
  const [spaceTypes, setSpaceTypes] = useState<string[]>(initial.spaceTypes);
  const [sort, setSort] = useState<SortFilter>(initial.sort);
  // Which category is expanded to reveal its individual types (accordion — one at a time).
  const [expandedCat, setExpandedCat] = useState<string | null>(null);

  // Industry-standard bottom sheet: the BACKDROP fades in (Modal animationType
  // "fade"), while only the white SHEET slides up. (Plain animationType="slide"
  // slides the dark backdrop too, which reads as a "shadow sweeping up".)
  const SCREEN_H = Dimensions.get('window').height;
  const translateY = useRef(new Animated.Value(SCREEN_H)).current;
  useEffect(() => {
    Animated.spring(translateY, {
      toValue: visible ? 0 : SCREEN_H,
      useNativeDriver: true,
      damping: 22,
      stiffness: 220,
      mass: 0.6,
    }).start();
  }, [visible, translateY, SCREEN_H]);

  // Re-seed the draft from the committed values each time the sheet opens.
  useEffect(() => {
    if (visible) {
      setVehicle(initial.vehicle);
      setSpaceTypes(initial.spaceTypes);
      setSort(initial.sort);
      setExpandedCat(null);
    }
  }, [visible, initial.vehicle, initial.spaceTypes, initial.sort]);

  const reset = () => {
    setVehicle('all');
    setSpaceTypes([]);
    setSort('distance');
  };

  // Toggle a whole category: select all its types, or clear them if already full.
  const toggleCategory = (types: string[]) => {
    setSpaceTypes((prev) => {
      if (groupFullySelected(prev, types)) {
        return prev.filter((t) => !types.includes(t));
      }
      return Array.from(new Set([...prev, ...types]));
    });
  };

  // Toggle a single concrete type (fine-grained).
  const toggleType = (t: string) => {
    setSpaceTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Filters</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={20} color={Colors.textPrimary} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Vehicle type */}
          <Text style={styles.sectionLabel}>Vehicle Type</Text>
          <View style={styles.segmentRow}>
            {([
              { key: 'all', label: 'All', icon: null },
              { key: 'Car', label: 'Car', icon: <Car size={16} strokeWidth={2.4} /> },
              { key: 'Bike', label: 'Bike', icon: <Bike size={16} strokeWidth={2.4} /> },
            ] as const).map((opt) => {
              const active = vehicle === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.segment, active && styles.segmentActive]}
                  onPress={() => setVehicle(opt.key)}
                  activeOpacity={0.85}
                >
                  {opt.icon
                    ? React.cloneElement(opt.icon, { color: active ? Colors.white : Colors.textPrimary })
                    : null}
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Sort */}
          <Text style={styles.sectionLabel}>Sort By</Text>
          <View style={styles.segmentRow}>
            {([
              { key: 'distance', label: 'Distance' },
              { key: 'price', label: 'Price (low → high)' },
            ] as const).map((opt) => {
              const active = sort === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.segment, active && styles.segmentActive]}
                  onPress={() => setSort(opt.key)}
                  activeOpacity={0.85}
                >
                  <ArrowDownUp size={15} color={active ? Colors.white : Colors.textPrimary} strokeWidth={2.4} />
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Space type — clean category rows, each expandable into its own types */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>Space Type</Text>
            {spaceTypes.length > 0 && (
              <TouchableOpacity onPress={() => { setSpaceTypes([]); setExpandedCat(null); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.clearLink}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.catGroup}>
            {SPACE_CATEGORIES.map((cat, idx) => {
              const { Icon } = cat;
              const full = groupFullySelected(spaceTypes, cat.types);
              const count = groupSelectedCount(spaceTypes, cat.types);
              const partial = count > 0 && !full;
              const expanded = expandedCat === cat.key;
              const hasDetail = cat.types.length > 1;
              return (
                <View key={cat.key} style={[styles.catBlock, idx > 0 && styles.catBlockBorder]}>
                  {/* Category row */}
                  <View style={styles.catRow}>
                    {/* Tap the icon+label to select/deselect the whole category */}
                    <TouchableOpacity
                      style={styles.catMain}
                      onPress={() => toggleCategory(cat.types)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.catIconWrap, (full || partial) && styles.catIconWrapActive]}>
                        <Icon size={18} color={(full || partial) ? Colors.white : Colors.primary} strokeWidth={2.2} />
                      </View>
                      <View style={styles.catTextWrap}>
                        <Text style={styles.catLabel}>{cat.label}</Text>
                        <Text style={styles.catSub}>
                          {full ? 'All selected' : partial ? `${count} of ${cat.types.length} selected` : `${cat.types.length} type${cat.types.length > 1 ? 's' : ''}`}
                        </Text>
                      </View>
                      <View style={[styles.catCheck, full && styles.catCheckFull, partial && styles.catCheckPartial]}>
                        {full && <Check size={14} color={Colors.white} strokeWidth={3} />}
                        {partial && <View style={styles.catCheckDash} />}
                      </View>
                    </TouchableOpacity>
                    {/* Chevron to expand the fine-grained types (only if more than one).
                        When a category has no chevron, reserve the same width so the
                        radio buttons stay aligned in a single vertical column. */}
                    {hasDetail ? (
                      <TouchableOpacity
                        style={styles.catExpandBtn}
                        onPress={() => setExpandedCat(expanded ? null : cat.key)}
                        hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
                        activeOpacity={0.7}
                      >
                        {expanded
                          ? <ChevronUp size={18} color={Colors.textMuted} strokeWidth={2.5} />
                          : <ChevronDown size={18} color={Colors.textMuted} strokeWidth={2.5} />}
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.catExpandSpacer} />
                    )}
                  </View>

                  {/* Expanded individual types */}
                  {expanded && hasDetail && (
                    <View style={styles.detailWrap}>
                      {cat.types.map((t) => {
                        const active = spaceTypes.includes(t);
                        return (
                          <TouchableOpacity
                            key={t}
                            style={[styles.detailChip, active && styles.detailChipActive]}
                            onPress={() => toggleType(t)}
                            activeOpacity={0.8}
                          >
                            {active && <Check size={12} color={Colors.white} strokeWidth={3} />}
                            <Text style={[styles.detailChipText, active && styles.detailChipTextActive]}>{t}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>

        {/* Footer actions — balanced widths, equal height */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.resetBtn} onPress={reset} activeOpacity={0.8}>
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.applyBtn}
            onPress={() => onApply({ vehicle, spaceTypes, sort })}
            activeOpacity={0.85}
          >
            <Text style={styles.applyText}>Show results</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  // Backdrop fills the whole screen and fades in; sheet is pinned to the bottom
  // and slides up over it (industry-standard bottom sheet).
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing['3xl'],
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  title: { fontSize: FontSize['2xl'], fontWeight: FontWeight.bold, color: Colors.textPrimary },
  sectionLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  segmentRow: { flexDirection: 'row', gap: Spacing.md, flexWrap: 'wrap' },
  segment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 10,
    borderRadius: BorderRadius.circleXl,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.white,
  },
  segmentActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  segmentText: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  segmentTextActive: { color: Colors.white },
  // ── Section header with inline "Clear" link ──
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  clearLink: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.primary },

  // ── Space-type category group (card with hairline rows) ──
  catGroup: {
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.white,
  },
  catBlock: {},
  catBlockBorder: { borderTopWidth: 1, borderTopColor: Colors.borderLight },
  catRow: { flexDirection: 'row', alignItems: 'center' },
  catMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: 12,
    paddingLeft: Spacing.lg,
    paddingRight: Spacing.sm,
  },
  catIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catIconWrapActive: { backgroundColor: Colors.primary },
  catTextWrap: { flex: 1 },
  catLabel: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  catSub: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 1, fontWeight: FontWeight.medium },
  catCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.borderMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catCheckFull: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  catCheckPartial: { borderColor: Colors.primary },
  catCheckDash: { width: 10, height: 2.5, borderRadius: 2, backgroundColor: Colors.primary },
  catExpandBtn: {
    paddingVertical: 12,
    paddingHorizontal: Spacing.lg,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  // Same footprint as catExpandBtn (Spacing.lg + 18px chevron + Spacing.lg = 38)
  // so rows without a chevron keep their radio aligned with the others.
  catExpandSpacer: { width: 38 },

  // ── Expanded detail chips, indented under their category ──
  detailWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingBottom: 14,
    paddingTop: 2,
    backgroundColor: Colors.surfaceBg,
  },
  detailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: BorderRadius.circleXl,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.white,
  },
  detailChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  detailChipText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textBody },
  detailChipTextActive: { color: Colors.white },

  // ── Footer: balanced, equal-height buttons ──
  footer: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xl,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  resetBtn: {
    flex: 1,
    height: 52,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  resetText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textSecondary },
  applyBtn: {
    flex: 1,
    height: 52,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.white },
});

export default FilterSheet;
