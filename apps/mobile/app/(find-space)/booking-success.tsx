import React, { useEffect } from 'react';
import {View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Animated,
  Dimensions} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CheckCircle } from 'lucide-react-native';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, ExtendedColors } from '../../theme';

const { height } = Dimensions.get('window');

export default function BookingSuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const bookingId = params.bookingId as string;
  const spaceName = params.spaceName as string;
  const totalAmount = params.totalAmount as string;

  const scaleAnim = React.useRef(new Animated.Value(0)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate in
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        damping: 8,
        mass: 1,
        stiffness: 100,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-navigate to booking-status after 2 seconds
    const timer = setTimeout(() => {
      router.replace({
        pathname: '/(find-space)/booking-status',
        params: { bookingId },
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.content}>
        <Animated.View
          style={[
            styles.checkContainer,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          <CheckCircle size={80} color={Colors.success} strokeWidth={1.5} />
        </Animated.View>

        <Text style={styles.title}>Booking Request Sent</Text>
        <Text style={styles.subtitle}>
          Your parking request has been sent to the space owner.
        </Text>

        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Space</Text>
            <Text style={styles.value}>{spaceName}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.detailRow}>
            <Text style={styles.label}>Amount</Text>
            <Text style={styles.value}>₹{totalAmount}</Text>
          </View>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            ⏱️ Waiting for owner approval
          </Text>
          <Text style={styles.infoSubtext}>
            Estimated response time: 2 minutes
          </Text>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={() =>
            router.replace({
              pathname: '/(find-space)/booking-status',
              params: { bookingId },
            })
          }
        >
          <Text style={styles.buttonText}>View Booking Status</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenH,
    paddingVertical: Spacing['7xl'],
  },
  checkContainer: {
    marginBottom: Spacing['4xl'],
    alignItems: 'center',
  },
  title: {
    fontSize: FontSize['4xl'],                      // 24 = 4xl ✓
    fontWeight: FontWeight.extrabold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSize.md,                          // 14 = md ✓
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing['4xl'],
    lineHeight: 20,
  },
  detailsCard: {
    width: '100%',
    backgroundColor: Colors.screenBg,
    borderRadius: BorderRadius.md,                  // 12 = md ✓
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing['3xl'],
    paddingVertical: Spacing.xl,
    marginBottom: Spacing.screenH,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  label: {
    fontSize: FontSize.base,                        // 13 = base ✓
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  value: {
    fontSize: FontSize.base,                        // 13 = base ✓
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  infoBox: {
    width: '100%',
    backgroundColor: Colors.warningBgAlt,
    borderRadius: BorderRadius.md,                  // 12 = md ✓
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.xl,
    marginBottom: Spacing['4xl'],
  },
  infoText: {
    fontSize: FontSize.base,                        // 13 = base ✓
    fontWeight: FontWeight.semibold,
    color: ExtendedColors.warningAmber,             // '#92400E' ✓
    marginBottom: Spacing.xs,
  },
  infoSubtext: {
    fontSize: FontSize.sm,                          // 12 = sm ✓
    color: ExtendedColors.warningText,              // '#B45309' ✓
    fontWeight: FontWeight.normal,
  },
  button: {
    width: '100%',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing['2xl'],
    borderRadius: BorderRadius.md,                  // 12 = md ✓
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: FontSize.lg,                          // 15 = lg ✓
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
});
