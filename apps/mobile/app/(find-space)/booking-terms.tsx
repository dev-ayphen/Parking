import React from 'react';
import {View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import PageHeader from '../../components/PageHeader';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing } from '../../theme';

const BookingTermsScreen = () => {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <PageHeader title="Terms & Conditions" onBack={() => router.replace('/(find-space)')} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Booking Declarations</Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• I have verified the surroundings and parking area is suitable for my vehicle.</Text>
            <Text style={styles.bulletItem}>• I understand and accept the local parking rules and regulations.</Text>
            <Text style={styles.bulletItem}>• I accept full responsibility for any parking fines or penalties.</Text>
            <Text style={styles.bulletItem}>• I understand ParkSwift only connects me with the space owner and is not liable for disputes.</Text>
            <Text style={styles.bulletItem}>• I agree to the Terms & Conditions and cancellation policy.</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Parker Terms & Conditions</Text>
          
          <Text style={styles.subTitle}>Parking Responsibility</Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• Parker must park in designated area within the space boundary</Text>
            <Text style={styles.bulletItem}>• Must not obstruct other vehicles or pedestrians</Text>
            <Text style={styles.bulletItem}>• Must follow owner's specific parking instructions</Text>
          </View>

          <Text style={styles.subTitle}>Fine/Towing Responsibility</Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• Parker is responsible for any fines issued by local authorities</Text>
            <Text style={styles.bulletItem}>• Parker is responsible for towing charges if vehicle is towed</Text>
            <Text style={styles.bulletItem}>• Parker is responsible for traffic violations</Text>
            <Text style={styles.bulletItem}>• ParkSwift is NOT liable for any authority actions</Text>
          </View>

          <Text style={styles.subTitle}>Local Rules</Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• Parker must follow all local parking laws and restrictions</Text>
            <Text style={styles.bulletItem}>• Parker must respect municipal regulations</Text>
            <Text style={styles.bulletItem}>• Must comply with any temporary parking restrictions</Text>
          </View>

          <Text style={styles.subTitle}>Risk Acceptance</Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• Parker must verify surroundings before parking</Text>
            <Text style={styles.bulletItem}>• Parker must assess space condition and location</Text>
            <Text style={styles.bulletItem}>• Parker accepts all risks associated with the space</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Platform Disclaimer</Text>

          <Text style={styles.subTitle}>Platform Role</Text>
          <Text style={styles.paragraph}>
            ParkSwift is a parking coordination platform that connects parking space owners with drivers seeking parking. We facilitate the connection but do not provide the parking service itself.
          </Text>

          <Text style={styles.subTitle}>Space Legality</Text>
          <Text style={styles.paragraph}>
            ParkSwift does not guarantee the legal validity of every parking space. Users must verify local parking permissions before using any space. The platform's verification is for operational purposes only and does not constitute legal approval.
          </Text>

          <Text style={styles.subTitle}>Authority Actions</Text>
          <Text style={styles.paragraph}>
            All actions by local authorities (fines, towing, restrictions) remain the responsibility of the user. ParkSwift is not liable for any consequences of parking in any location.
          </Text>

          <Text style={styles.subTitle}>Disputes</Text>
          <Text style={styles.paragraph}>
            Users are responsible for disputes arising from misuse, unauthorized sharing, or breach of terms. ParkSwift can mediate but is not liable for resolution outcomes.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  content: {
    flex: 1,
    backgroundColor: Colors.screenBg,
    padding: Spacing.screenH,
  },
  section: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,        // 16 = lg ✓
    padding: Spacing.screenH,
    marginBottom: Spacing['3xl'],
    borderWidth: 1,
    borderColor: Colors.border,           // '#E2E8F0' = border ✓
  },
  sectionTitle: {
    fontSize: FontSize['2xl'],            // 18 = 2xl ✓
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing['3xl'],
  },
  subTitle: {
    fontSize: FontSize.lg,                // 15 = lg ✓
    fontWeight: FontWeight.semibold,
    color: Colors.textDark,
    marginTop: Spacing['3xl'],
    marginBottom: Spacing.md,
  },
  paragraph: {
    fontSize: FontSize.md,                // 14 = md ✓
    color: Colors.textBody,
    lineHeight: 22,
  },
  bulletList: {
    gap: Spacing.md,
  },
  bulletItem: {
    fontSize: FontSize.md,                // 14 = md ✓
    color: Colors.textBody,
    lineHeight: 22,
  },
});

export default BookingTermsScreen;
