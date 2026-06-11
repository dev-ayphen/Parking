import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Car, Trash2, ChevronRight, Camera, UploadCloud, CheckCircle2 } from 'lucide-react-native';
import FormLabel from '../FormLabel';
import { Colors } from '../../theme';
import { styles } from './findSpaceStyles';

interface MyVehiclesTabProps {
  vehiclesLoading: boolean;
  isRefreshingVehicles: boolean;
  handleRefreshVehicles: () => void;
  showAddVehicle: boolean;
  setShowAddVehicle: (val: boolean) => void;
  showEditModal: boolean;
  setShowEditModal: (val: boolean) => void;
  editingVehicle: any;
  setEditingVehicle: (val: any) => void;
  editIsSubmitting: boolean;
  newVehicleName: string;
  setNewVehicleName: (val: string) => void;
  newVehiclePlate: string;
  setNewVehiclePlate: (val: string) => void;
  newVehicleType: string;
  setNewVehicleType: (val: string) => void;
  newVehicleCapacity: string;
  setNewVehicleCapacity: (val: string) => void;
  newVehicleFrontPhoto: boolean;
  setNewVehicleFrontPhoto: (val: boolean) => void;
  newVehicleSidePhoto: boolean;
  setNewVehicleSidePhoto: (val: boolean) => void;
  newVehicleRCBook: boolean;
  setNewVehicleRCBook: (val: boolean) => void;
  newVehicleRole: string;
  setNewVehicleRole: (val: string) => void;
  handleSaveVehicle: () => void;
  editVehicleName: string;
  setEditVehicleName: (val: string) => void;
  editVehiclePlate: string;
  setEditVehiclePlate: (val: string) => void;
  editVehicleType: string;
  setEditVehicleType: (val: string) => void;
  editVehicleCapacity: string;
  setEditVehicleCapacity: (val: string) => void;
  editVehicleRole: string;
  setEditVehicleRole: (val: string) => void;
  handleUpdateVehicle: () => void;
  vehicles: any[];
  handleSetActiveVehicle: (id: string) => void;
  handleDeleteVehicle: (id: string) => void;
  handleEditPress: (vehicle: any) => void;
}

const MyVehiclesTab: React.FC<MyVehiclesTabProps> = ({
  vehiclesLoading,
  isRefreshingVehicles,
  handleRefreshVehicles,
  showAddVehicle,
  setShowAddVehicle,
  showEditModal,
  setShowEditModal,
  editingVehicle,
  setEditingVehicle,
  editIsSubmitting,
  newVehicleName,
  setNewVehicleName,
  newVehiclePlate,
  setNewVehiclePlate,
  newVehicleType,
  setNewVehicleType,
  newVehicleCapacity,
  setNewVehicleCapacity,
  newVehicleFrontPhoto,
  setNewVehicleFrontPhoto,
  newVehicleSidePhoto,
  setNewVehicleSidePhoto,
  newVehicleRCBook,
  setNewVehicleRCBook,
  newVehicleRole,
  setNewVehicleRole,
  handleSaveVehicle,
  editVehicleName,
  setEditVehicleName,
  editVehiclePlate,
  setEditVehiclePlate,
  editVehicleType,
  setEditVehicleType,
  editVehicleCapacity,
  setEditVehicleCapacity,
  editVehicleRole,
  setEditVehicleRole,
  handleUpdateVehicle,
  vehicles,
  handleSetActiveVehicle,
  handleDeleteVehicle,
  handleEditPress,
}) => {
  if (vehiclesLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.tabContent}
      contentContainerStyle={styles.tabContentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshingVehicles}
          onRefresh={handleRefreshVehicles}
          tintColor={Colors.primary}
          colors={[Colors.primary]}
        />
      }
    >
      {showAddVehicle && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Add Vehicle</Text>

          <FormLabel required>Vehicle Brand &amp; Model</FormLabel>
          <TextInput
            style={styles.formInput}
            placeholder="e.g. Maruti Swift"
            placeholderTextColor={Colors.textMuted}
            value={newVehicleName}
            onChangeText={setNewVehicleName}
          />

          <FormLabel required>Registration Number</FormLabel>
          <TextInput
            style={styles.formInput}
            placeholder="e.g. MH-01-1234"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="characters"
            value={newVehiclePlate}
            onChangeText={setNewVehiclePlate}
          />

          <FormLabel required>Vehicle Type</FormLabel>
          <View style={styles.typeSelectorRow}>
            {['Car', 'Bike'].map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.typeChip,
                  newVehicleType === type && styles.typeChipActive
                ]}
                onPress={() => setNewVehicleType(type)}
              >
                <Text style={[
                  styles.typeChipText,
                  newVehicleType === type && styles.typeChipTextActive
                ]}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {newVehicleType === 'Car' && (
            <>
              <FormLabel required>Capacity</FormLabel>
              <View style={styles.chipRowWrap}>
                {['2 Seater', '4 Seater', '5 Seater', '7 Seater'].map((capacity) => (
                  <TouchableOpacity
                    key={capacity}
                    style={[
                      styles.typeChip,
                      newVehicleCapacity === capacity && styles.typeChipActive,
                      { flex: 0, paddingHorizontal: 16 }
                    ]}
                    onPress={() => setNewVehicleCapacity(capacity)}
                  >
                    <Text style={[
                      styles.typeChipText,
                      newVehicleCapacity === capacity && styles.typeChipTextActive
                    ]}>
                      {capacity}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <FormLabel required={false}>Vehicle Photos</FormLabel>
          <View style={styles.photoUploadRow}>
            <TouchableOpacity
              style={[styles.uploadBox, newVehicleFrontPhoto && styles.uploadBoxSuccess]}
              onPress={() => setNewVehicleFrontPhoto(!newVehicleFrontPhoto)}
            >
              {newVehicleFrontPhoto ? (
                <CheckCircle2 size={24} color={Colors.successAlt} />
              ) : (
                <Camera size={24} color={Colors.textMuted} />
              )}
              <Text style={styles.uploadBoxText}>Front View</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.uploadBox, newVehicleSidePhoto && styles.uploadBoxSuccess]}
              onPress={() => setNewVehicleSidePhoto(!newVehicleSidePhoto)}
            >
              {newVehicleSidePhoto ? (
                <CheckCircle2 size={24} color={Colors.successAlt} />
              ) : (
                <Camera size={24} color={Colors.textMuted} />
              )}
              <Text style={styles.uploadBoxText}>Side View</Text>
            </TouchableOpacity>
          </View>

          <FormLabel required={false}>RC Book (Registration)</FormLabel>
          <TouchableOpacity
            style={[styles.fullWidthUploadBox, newVehicleRCBook && styles.uploadBoxSuccess]}
            onPress={() => setNewVehicleRCBook(!newVehicleRCBook)}
          >
            {newVehicleRCBook ? (
              <CheckCircle2 size={24} color={Colors.successAlt} />
            ) : (
              <UploadCloud size={24} color={Colors.textMuted} />
            )}
            <Text style={styles.uploadBoxText}>Upload RC Book</Text>
          </TouchableOpacity>

          <FormLabel required>I am the...</FormLabel>
          <View style={styles.typeSelectorRow}>
            {['Owner', 'Driver'].map((role) => (
              <TouchableOpacity
                key={role}
                style={[
                  styles.typeChip,
                  newVehicleRole === role && styles.typeChipActive
                ]}
                onPress={() => setNewVehicleRole(role)}
              >
                <Text style={[
                  styles.typeChipText,
                  newVehicleRole === role && styles.typeChipTextActive
                ]}>
                  {role}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.formActionsRow}>
            <TouchableOpacity
              style={styles.cancelFormBtn}
              onPress={() => {
                setShowAddVehicle(false);
                setNewVehicleName('');
                setNewVehiclePlate('');
                setNewVehicleType('Car');
                setNewVehicleCapacity('5 Seater');
                setNewVehicleFrontPhoto(false);
                setNewVehicleSidePhoto(false);
                setNewVehicleRCBook(false);
                setNewVehicleRole('Owner');
              }}
            >
              <Text style={styles.cancelFormBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveFormBtn}
              onPress={handleSaveVehicle}
            >
              <Text style={styles.saveFormBtnText}>Save Vehicle</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {showEditModal && editingVehicle && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Edit Vehicle</Text>

          <FormLabel required>Vehicle Brand &amp; Model</FormLabel>
          <TextInput
            style={styles.formInput}
            placeholder="e.g. Maruti Swift"
            placeholderTextColor={Colors.textMuted}
            value={editVehicleName}
            onChangeText={setEditVehicleName}
          />

          <FormLabel required>Registration Number</FormLabel>
          <TextInput
            style={styles.formInput}
            placeholder="e.g. MH-01-1234"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="characters"
            value={editVehiclePlate}
            onChangeText={(text) => setEditVehiclePlate(text.toUpperCase())}
          />

          <FormLabel required>Vehicle Type</FormLabel>
          <View style={styles.typeSelectorRow}>
            {['Car', 'Bike'].map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.typeChip,
                  editVehicleType === type && styles.typeChipActive
                ]}
                onPress={() => setEditVehicleType(type)}
              >
                <Text style={[
                  styles.typeChipText,
                  editVehicleType === type && styles.typeChipTextActive
                ]}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {editVehicleType === 'Car' && (
            <>
              <FormLabel required>Capacity</FormLabel>
              <View style={styles.chipRowWrap}>
                {['2 Seater', '4 Seater', '5 Seater', '7 Seater'].map((capacity) => (
                  <TouchableOpacity
                    key={capacity}
                    style={[
                      styles.typeChip,
                      editVehicleCapacity === capacity && styles.typeChipActive,
                      { flex: 0, paddingHorizontal: 16 }
                    ]}
                    onPress={() => setEditVehicleCapacity(capacity)}
                  >
                    <Text style={[
                      styles.typeChipText,
                      editVehicleCapacity === capacity && styles.typeChipTextActive
                    ]}>
                      {capacity}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <FormLabel required>I am the...</FormLabel>
          <View style={styles.typeSelectorRow}>
            {['Owner', 'Driver'].map((role) => (
              <TouchableOpacity
                key={role}
                style={[
                  styles.typeChip,
                  editVehicleRole === role && styles.typeChipActive
                ]}
                onPress={() => setEditVehicleRole(role)}
              >
                <Text style={[
                  styles.typeChipText,
                  editVehicleRole === role && styles.typeChipTextActive
                ]}>
                  {role}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.formActionsRow}>
            <TouchableOpacity
              style={styles.cancelFormBtn}
              onPress={() => {
                setShowEditModal(false);
                setEditingVehicle(null);
              }}
              disabled={editIsSubmitting}
            >
              <Text style={styles.cancelFormBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveFormBtn}
              onPress={handleUpdateVehicle}
              disabled={editIsSubmitting}
            >
              {editIsSubmitting ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <Text style={styles.saveFormBtnText}>Update</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {!showAddVehicle && !showEditModal && (
        <>
          <Text style={styles.sectionHeading}>Your Registered Vehicles</Text>
          {vehicles.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <Car size={48} color={Colors.borderMedium} strokeWidth={1.5} />
              <Text style={styles.emptyStateText}>No vehicles registered yet.</Text>
              <TouchableOpacity
                style={styles.emptyStateBtn}
                onPress={() => setShowAddVehicle(true)}
              >
                <Text style={styles.emptyStateBtnText}>+ Add Vehicle</Text>
              </TouchableOpacity>
            </View>
          ) : (
            vehicles.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.vehicleCard,
                  item.active && styles.vehicleCardActive
                ]}
                onPress={() => handleSetActiveVehicle(item.id)}
                activeOpacity={0.9}
              >
                <View style={styles.vehicleInfoRow}>
                  <View style={[styles.vehicleIconBg, item.active && styles.vehicleIconBgActive]}>
                    <Car size={22} color={item.active ? Colors.white : Colors.textSecondary} strokeWidth={2} />
                  </View>
                  <View style={styles.vehicleDetailsCol}>
                    <View style={styles.vehicleNameRow}>
                      <Text style={styles.vehicleNameText}>{item.name}</Text>
                      {item.active && (
                        <View style={styles.activeBadge}>
                          <Text style={styles.activeBadgeText}>ACTIVE</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.vehiclePlateText}>{item.plate}</Text>
                    <Text style={styles.vehicleTypeText}>
                      {item.type}{item.capacity ? ` • ${item.capacity}` : ''}{item.role ? ` • ${item.role}` : ''}
                    </Text>
                  </View>
                  <View style={styles.vehicleActions}>
                    <TouchableOpacity
                      style={styles.deleteVehicleBtn}
                      onPress={() => handleDeleteVehicle(item.id)}
                    >
                      <Trash2 size={18} color={Colors.errorAlt} strokeWidth={2} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.editVehicleBtn}
                      onPress={() => handleEditPress(item)}
                    >
                      <ChevronRight size={18} color={Colors.textSecondary} strokeWidth={2} />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}

          {/* Informational tip */}
          <View style={styles.tipContainer}>
            <Text style={styles.tipTitle}>💡 Navigation Tip</Text>
            <Text style={styles.tipText}>
              The vehicle marked as "ACTIVE" is selected by default during checkout reservations. You can tap any vehicle card above to set it as active.
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );
};

export default MyVehiclesTab;
