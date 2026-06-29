import React, { useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, FlatList } from 'react-native';
import { Control, Controller, FieldErrors, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { ChevronDown, CheckCircle, X } from 'lucide-react-native';
import FormInput from '../FormInput';
import { makeAddSpaceStyles } from './addSpaceStyles';
import { useTheme } from '../../hooks/useTheme';
import type { ColorsType } from '../../theme';
import { SpaceFormData } from './Step1BasicDetails';

const AMENITIES = [
  'CCTV',
  'Covered',
  'Security',
  'EV Charging',
  'Night Lighting',
  '24/7 Access',
  'Water Available',
];

type Props = {
  control: Control<SpaceFormData>;
  errors: FieldErrors<SpaceFormData>;
  watch: UseFormWatch<SpaceFormData>;
  setValue: UseFormSetValue<SpaceFormData>;
  showAvailabilityModal: boolean;
  setShowAvailabilityModal: (v: boolean) => void;
  modalAvailability: string;
  setModalAvailability: (v: string) => void;
  modalStartTime: string;
  setModalStartTime: (v: string) => void;
  modalEndTime: string;
  setModalEndTime: (v: string) => void;
  startAmPm: 'AM' | 'PM';
  setStartAmPm: (v: 'AM' | 'PM') => void;
  endAmPm: 'AM' | 'PM';
  setEndAmPm: (v: 'AM' | 'PM') => void;
  showAmenitiesModal: boolean;
  setShowAmenitiesModal: (v: boolean) => void;
  tempAmenities: string[];
  setTempAmenities: React.Dispatch<React.SetStateAction<string[]>>;
  formatTimeInput: (raw: string) => string;
  isTimeValid: (t: string) => boolean;
};

export default function Step3Pricing({
  control,
  errors,
  watch,
  setValue,
  showAvailabilityModal,
  setShowAvailabilityModal,
  modalAvailability,
  setModalAvailability,
  modalStartTime,
  setModalStartTime,
  modalEndTime,
  setModalEndTime,
  startAmPm,
  setStartAmPm,
  endAmPm,
  setEndAmPm,
  showAmenitiesModal,
  setShowAmenitiesModal,
  tempAmenities,
  setTempAmenities,
  formatTimeInput,
  isTimeValid,
}: Props) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeAddSpaceStyles(colors), [colors]);

  return (
    <View style={styles.formCard}>
      <Text style={styles.stepTitle}>Pricing & Availability</Text>

      <View style={styles.formGroup}>
        <Controller
          control={control}
          name="hourlyPrice"
          render={({ field: { onChange, onBlur, value, ref } }) => (
            <FormInput
              ref={ref}
              label="HOURLY PRICE (₹)"
              required
              placeholder="e.g. 50"
              keyboardType="decimal-pad"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.hourlyPrice?.message}
            />
          )}
        />
      </View>

      <View style={styles.formGroup}>
        <Controller
          control={control}
          name="dailyRate"
          render={({ field: { onChange, onBlur, value, ref } }) => (
            <FormInput
              ref={ref}
              label="DAILY RATE (₹) - OPTIONAL"
              placeholder="e.g. 400"
              keyboardType="decimal-pad"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.dailyRate?.message}
            />
          )}
        />
      </View>

      <View style={styles.formGroup}>
        <Controller
          control={control}
          name="monthlyRate"
          render={({ field: { onChange, onBlur, value, ref } }) => (
            <FormInput
              ref={ref}
              label="MONTHLY RATE (₹) - OPTIONAL"
              placeholder="e.g. 8000"
              keyboardType="decimal-pad"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.monthlyRate?.message}
            />
          )}
        />
      </View>

      <View style={styles.formGroup}>
        <Controller
          control={control}
          name="availability"
          render={({ field: { onChange, onBlur, value } }) => {
            const displayValue =
              value === 'Custom Hours' && watch('startTime') && watch('endTime')
                ? `Custom: ${watch('startTime')} – ${watch('endTime')}`
                : value || '';
            return (
              <>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    setModalAvailability(value || '24 Hours');
                    // Restore existing time if set (strip AM/PM for the input field)
                    const existingStart = watch('startTime') || '';
                    const existingEnd = watch('endTime') || '';
                    setModalStartTime(existingStart.replace(/ (AM|PM)$/, ''));
                    setModalEndTime(existingEnd.replace(/ (AM|PM)$/, ''));
                    if (existingStart.endsWith('PM')) setStartAmPm('PM');
                    else setStartAmPm('AM');
                    if (existingEnd.endsWith('AM')) setEndAmPm('AM');
                    else setEndAmPm('PM');
                    setShowAvailabilityModal(true);
                  }}
                  style={styles.dropdownWrapper}
                >
                  <View pointerEvents="none">
                    <FormInput
                      label="AVAILABILITY"
                      required
                      placeholder="Select availability..."
                      value={displayValue}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      editable={false}
                      error={
                        errors.availability?.message || (errors as any).startTime?.message
                      }
                    />
                  </View>
                  <View style={styles.dropdownChevron}>
                    <ChevronDown size={18} color={colors.textSecondary} />
                  </View>
                </TouchableOpacity>

                <Modal
                  visible={showAvailabilityModal}
                  transparent
                  animationType="slide"
                  onRequestClose={() => setShowAvailabilityModal(false)}
                >
                  <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowAvailabilityModal(false)}
                  >
                    <View style={styles.modalSheet}>
                      <View style={styles.modalHandle} />
                      <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Select Availability</Text>
                        <TouchableOpacity
                          style={styles.modalClose}
                          onPress={() => setShowAvailabilityModal(false)}
                        >
                          <X size={18} color={colors.textSecondary} />
                        </TouchableOpacity>
                      </View>

                      {['24 Hours', 'Custom Hours', 'Weekdays Only'].map((item) => (
                        <TouchableOpacity
                          key={item}
                          style={[
                            styles.modalOption,
                            modalAvailability === item && styles.modalOptionActive,
                          ]}
                          onPress={() => {
                            setModalAvailability(item);
                            if (item !== 'Custom Hours') {
                              onChange(item);
                              setValue('startTime', '');
                              setValue('endTime', '');
                              setShowAvailabilityModal(false);
                            }
                          }}
                        >
                          <Text
                            style={[
                              styles.modalOptionText,
                              modalAvailability === item && styles.modalOptionTextActive,
                            ]}
                          >
                            {item}
                          </Text>
                          {modalAvailability === item && item !== 'Custom Hours' && (
                            <CheckCircle size={18} color={colors.primary} />
                          )}
                        </TouchableOpacity>
                      ))}

                      {modalAvailability === 'Custom Hours' && (
                        <View style={styles.customTimeSection}>
                          <Text style={styles.customTimeLabel}>Set Your Hours</Text>

                          <View style={styles.customTimeRow}>
                            {/* START TIME */}
                            <View style={styles.customTimeField}>
                              <Text style={styles.customTimeFieldLabel}>START TIME</Text>
                              <View style={styles.timeInputRow}>
                                <TextInput
                                  style={[styles.customTimeInput, { flex: 1 }]}
                                  placeholder="09:00"
                                  placeholderTextColor={colors.textMuted}
                                  value={modalStartTime}
                                  onChangeText={(t) =>
                                    setModalStartTime(formatTimeInput(t))
                                  }
                                  keyboardType="numeric"
                                  maxLength={5}
                                />
                                <View style={styles.amPmToggle}>
                                  {(['AM', 'PM'] as const).map((p) => (
                                    <TouchableOpacity
                                      key={p}
                                      style={[
                                        styles.amPmBtn,
                                        startAmPm === p && styles.amPmBtnActive,
                                      ]}
                                      onPress={() => setStartAmPm(p)}
                                    >
                                      <Text
                                        style={[
                                          styles.amPmText,
                                          startAmPm === p && styles.amPmTextActive,
                                        ]}
                                      >
                                        {p}
                                      </Text>
                                    </TouchableOpacity>
                                  ))}
                                </View>
                              </View>
                              {modalStartTime.length > 0 &&
                                !isTimeValid(modalStartTime) && (
                                  <Text style={styles.timeHintError}>
                                    Use HH:MM (e.g. 09:30)
                                  </Text>
                                )}
                            </View>

                            <View style={styles.customTimeDash}>
                              <Text style={styles.customTimeDashText}>–</Text>
                            </View>

                            {/* END TIME */}
                            <View style={styles.customTimeField}>
                              <Text style={styles.customTimeFieldLabel}>END TIME</Text>
                              <View style={styles.timeInputRow}>
                                <TextInput
                                  style={[styles.customTimeInput, { flex: 1 }]}
                                  placeholder="09:00"
                                  placeholderTextColor={colors.textMuted}
                                  value={modalEndTime}
                                  onChangeText={(t) => setModalEndTime(formatTimeInput(t))}
                                  keyboardType="numeric"
                                  maxLength={5}
                                />
                                <View style={styles.amPmToggle}>
                                  {(['AM', 'PM'] as const).map((p) => (
                                    <TouchableOpacity
                                      key={p}
                                      style={[
                                        styles.amPmBtn,
                                        endAmPm === p && styles.amPmBtnActive,
                                      ]}
                                      onPress={() => setEndAmPm(p)}
                                    >
                                      <Text
                                        style={[
                                          styles.amPmText,
                                          endAmPm === p && styles.amPmTextActive,
                                        ]}
                                      >
                                        {p}
                                      </Text>
                                    </TouchableOpacity>
                                  ))}
                                </View>
                              </View>
                              {modalEndTime.length > 0 && !isTimeValid(modalEndTime) && (
                                <Text style={styles.timeHintError}>
                                  Use HH:MM (e.g. 06:00)
                                </Text>
                              )}
                            </View>
                          </View>

                          <TouchableOpacity
                            style={[
                              styles.customTimeConfirmBtn,
                              (!isTimeValid(modalStartTime) ||
                                !isTimeValid(modalEndTime)) &&
                                styles.customTimeConfirmBtnDisabled,
                            ]}
                            disabled={
                              !isTimeValid(modalStartTime) || !isTimeValid(modalEndTime)
                            }
                            onPress={() => {
                              const start = `${modalStartTime} ${startAmPm}`;
                              const end = `${modalEndTime} ${endAmPm}`;
                              onChange('Custom Hours');
                              setValue('startTime', start);
                              setValue('endTime', end);
                              setShowAvailabilityModal(false);
                            }}
                          >
                            <Text
                              style={[
                                styles.customTimeConfirmText,
                                (!isTimeValid(modalStartTime) ||
                                  !isTimeValid(modalEndTime)) &&
                                  styles.customTimeConfirmTextDisabled,
                              ]}
                            >
                              Confirm Hours
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                </Modal>
              </>
            );
          }}
        />
      </View>

      <View style={styles.formGroup}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            setTempAmenities([...(watch('amenities') || [])]);
            setShowAmenitiesModal(true);
          }}
          style={styles.dropdownWrapper}
        >
          <View pointerEvents="none">
            <FormInput
              label="AMENITIES (OPTIONAL)"
              placeholder="Tap to select amenities..."
              value={
                watch('amenities').length === 0
                  ? ''
                  : watch('amenities').length === 1
                    ? watch('amenities')[0]
                    : `${watch('amenities').length} selected: ${watch('amenities').slice(0, 2).join(', ')}${watch('amenities').length > 2 ? '...' : ''}`
              }
              onChangeText={() => {}}
              editable={false}
            />
          </View>
          <View style={styles.dropdownChevron}>
            <ChevronDown size={18} color={colors.textSecondary} />
          </View>
        </TouchableOpacity>

        <Modal
          visible={showAmenitiesModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowAmenitiesModal(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowAmenitiesModal(false)}
          >
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Amenities</Text>
                <TouchableOpacity
                  style={[
                    styles.modalClose,
                    { width: 'auto' as any, paddingHorizontal: 12, borderRadius: 8 },
                  ]}
                  onPress={() => {
                    setValue('amenities', tempAmenities);
                    setShowAmenitiesModal(false);
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>
                    Done
                  </Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={AMENITIES}
                keyExtractor={(item) => item}
                renderItem={({ item }) => {
                  const selected = tempAmenities.includes(item);
                  return (
                    <TouchableOpacity
                      style={[styles.modalOption, selected && styles.modalOptionActive]}
                      onPress={() => {
                        setTempAmenities((prev) =>
                          prev.includes(item)
                            ? prev.filter((a) => a !== item)
                            : [...prev, item]
                        );
                      }}
                    >
                      <Text
                        style={[
                          styles.modalOptionText,
                          selected && styles.modalOptionTextActive,
                        ]}
                      >
                        {item}
                      </Text>
                      {selected && <CheckCircle size={18} color={colors.primary} />}
                    </TouchableOpacity>
                  );
                }}
                showsVerticalScrollIndicator={false}
              />
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    </View>
  );
}
