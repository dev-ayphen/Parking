import React from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList } from 'react-native';
import { Control, Controller, FieldErrors, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { ChevronDown, CheckCircle, X } from 'lucide-react-native';
import FormInput from '../FormInput';
import { styles } from './addSpaceStyles';
import { Colors } from '../../theme';

export type SpaceFormData = {
  spaceName: string;
  spaceType: string;
  parkingFor: string;
  capacity: number;
  address: string;
  landmark?: string;
  latitude: number;
  longitude: number;
  hourlyPrice: string;
  dailyRate?: string;
  monthlyRate?: string;
  availability: string;
  amenities: string[];
  startTime?: string;
  endTime?: string;
  frontPhoto: boolean;
  areaPhoto?: boolean;
  areaVideo?: boolean;
  visibility?: string;
  docType?: string;
  acceptOwnerResponsibility: boolean;
  acceptLegalCompliance: boolean;
  acceptNonViolation: boolean;
};

type Props = {
  control: Control<SpaceFormData>;
  errors: FieldErrors<SpaceFormData>;
  watch: UseFormWatch<SpaceFormData>;
  setValue: UseFormSetValue<SpaceFormData>;
  showParkingForModal: boolean;
  setShowParkingForModal: (v: boolean) => void;
};

export default function Step1BasicDetails({
  control,
  errors,
  watch,
  setValue,
  showParkingForModal,
  setShowParkingForModal,
}: Props) {
  return (
    <View style={styles.formCard}>
      <Text style={styles.stepTitle}>Basic Space Details</Text>

      <View style={styles.formGroup}>
        <Controller
          control={control}
          name="spaceName"
          render={({ field: { onChange, onBlur, value, ref } }) => (
            <FormInput
              ref={ref}
              label="SPACE NAME"
              required
              placeholder="e.g. My Secure Covered Parking"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.spaceName?.message}
            />
          )}
        />
      </View>

      <View style={styles.formGroup}>
        <Controller
          control={control}
          name="parkingFor"
          render={({ field: { onChange, onBlur, value } }) => (
            <>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setShowParkingForModal(true)}
                style={styles.dropdownWrapper}
              >
                <View pointerEvents="none">
                  <FormInput
                    label="PARKING FOR"
                    required
                    placeholder="Select vehicle type..."
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    editable={false}
                    error={errors.parkingFor?.message}
                  />
                </View>
                <View style={styles.dropdownChevron}>
                  <ChevronDown size={18} color={Colors.textSecondary} />
                </View>
              </TouchableOpacity>

              <Modal
                visible={showParkingForModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowParkingForModal(false)}
              >
                <TouchableOpacity
                  style={styles.modalOverlay}
                  activeOpacity={1}
                  onPress={() => setShowParkingForModal(false)}
                >
                  <View style={styles.modalSheet}>
                    <View style={styles.modalHandle} />
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>Select Vehicle Type</Text>
                      <TouchableOpacity
                        style={styles.modalClose}
                        onPress={() => setShowParkingForModal(false)}
                      >
                        <X size={18} color={Colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                    <FlatList
                      data={['Car', 'Bike', 'Both']}
                      keyExtractor={(item) => item}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={[
                            styles.modalOption,
                            value === item && styles.modalOptionActive,
                          ]}
                          onPress={() => {
                            onChange(item);
                            setShowParkingForModal(false);
                          }}
                        >
                          <Text
                            style={[
                              styles.modalOptionText,
                              value === item && styles.modalOptionTextActive,
                            ]}
                          >
                            {item}
                          </Text>
                          {value === item && <CheckCircle size={18} color={Colors.primary} />}
                        </TouchableOpacity>
                      )}
                      showsVerticalScrollIndicator={false}
                    />
                  </View>
                </TouchableOpacity>
              </Modal>
            </>
          )}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>
          CAPACITY <Text style={styles.required}>*</Text>
        </Text>
        <View style={styles.capacityCard}>
          <TouchableOpacity
            style={[
              styles.capacityCircleBtn,
              (watch('capacity') || 1) <= 1 && styles.capacityCircleBtnDisabled,
            ]}
            onPress={() =>
              setValue('capacity', Math.max(1, (watch('capacity') || 1) - 1), {
                shouldValidate: true,
              })
            }
            disabled={(watch('capacity') || 1) <= 1}
          >
            <Text
              style={[
                styles.capacityCircleBtnText,
                (watch('capacity') || 1) <= 1 && styles.capacityCircleBtnTextDisabled,
              ]}
            >
              −
            </Text>
          </TouchableOpacity>

          <View style={styles.capacityCenter}>
            <Text style={styles.capacityCount}>{watch('capacity') || 1}</Text>
            <Text style={styles.capacityUnit}>
              {(watch('capacity') || 1) === 1 ? 'spot' : 'spots'}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.capacityCircleBtn,
              (watch('capacity') || 1) >= 10 && styles.capacityCircleBtnDisabled,
            ]}
            onPress={() =>
              setValue('capacity', Math.min(10, (watch('capacity') || 1) + 1), {
                shouldValidate: true,
              })
            }
            disabled={(watch('capacity') || 1) >= 10}
          >
            <Text
              style={[
                styles.capacityCircleBtnText,
                (watch('capacity') || 1) >= 10 && styles.capacityCircleBtnTextDisabled,
              ]}
            >
              +
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.capacityHint}>Max 10 spots per listing</Text>
        {errors.capacity && <Text style={styles.errorText}>{errors.capacity.message}</Text>}
      </View>
    </View>
  );
}
