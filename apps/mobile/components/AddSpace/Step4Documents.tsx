import React from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, Image } from 'react-native';
import { Control, Controller, FieldErrors, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import {
  ChevronDown,
  CheckCircle,
  X,
  Camera,
  Upload,
  FileText,
  Trash2,
  Video,
  CloudCheck,
} from 'lucide-react-native';
import FormInput from '../FormInput';
import { styles } from './addSpaceStyles';
import { Colors } from '../../theme';
import { VIDEO_LIMITS } from '../../config/media.config';
import { SpaceFormData } from './Step1BasicDetails';

const SPACE_TYPES = [
  'Independent House',
  'Rented House',
  'Apartment Owner Slot',
  'Apartment Tenant Slot',
  'Gated Villa',
  'Shop Front Parking',
  'Office Parking',
  'Vacant Private Land',
  'Inside Compound',
  'Open Frontage Area',
];

const SPACE_DOC_REQUIREMENTS: Record<string, string[]> = {
  'Independent House': ['EB Bill', 'Property Tax', 'Water Bill'],
  'Rented House': ['Rental Agreement', 'EB Bill'],
  'Apartment Owner Slot': ['Maintenance Bill', 'Parking Allocation Photo'],
  'Apartment Tenant Slot': ['Rental Agreement', 'Parking Permission'],
  'Gated Villa': ['Property Tax', 'EB Bill'],
  'Shop Front Parking': ['Shop License', 'GST Certificate', 'Rental Agreement'],
  'Office Parking': ['Company ID', 'Parking Permission'],
  'Vacant Private Land': ['Land Tax Receipt', 'Patta Copy'],
  'Inside Compound': ['Address Proof', 'Compound Photos'],
  'Open Frontage Area': [],
};

const REQUIRED_PROOF_TEXT: Record<string, string> = {
  'Independent House': 'EB Bill / Property Tax / Water Bill',
  'Rented House': 'Rental Agreement OR EB Bill + Owner Permission',
  'Apartment Owner Slot': 'Apartment Maintenance Bill OR Parking Allocation Photo',
  'Apartment Tenant Slot': 'Rental Agreement + Parking Permission',
  'Gated Villa': 'Property Tax / EB Bill',
  'Shop Front Parking': 'Shop License / GST / Rental Agreement',
  'Office Parking': 'Company ID + Parking Permission',
  'Vacant Private Land': 'Land Tax Receipt / Patta Copy',
  'Inside Compound': 'Any Address Proof + Compound Photos',
  'Open Frontage Area': 'Extra Photos + Manual Admin Review',
};

type Props = {
  control: Control<SpaceFormData>;
  errors: FieldErrors<SpaceFormData>;
  watch: UseFormWatch<SpaceFormData>;
  setValue: UseFormSetValue<SpaceFormData>;
  showSpaceTypeModal: boolean;
  setShowSpaceTypeModal: (v: boolean) => void;
  uploadedDocs: Array<{ name: string; uri: string; id?: number }>;
  setUploadedDocs: React.Dispatch<React.SetStateAction<Array<{ name: string; uri: string; id?: number }>>>;
  handlePickDocument: () => void;
  // Space media pickers + current selections
  frontPhotoUri?: string | null;
  areaPhotoUri?: string | null;
  areaVideoUri?: string | null;
  onPickFrontPhoto?: () => void;
  onPickAreaPhoto?: () => void;
  onPickAreaVideo?: () => void;
};

export default function Step4Documents({
  control,
  errors,
  watch,
  setValue,
  showSpaceTypeModal,
  setShowSpaceTypeModal,
  uploadedDocs,
  setUploadedDocs,
  handlePickDocument,
  frontPhotoUri,
  areaPhotoUri,
  areaVideoUri,
  onPickFrontPhoto,
  onPickAreaPhoto,
  onPickAreaVideo,
}: Props) {
  return (
    <View style={styles.formCard}>
      <Text style={styles.stepTitle}>Photos & Documents</Text>

      {/* Space Type dropdown (reconfirm for document context) */}
      <View style={styles.formGroup}>
        <Controller
          control={control}
          name="spaceType"
          render={({ field: { onChange, onBlur, value } }) => (
            <>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setShowSpaceTypeModal(true)}
                style={styles.dropdownWrapper}
              >
                <View pointerEvents="none">
                  <FormInput
                    label="SPACE TYPE"
                    required
                    placeholder="Select space type..."
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    editable={false}
                    error={errors.spaceType?.message}
                  />
                </View>
                <View style={styles.dropdownChevron}>
                  <ChevronDown size={18} color={Colors.textSecondary} />
                </View>
              </TouchableOpacity>

              <Modal
                visible={showSpaceTypeModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowSpaceTypeModal(false)}
              >
                <TouchableOpacity
                  style={styles.modalOverlay}
                  activeOpacity={1}
                  onPress={() => setShowSpaceTypeModal(false)}
                >
                  <View style={styles.modalSheet}>
                    <View style={styles.modalHandle} />
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>Select Space Type</Text>
                      <TouchableOpacity
                        style={styles.modalClose}
                        onPress={() => setShowSpaceTypeModal(false)}
                      >
                        <X size={18} color={Colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                    <FlatList
                      data={SPACE_TYPES}
                      keyExtractor={(item) => item}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={[
                            styles.modalOption,
                            value === item && styles.modalOptionActive,
                          ]}
                          onPress={() => {
                            onChange(item);
                            setValue('docType', SPACE_DOC_REQUIREMENTS[item]?.[0] as any);
                            setShowSpaceTypeModal(false);
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

      {/* Required Proof — auto-populated from Space Type, read-only */}
      <View style={[styles.formGroup, { marginBottom: 22 }]}>
        <Text style={styles.label}>REQUIRED PROOF</Text>
        <View style={styles.requiredProofBox}>
          <FileText
            size={16}
            color={watch('spaceType') === 'Open Frontage Area' ? Colors.warningAlt : Colors.primary}
          />
          <Text style={styles.requiredProofText}>
            {REQUIRED_PROOF_TEXT[watch('spaceType')] || 'Select space type above'}
          </Text>
        </View>
        {watch('spaceType') === 'Open Frontage Area' && (
          <View style={styles.openFrontageWarning}>
            <Text style={styles.openFrontageWarningText}>
              ⚠️ This parking type requires manual admin review and additional verification
              photos.
            </Text>
          </View>
        )}
      </View>

      {/* Upload Document */}
      <View style={[styles.formGroup, { marginBottom: 22 }]}>
        <Text style={styles.label}>
          UPLOAD DOCUMENT <Text style={styles.required}>*</Text>
        </Text>
        <TouchableOpacity style={styles.chooseFileBtn} onPress={handlePickDocument}>
          <Upload size={18} color={Colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.chooseFileBtnText}>Choose File</Text>
            <Text style={styles.chooseFileSubtext}>Image (JPG, PNG)</Text>
          </View>
        </TouchableOpacity>

        {uploadedDocs.map((doc, index) => (
          <View key={index} style={styles.uploadedDocRow}>
            {doc.id
              ? <CloudCheck size={16} color={Colors.success} />
              : <FileText size={16} color={Colors.textSecondary} />
            }
            <View style={{ flex: 1 }}>
              <Text style={styles.uploadedDocName} numberOfLines={1}>{doc.name}</Text>
              {doc.id && (
                <Text style={{ fontSize: 11, color: Colors.success }}>Already uploaded ✓</Text>
              )}
            </View>
            <TouchableOpacity
              onPress={() => setUploadedDocs((prev) => prev.filter((_, i) => i !== index))}
            >
              <Trash2 size={16} color={Colors.errorAlt} />
            </TouchableOpacity>
          </View>
        ))}

        {uploadedDocs.length === 0 && (
          <Text style={styles.uploadDocHint}>No file chosen</Text>
        )}
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>
          SPACE AREA PHOTO <Text style={styles.required}>*</Text>
        </Text>
        <View style={styles.uploadGrid}>
          <TouchableOpacity
            style={[styles.uploadBox, frontPhotoUri && styles.uploadBoxActive]}
            onPress={onPickFrontPhoto}
          >
            {frontPhotoUri ? (
              <Image source={{ uri: frontPhotoUri }} style={styles.uploadPreview} />
            ) : (
              <Camera size={28} color={Colors.textMuted} />
            )}
            <Text style={styles.uploadBoxText}>Front Photo</Text>
            <Text style={styles.uploadBoxSubtext}>{frontPhotoUri ? 'Tap to change' : 'Required'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.uploadBox, areaPhotoUri && styles.uploadBoxActive]}
            onPress={onPickAreaPhoto}
          >
            {areaPhotoUri ? (
              <Image source={{ uri: areaPhotoUri }} style={styles.uploadPreview} />
            ) : (
              <Camera size={28} color={Colors.textMuted} />
            )}
            <Text style={styles.uploadBoxText}>Area Photo</Text>
            <Text style={styles.uploadBoxSubtext}>{areaPhotoUri ? 'Tap to change' : 'Optional'}</Text>
          </TouchableOpacity>
        </View>
        {errors.frontPhoto && (
          <Text style={styles.errorText}>{errors.frontPhoto.message}</Text>
        )}
      </View>

      <View style={[styles.formGroup, { marginTop: 16 }]}>
        <Text style={styles.label}>SPACE AREA VIDEO</Text>
        <View style={styles.uploadGrid}>
          <TouchableOpacity
            style={[
              styles.uploadBox,
              areaVideoUri && styles.uploadBoxActive,
              { maxWidth: '48%' },
            ]}
            onPress={onPickAreaVideo}
          >
            {areaVideoUri ? (
              <CheckCircle size={28} color={Colors.success} />
            ) : (
              <Video size={28} color={Colors.textMuted} />
            )}
            <Text style={styles.uploadBoxText}>Area Video</Text>
            <Text style={styles.uploadBoxSubtext}>{areaVideoUri ? 'Selected' : 'Optional'}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.uploadDocHint}>{VIDEO_LIMITS.hintLabel}</Text>
      </View>
    </View>
  );
}
