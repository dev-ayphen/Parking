import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
  FlatList,
  RefreshControl,
  Modal,
  TextInput} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Car, Plus, X, Bike } from 'lucide-react-native';
import { api } from '../../services/api';
import PageHeader from '../../components/PageHeader';
import { FontSize, FontWeight, BorderRadius, Spacing, ExtendedColors } from '../../theme';
import { useTheme } from '../../hooks/useTheme';
import type { ColorsType } from '../../theme';

interface Vehicle {
  id: number;
  brandModel: string;
  licensePlate: string;
  vehicleType: string;
  capacity: number;
}

const makeStyles = (colors: ColorsType) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    flex: 1,
    backgroundColor: colors.white,
  },
  instructionCard: {
    marginHorizontal: Spacing['3xl'],
    marginTop: Spacing['3xl'],
    marginBottom: Spacing.screenH,
    backgroundColor: ExtendedColors.activeBlueBg,
    borderRadius: BorderRadius.lg,        // 16 = lg ✓
    paddingHorizontal: Spacing['3xl'],
    paddingVertical: Spacing['3xl'],
    flexDirection: 'row',
    gap: Spacing.xl,
    alignItems: 'center',
  },
  instructionText: {
    fontSize: FontSize.md,                // 14 = md ✓
    fontWeight: FontWeight.semibold,
    color: ExtendedColors.activeBlueText,
    flex: 1,
  },
  vehiclesSection: {
    paddingHorizontal: Spacing['3xl'],
    gap: Spacing.xl,
  },
  vehicleCard: {
    backgroundColor: colors.white,
    borderRadius: BorderRadius.lg,        // 16 = lg ✓
    padding: Spacing['3xl'],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.surfaceBg,        // '#F1F5F9' = surfaceBg ✓ (original was '#F1F5F9')
  },
  vehicleCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  vehicleCardLeft: {
    flex: 1,
    flexDirection: 'row',
    gap: Spacing.xl,
    alignItems: 'center',
  },
  vehicleIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,        // 12 = md ✓
    backgroundColor: colors.screenBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleIconSelected: {
    backgroundColor: colors.screenBg,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleReg: {
    fontSize: FontSize.lg,                // 15 = lg ✓
    fontWeight: FontWeight.bold,
    color: colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  vehicleMetaRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  vehicleType: {
    fontSize: FontSize.sm,                // 12 = sm ✓
    fontWeight: FontWeight.semibold,
    color: colors.textSecondary,
  },
  vehicleColor: {
    fontSize: FontSize.sm,                // 12 = sm ✓
    fontWeight: FontWeight.semibold,
    color: colors.textMuted,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,           // '#E2E8F0' = border ✓
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  radioButtonInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.white,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['7xl'],
  },
  emptyStateText: {
    fontSize: FontSize.md,                // 14 = md ✓
    fontWeight: FontWeight.semibold,
    color: colors.textMuted,
    marginTop: Spacing.xl,
  },
  addVehicleButton: {
    marginHorizontal: Spacing['3xl'],
    marginTop: Spacing['4xl'],
    paddingHorizontal: Spacing['3xl'],
    paddingVertical: Spacing['2xl'],
    borderRadius: BorderRadius.button,    // 14 = button ✓
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.textMuted,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  addVehicleText: {
    fontSize: FontSize.lg,                // 15 = lg ✓
    fontWeight: FontWeight.semibold,
    color: colors.textSecondary,
  },
  // Add-vehicle modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.white, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing['3xl'], paddingBottom: 36 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderMuted, alignSelf: 'center', marginBottom: Spacing['2xl'] },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing['2xl'] },
  modalTitle: { fontSize: FontSize['2xl'], fontWeight: FontWeight.bold, color: colors.textPrimary },
  fieldLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.md, marginTop: Spacing.md },
  typeRow: { flexDirection: 'row', gap: Spacing.md },
  typeChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: Spacing.xl, borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.white },
  typeChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryBg },
  typeChipText: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: colors.textSecondary },
  typeChipTextActive: { color: colors.primary },
  input: { backgroundColor: colors.screenBg, borderWidth: 1, borderColor: colors.border, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.xl, fontSize: FontSize.base, color: colors.textPrimary },
  saveBtn: { backgroundColor: colors.primary, borderRadius: BorderRadius.button, paddingVertical: Spacing['3xl'], alignItems: 'center', marginTop: Spacing['3xl'] },
  saveBtnText: { color: colors.white, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  stickyFooter: {
    backgroundColor: colors.white,
    paddingHorizontal: Spacing['3xl'],
    paddingVertical: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,        // '#E2E8F0' = border ✓
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  continueButton: {
    backgroundColor: colors.primary,
    borderRadius: BorderRadius.button,    // 14 = button ✓
    paddingVertical: Spacing['3xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    color: colors.white,
    fontSize: FontSize.xl,                // 16 = xl ✓
    fontWeight: FontWeight.bold,
  },
});

const VehicleSelectScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  // Inline add-vehicle (so a first-time parker can add one without leaving booking)
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPlate, setNewPlate] = useState('');
  const [newType, setNewType] = useState<'Car' | 'Bike'>('Car');
  const [savingVehicle, setSavingVehicle] = useState(false);

  // Parse params
  const spaceId = params.spaceId as string;
  const spaceName = params.spaceName as string;
  const address = params.address as string;
  const safeInt = (v: unknown) => { const n = parseInt(v as string, 10); return isNaN(n) ? 0 : n; };
  const durationHours = safeInt(params.durationHours);
  const pricePerHour = safeInt(params.pricePerHour);
  const basePrice = safeInt(params.basePrice);
  const totalPrice = safeInt(params.totalPrice);

  useEffect(() => {
    loadVehicles();
  }, []);

  // Reload when screen regains focus (e.g. returning from add vehicle)
  useFocusEffect(
    useCallback(() => {
      loadVehicles(false);
    }, [])
  );

  const loadVehicles = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);

      // Fetch actual vehicles from API
      const data = await api.get('/vehicles');
      const vehicleList = Array.isArray(data) ? data : (data.data || data.vehicles || []);

      setVehicles(vehicleList);
      // Pre-select the user's default vehicle (the list is already ordered
      // default-first, but pick explicitly so intent is clear); fall back to the
      // first vehicle if none is flagged.
      if (vehicleList.length > 0) {
        const preferred = vehicleList.find((v: any) => v.isDefault) || vehicleList[0];
        setSelectedVehicleId(preferred.id);
      }
    } catch (error) {
      if (__DEV__) console.error('[VEHICLE_SELECT] Error loading vehicles:', error);
      Alert.alert('Error', 'Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  };

  const resetAddForm = () => {
    setNewName('');
    setNewPlate('');
    setNewType('Car');
  };

  // Indian plate: 2 letters + 1-2 digits + 1-3 letters + 4 digits (e.g. KA01AB1234)
  const isValidPlate = (p: string) => /^[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{4}$/.test(p);

  const handleAddVehicle = async () => {
    const plate = newPlate.toUpperCase().replace(/\s+/g, '');
    if (!newName.trim()) {
      Alert.alert('Required', 'Enter the vehicle make & model (e.g. Honda City).');
      return;
    }
    if (!isValidPlate(plate)) {
      Alert.alert('Invalid Plate', 'Enter a valid registration number (e.g. KA01AB1234).');
      return;
    }
    try {
      setSavingVehicle(true);
      const created = await api.post('/vehicles', {
        brandModel: newName.trim(),
        licensePlate: plate,
        vehicleType: newType === 'Car' ? 'CAR' : 'BIKE',
        capacity: newType === 'Car' ? 5 : 2,
        ownershipType: 'OWNER',
      });
      setAddModalVisible(false);
      resetAddForm();
      // Reload and auto-select the new vehicle so the parker can proceed.
      const newId = created?.vehicle?.id ?? created?.id;
      await loadVehicles(false);
      if (newId) setSelectedVehicleId(newId);
    } catch (e: any) {
      Alert.alert('Could not add vehicle', e?.message || 'Please try again.');
    } finally {
      setSavingVehicle(false);
    }
  };



  const handleContinue = () => {
    if (!selectedVehicleId) {
      Alert.alert('Select Vehicle', 'Please select a vehicle');
      return;
    }

    const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);
    if (!selectedVehicle) return;

    router.push({
      pathname: '/(find-space)/booking-confirm',
      params: {
        spaceId,
        spaceName,
        address,
        vehicleId: selectedVehicleId,
        vehicleRegistration: selectedVehicle.licensePlate,
        vehicleType: selectedVehicle.vehicleType,
        durationHours,
        pricePerHour,
        basePrice,
        totalPrice,
      },
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <PageHeader title="Select Vehicle" onBack={() => router.replace('/(find-space)')} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <PageHeader title="Select Vehicle" onBack={() => router.replace('/(find-space)')} />

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => { setRefreshing(true); await loadVehicles(false); setRefreshing(false); }}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Instruction Card */}
        <View style={styles.instructionCard}>
          <Car size={24} color={ExtendedColors.activeBlueText} strokeWidth={2} />
          <Text style={styles.instructionText}>
            Choose the vehicle for this booking
          </Text>
        </View>

        {/* Vehicles List */}
        <View style={styles.vehiclesSection}>
          {vehicles.length > 0 ? (
            vehicles.map((vehicle) => (
              <TouchableOpacity
                key={vehicle.id}
                style={[
                  styles.vehicleCard,
                  selectedVehicleId === vehicle.id && styles.vehicleCardSelected,
                ]}
                onPress={() => setSelectedVehicleId(vehicle.id)}
                activeOpacity={0.7}
              >
                <View style={styles.vehicleCardLeft}>
                  <View
                    style={[
                      styles.vehicleIcon,
                      selectedVehicleId === vehicle.id && styles.vehicleIconSelected,
                    ]}
                  >
                    <Car
                      size={24}
                      color={selectedVehicleId === vehicle.id ? colors.primary : colors.textPrimary}
                      strokeWidth={2.5}
                    />
                  </View>
                  <View style={styles.vehicleInfo}>
                    <Text style={styles.vehicleReg}>{vehicle.licensePlate || 'Unknown Plate'}</Text>
                    <View style={styles.vehicleMetaRow}>
                      <Text style={styles.vehicleType}>{vehicle.vehicleType || 'CAR'}</Text>
                      {vehicle.brandModel ? (
                        <Text style={styles.vehicleColor}>• {vehicle.brandModel}</Text>
                      ) : null}
                      {vehicle.capacity ? (
                        <Text style={styles.vehicleColor}>• {vehicle.capacity} Seater</Text>
                      ) : null}
                    </View>
                  </View>
                </View>

                {/* Radio Button */}
                <View
                  style={[
                    styles.radioButton,
                    selectedVehicleId === vehicle.id && styles.radioButtonSelected,
                  ]}
                >
                  {selectedVehicleId === vehicle.id && (
                    <View style={styles.radioButtonInner} />
                  )}
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Car size={40} color={colors.textMuted} strokeWidth={1.5} />
              <Text style={styles.emptyStateText}>No vehicles added yet</Text>
            </View>
          )}
        </View>

        {/* Add Vehicle Button */}
        <TouchableOpacity
          style={styles.addVehicleButton}
          onPress={() => { resetAddForm(); setAddModalVisible(true); }}
          activeOpacity={0.7}
        >
          <Plus size={20} color={colors.textSecondary} strokeWidth={2.5} />
          <Text style={styles.addVehicleText}>Add New Vehicle</Text>
        </TouchableOpacity>

        {/* Spacer */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Sticky Footer */}
      <View style={styles.stickyFooter}>
        <TouchableOpacity
          style={[styles.continueButton, !selectedVehicleId && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={!selectedVehicleId}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>

      {/* Inline Add Vehicle — quick form so first-time parkers don't leave booking */}
      <Modal visible={addModalVisible} transparent animationType="slide" onRequestClose={() => setAddModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Vehicle</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                <X size={20} color={colors.textSecondary} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Vehicle Type</Text>
            <View style={styles.typeRow}>
              {(['Car', 'Bike'] as const).map((t) => {
                const Icon = t === 'Car' ? Car : Bike;
                const active = newType === t;
                return (
                  <TouchableOpacity key={t} style={[styles.typeChip, active && styles.typeChipActive]} onPress={() => setNewType(t)} activeOpacity={0.7}>
                    <Icon size={18} color={active ? colors.primary : colors.textSecondary} strokeWidth={2} />
                    <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>{t}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>Make & Model</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Honda City"
              placeholderTextColor={colors.textMuted}
              value={newName}
              onChangeText={setNewName}
            />

            <Text style={styles.fieldLabel}>Registration Number</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. KA01AB1234"
              placeholderTextColor={colors.textMuted}
              value={newPlate}
              onChangeText={(t) => setNewPlate(t.toUpperCase())}
              autoCapitalize="characters"
              maxLength={12}
            />

            <TouchableOpacity
              style={[styles.saveBtn, savingVehicle && { opacity: 0.6 }]}
              onPress={handleAddVehicle}
              disabled={savingVehicle}
              activeOpacity={0.85}
            >
              {savingVehicle ? <ActivityIndicator color={colors.white} /> : <Text style={styles.saveBtnText}>Add Vehicle</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default VehicleSelectScreen;
