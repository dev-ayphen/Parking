import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { FieldErrors, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { CheckCircle, Building2, MapPin, IndianRupee, FileText } from 'lucide-react-native';
import { styles } from './addSpaceStyles';
import { Colors } from '../../theme';
import { SpaceFormData } from './Step1BasicDetails';

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
  errors: FieldErrors<SpaceFormData>;
  watch: UseFormWatch<SpaceFormData>;
  setValue: UseFormSetValue<SpaceFormData>;
  uploadedDocs: Array<{ name: string; uri: string }>;
};

export default function Step5Compliance({ errors, watch, setValue, uploadedDocs }: Props) {
  return (
    <View>
      {/* ── BASIC DETAILS ── */}
      <View style={styles.summaryCard}>
        <View style={styles.summarySectionHeader}>
          <View style={styles.summarySectionIcon}>
            <Building2 size={13} color={Colors.primary} />
          </View>
          <Text style={styles.summarySectionTitle}>Basic Details</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryRowLabel}>Space Name</Text>
          <Text style={styles.summaryRowValue}>{watch('spaceName') || '—'}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryRowLabel}>Space Type</Text>
          <Text style={styles.summaryRowValue}>{watch('spaceType') || '—'}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryRowLabel}>Parking For</Text>
          <Text style={styles.summaryRowValue}>{watch('parkingFor') || '—'}</Text>
        </View>
        <View style={[styles.summaryRow, styles.summaryRowLast]}>
          <Text style={styles.summaryRowLabel}>Capacity</Text>
          <Text style={styles.summaryRowValue}>
            {watch('capacity')} {watch('capacity') === 1 ? 'spot' : 'spots'}
          </Text>
        </View>
      </View>

      {/* ── LOCATION ── */}
      <View style={styles.summaryCard}>
        <View style={styles.summarySectionHeader}>
          <View style={styles.summarySectionIcon}>
            <MapPin size={13} color={Colors.primary} />
          </View>
          <Text style={styles.summarySectionTitle}>Location</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryRowLabel}>Full Address</Text>
          <Text style={[styles.summaryRowValue, { flex: 1, textAlign: 'right' }]}>
            {watch('address') || '—'}
          </Text>
        </View>
        {!!watch('landmark') && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryRowLabel}>Landmark</Text>
            <Text style={styles.summaryRowValue}>{watch('landmark')}</Text>
          </View>
        )}
        <View style={[styles.summaryRow, styles.summaryRowLast]}>
          <Text style={styles.summaryRowLabel}>Coordinates</Text>
          <Text style={styles.summaryRowValue}>
            {watch('latitude').toFixed(4)}°N, {watch('longitude').toFixed(4)}°E
          </Text>
        </View>
      </View>

      {/* ── PRICING & AVAILABILITY ── */}
      <View style={styles.summaryCard}>
        <View style={styles.summarySectionHeader}>
          <View style={styles.summarySectionIcon}>
            <IndianRupee size={13} color={Colors.primary} />
          </View>
          <Text style={styles.summarySectionTitle}>Pricing & Availability</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryRowLabel}>Hourly Rate</Text>
          <Text style={[styles.summaryRowValue, { color: Colors.primary, fontWeight: '700' }]}>
            ₹{watch('hourlyPrice') || '—'}/hr
          </Text>
        </View>
        {!!watch('dailyRate') && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryRowLabel}>Daily Rate</Text>
            <Text style={styles.summaryRowValue}>₹{watch('dailyRate')}/day</Text>
          </View>
        )}
        {!!watch('monthlyRate') && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryRowLabel}>Monthly Rate</Text>
            <Text style={styles.summaryRowValue}>₹{watch('monthlyRate')}/month</Text>
          </View>
        )}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryRowLabel}>Availability</Text>
          <Text style={styles.summaryRowValue}>{watch('availability') || '—'}</Text>
        </View>
        <View style={[styles.summaryRow, styles.summaryRowLast]}>
          <Text style={styles.summaryRowLabel}>Amenities</Text>
          <Text style={styles.summaryRowValue}>
            {watch('amenities')?.length > 0 ? watch('amenities').join(', ') : 'None'}
          </Text>
        </View>
      </View>

      {/* ── DOCUMENTS & PHOTOS ── */}
      <View style={styles.summaryCard}>
        <View style={styles.summarySectionHeader}>
          <View style={styles.summarySectionIcon}>
            <FileText size={13} color={Colors.primary} />
          </View>
          <Text style={styles.summarySectionTitle}>Documents & Photos</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryRowLabel}>Required Proof</Text>
          <Text style={[styles.summaryRowValue, { flex: 1, textAlign: 'right' }]}>
            {REQUIRED_PROOF_TEXT[watch('spaceType')] || '—'}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryRowLabel}>Documents</Text>
          <Text
            style={[
              styles.summaryRowValue,
              uploadedDocs.length === 0 && { color: Colors.errorAlt },
            ]}
          >
            {uploadedDocs.length > 0 ? `${uploadedDocs.length} file(s)` : 'None uploaded'}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryRowLabel}>Front Photo</Text>
          <Text
            style={[
              styles.summaryRowValue,
              { color: watch('frontPhoto') ? Colors.success : Colors.errorAlt },
            ]}
          >
            {watch('frontPhoto') ? '✓ Added' : '✗ Missing'}
          </Text>
        </View>
        <View style={[styles.summaryRow, styles.summaryRowLast]}>
          <Text style={styles.summaryRowLabel}>Area Photo</Text>
          <Text
            style={[
              styles.summaryRowValue,
              { color: watch('areaPhoto') ? Colors.success : Colors.textMuted },
            ]}
          >
            {watch('areaPhoto') ? '✓ Added' : 'Not added'}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryRowLabel}>Area Video</Text>
          <Text
            style={[
              styles.summaryRowValue,
              { color: watch('areaVideo') ? Colors.success : Colors.textMuted },
            ]}
          >
            {watch('areaVideo') ? '✓ Added' : 'Not added'}
          </Text>
        </View>
      </View>

      {/* ── COMPLIANCE CHECKBOXES ── */}
      <View style={styles.summaryCard}>
        <Text style={[styles.summarySectionTitle, { marginBottom: 16 }]}>
          Owner Declaration
        </Text>

        {[
          {
            key: 'acceptOwnerResponsibility' as const,
            text: 'I confirm I own this space or have proper authorization to lease it',
          },
          {
            key: 'acceptLegalCompliance' as const,
            text: 'This space complies with local municipal and parking regulations',
          },
          {
            key: 'acceptNonViolation' as const,
            text: 'This space does not block public roads, footpaths, or emergency access',
          },
        ].map(({ key, text }) => (
          <View key={key} style={styles.consentGroup}>
            <TouchableOpacity
              style={styles.consentCheckbox}
              onPress={() => setValue(key, !watch(key), { shouldValidate: true })}
            >
              <View style={[styles.checkbox, watch(key) && styles.checkboxActive]}>
                {watch(key) && <CheckCircle size={14} color={Colors.white} />}
              </View>
              <Text style={styles.consentText}>{text}</Text>
            </TouchableOpacity>
            {errors[key] && <Text style={styles.errorText}>{errors[key]?.message}</Text>}
          </View>
        ))}
      </View>
    </View>
  );
}
