import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { Clock, Navigation, X, Phone, MessageSquare } from 'lucide-react-native';
import { Colors, ExtendedColors } from '../../theme';
import { styles } from './findSpaceStyles';

interface ActiveSessionsTabProps {
  activeBooking: any;
  setActiveTab: (tab: string) => void;
  timeRemaining: number;
  formatTime: (seconds: number) => string;
  handleVerifyOTP: (otp: string) => void;
  handleLeaveSession: () => void;
}

const ActiveSessionsTab: React.FC<ActiveSessionsTabProps> = ({
  activeBooking,
  setActiveTab,
  timeRemaining,
  formatTime,
  handleVerifyOTP,
  handleLeaveSession,
}) => {
  if (!activeBooking) {
    return (
      <View style={styles.emptyTabContent}>
        <Clock size={56} color={Colors.borderMedium} strokeWidth={1.5} />
        <Text style={styles.emptyStateHeading}>No Active Sessions</Text>
        <Text style={styles.emptyStateSubtext}>
          You don't have any ongoing or pending bookings at the moment.
        </Text>
        <TouchableOpacity
          style={styles.exploreBtn}
          onPress={() => setActiveTab('map')}
        >
          <Text style={styles.exploreBtnText}>Find Parking Space</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabContentContainer} showsVerticalScrollIndicator={false}>
      {/* Status Header Badge */}
      <View style={[
        styles.statusAlertBanner,
        activeBooking.status === 'PARKING' ? styles.statusActiveBanner : styles.statusPendingBanner
      ]}>
        <Text style={[
          styles.statusAlertText,
          activeBooking.status === 'PARKING' ? styles.statusActiveText : styles.statusPendingText
        ]}>
          {activeBooking.status === 'PARKING' ? '🟢 SESSION ACTIVE' : '🟡 BOOKING REQUEST APPROVED'}
        </Text>
      </View>

      {/* Key Code OTP Section */}
      {activeBooking.status === 'APPROVED' ? (
        <View style={styles.otpCardContainer}>
          <Text style={styles.otpCardTitle}>🔑 Your Entry Code</Text>
          <Text style={styles.otpCodeValue}>{activeBooking.otp}</Text>
          <Text style={styles.otpInstructionText}>
            Share this code with space host {activeBooking.ownerName} upon arrival, or tap below to check-in.
          </Text>

          <View style={styles.otpVerifyForm}>
            <TouchableOpacity
              style={styles.otpVerifyBtn}
              activeOpacity={0.8}
              onPress={() => handleVerifyOTP(activeBooking.otp)}
            >
              <Text style={styles.otpVerifyBtnText}>Confirm Arrival &amp; Start Session</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.timerCard}>
          <Text style={styles.timerLabel}>Remaining Parking Time</Text>
          <Text style={styles.timerCountdown}>{formatTime(timeRemaining)}</Text>

          <View style={styles.timerProgressBg}>
            <View style={[styles.timerProgressFill, { width: `${(timeRemaining / 7200) * 100}%` }]} />
          </View>
          <View style={styles.timerMetadataRow}>
            <Text style={styles.timerMetaText}>Started: {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
            <Text style={styles.timerMetaText}>Duration: {activeBooking.durationHours} hours</Text>
          </View>
        </View>
      )}

      {/* Space Details Card */}
      <View style={styles.detailCard}>
        <Text style={styles.detailSectionTitle}>🅿️ Space Location</Text>
        <Text style={styles.detailSpaceName}>{activeBooking.spaceName}</Text>
        <Text style={styles.detailAddress}>{activeBooking.address}</Text>

        <View style={styles.detailSeparator} />

        <View style={styles.metaInfoGrid}>
          <View style={styles.metaInfoItem}>
            <Text style={styles.metaItemLabel}>Vehicle</Text>
            <Text style={styles.metaItemValue}>{activeBooking.vehicleName}</Text>
            <Text style={styles.metaItemSub}>{activeBooking.vehiclePlate}</Text>
          </View>
          <View style={styles.metaInfoItem}>
            <Text style={styles.metaItemLabel}>Pricing Mode</Text>
            <Text style={styles.metaItemValue}>₹{activeBooking.pricePerHour}/hour</Text>
            <Text style={styles.metaItemSub}>Direct at Space</Text>
          </View>
        </View>
      </View>

      {/* Host/Owner Profile Section (Direct Payment Model specifies Chat & Call are unlocked) */}
      <View style={styles.ownerCard}>
        <Text style={styles.detailSectionTitle}>👤 Parking Space Host</Text>
        <View style={styles.ownerRow}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=120&auto=format&fit=crop' }}
            style={styles.ownerAvatar as any}
          />
          <View style={styles.ownerInfo}>
            <Text style={styles.ownerNameText}>{activeBooking.ownerName}</Text>
            <Text style={styles.ownerRatingText}>⭐ 4.9 (Space Owner)</Text>
          </View>
          <View style={styles.ownerActions}>
            <TouchableOpacity
              style={styles.ownerIconBtn}
              onPress={() => Alert.alert('Call Owner', `Calling host Priya Sharma at +91 ${activeBooking.ownerPhone}...`)}
            >
              <Phone size={18} color={ExtendedColors.teal} strokeWidth={2.2} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.ownerIconBtn}
              onPress={() => Alert.alert('Chat Message', 'Direct Messaging is opening. You can coordinate your arrival or settle the Direct UPI details here.')}
            >
              <MessageSquare size={18} color={ExtendedColors.activeBlueText} strokeWidth={2.2} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Action Controls */}
      <View style={styles.sessionControlActions}>
        <TouchableOpacity
          style={styles.navigationBtn}
          onPress={() => Alert.alert('Directions', 'Opening default maps app to navigate to Velachery Main Road, Pallikaranai, Chennai...')}
        >
          <Navigation size={18} color={Colors.white} strokeWidth={2.2} />
          <Text style={styles.navigationBtnText}>Get Directions</Text>
        </TouchableOpacity>

        {activeBooking.status === 'PARKING' && (
          <TouchableOpacity
            style={styles.leaveSessionBtn}
            onPress={handleLeaveSession}
            activeOpacity={0.8}
          >
            <X size={18} color={Colors.white} strokeWidth={2.2} />
            <Text style={styles.leaveSessionBtnText}>I am Leaving</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};

export default ActiveSessionsTab;
