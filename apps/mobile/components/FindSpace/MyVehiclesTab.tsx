import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { Car, Trash2, ChevronRight, Camera, UploadCloud, CheckCircle2, Check } from 'lucide-react-native';
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
  // URIs for real picked photos (null = not picked)
  newVehicleFrontPhotoUri: string | null;
  newVehicleSidePhotoUri: string | null;
  newVehicleRCBookUri: string | null;
  onPickFrontPhoto: () => void;
  onPickSidePhoto: () => void;
  onPickRCBook: () => void;
  newVehicleRole: string;
  setNewVehicleRole: (val: string) => void;
  vehicleAuthAccepted: boolean;
  setVehicleAuthAccepted: (val: boolean) => void;
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
  // Edit mode photo state — Supabase URL (existing) or local URI (newly picked)
  editFrontPhotoUri: string | null;
  editSidePhotoUri: string | null;
  editRCBookUri: string | null;
  onEditPickFrontPhoto: () => void;
  onEditPickSidePhoto: () => void;
  onEditPickRCBook: () => void;
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
  newVehicleFrontPhotoUri,
  newVehicleSidePhotoUri,
  newVehicleRCBookUri,
  onPickFrontPhoto,
  onPickSidePhoto,
  onPickRCBook,
  newVehicleRole,
  setNewVehicleRole,
  vehicleAuthAccepted,
  setVehicleAuthAccepted,
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
  editFrontPhotoUri,
  editSidePhotoUri,
  editRCBookUri,
  onEditPickFrontPhoto,
  onEditPickSidePhoto,
  onEditPickRCBook,
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
              style={[styles.uploadBox, newVehicleFrontPhotoUri && styles.uploadBoxSuccess]}
              onPress={onPickFrontPhoto}
            >
              {newVehicleFrontPhotoUri ? (
                <Image source={{ uri: newVehicleFrontPhotoUri }} style={{ width: 48, height: 48, borderRadius: 6, marginBottom: 4 }} />
              ) : (
                <Camera size={24} color={Colors.textMuted} />
              )}
              <Text style={styles.uploadBoxText}>Front View</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.uploadBox, newVehicleSidePhotoUri && styles.uploadBoxSuccess]}
              onPress={onPickSidePhoto}
            >
              {newVehicleSidePhotoUri ? (
                <Image source={{ uri: newVehicleSidePhotoUri }} style={{ width: 48, height: 48, borderRadius: 6, marginBottom: 4 }} />
              ) : (
                <Camera size={24} color={Colors.textMuted} />
              )}
              <Text style={styles.uploadBoxText}>Side View</Text>
            </TouchableOpacity>
          </View>

          <FormLabel required={false}>RC Book (Registration)</FormLabel>
          <TouchableOpacity
            style={[styles.fullWidthUploadBox, newVehicleRCBookUri && styles.uploadBoxSuccess]}
            onPress={onPickRCBook}
          >
            {newVehicleRCBookUri ? (
              <CheckCircle2 size={24} color={Colors.successAlt} />
            ) : (
              <UploadCloud size={24} color={Colors.textMuted} />
            )}
            <Text style={styles.uploadBoxText}>
              {newVehicleRCBookUri ? 'RC Book Selected ✓' : 'Upload RC for verified vehicle badge'}
            </Text>
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

          <FormLabel required>Authorization</FormLabel>
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setVehicleAuthAccepted(!vehicleAuthAccepted)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, vehicleAuthAccepted && styles.checkboxChecked]}>
              {vehicleAuthAccepted && <Check size={14} color={Colors.white} strokeWidth={3} />}
            </View>
            <Text style={styles.checkboxLabel}>
              I confirm this vehicle belongs to me or I have authorization to use it
            </Text>
          </TouchableOpacity>

          <View style={styles.formActionsRow}>
            <TouchableOpacity
              style={styles.cancelFormBtn}
              onPress={() => {
                setShowAddVehicle(false);
                setNewVehicleName('');
                setNewVehiclePlate('');
                setNewVehicleType('Car');
                setNewVehicleCapacity('5 Seater');
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

          <FormLabel required={false}>Vehicle Photos</FormLabel>
          <View style={styles.photoUploadRow}>
            <TouchableOpacity
              style={[styles.uploadBox, editFrontPhotoUri && styles.uploadBoxSuccess]}
              onPress={onEditPickFrontPhoto}
            >
              {editFrontPhotoUri ? (
                <Image source={{ uri: editFrontPhotoUri }} style={{ width: 48, height: 48, borderRadius: 6, marginBottom: 4 }} />
              ) : (
                <Camera size={24} color={Colors.textMuted} />
              )}
              <Text style={styles.uploadBoxText}>{editFrontPhotoUri ? 'Tap to change' : 'Front View'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.uploadBox, editSidePhotoUri && styles.uploadBoxSuccess]}
              onPress={onEditPickSidePhoto}
            >
              {editSidePhotoUri ? (
                <Image source={{ uri: editSidePhotoUri }} style={{ width: 48, height: 48, borderRadius: 6, marginBottom: 4 }} />
              ) : (
                <Camera size={24} color={Colors.textMuted} />
              )}
              <Text style={styles.uploadBoxText}>{editSidePhotoUri ? 'Tap to change' : 'Side View'}</Text>
            </TouchableOpacity>
          </View>

          <FormLabel required={false}>RC Book (Registration)</FormLabel>
          <TouchableOpacity
            style={[styles.fullWidthUploadBox, editRCBookUri && styles.uploadBoxSuccess]}
            onPress={onEditPickRCBook}
          >
            {editRCBookUri ? (
              <CheckCircle2 size={24} color={Colors.successAlt} />
            ) : (
              <UploadCloud size={24} color={Colors.textMuted} />
            )}
            <Text style={styles.uploadBoxText}>
              {editRCBookUri ? 'RC Book ✓ (tap to replace)' : 'Upload RC for verified vehicle badge'}
            </Text>
          </TouchableOpacity>

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
                    {item.frontPhotoUrl ? (
                      <Image source={{ uri: item.frontPhotoUrl }} style={{ width: 38, height: 38, borderRadius: 19 }} />
                    ) : (
                      <Car size={22} color={item.active ? Colors.primary : Colors.textSecondary} strokeWidth={2} />
                    )}
                  </View>
                  <View style={styles.vehicleDetailsCol}>
                    <View style={styles.vehicleNameRow}>
                      <Text style={styles.vehicleNameText}>{item.name}</Text>
                      {item.active && (
                        <View style={styles.activeBadge}>
                          <Text style={styles.activeBadgeText}>DEFAULT</Text>
                        </View>
                      )}
                      {item.rcVerified && (
                        <View style={[styles.activeBadge, { backgroundColor: Colors.successAlt }]}>
                          <Text style={styles.activeBadgeText}>VERIFIED</Text>
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
            <Text style={styles.tipTitle}>💡 Default Vehicle</Text>
            <Text style={styles.tipText}>
              Tap any vehicle to set it as your default. It will be pre-selected when you book a parking spot.
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );
};

export default MyVehiclesTab;
