import React, { useState, useRef, useEffect } from 'react';
import {View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Animated,
  Dimensions,
  Keyboard,
  TouchableWithoutFeedback} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, ShieldCheck } from 'lucide-react-native';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, ExtendedColors, Shadows } from '../../theme';

const { width, height } = Dimensions.get('window');
const OTP_LENGTH = 6;

const VerifyOtpScreen = () => {
  const router = useRouter();
  const { phone, devOtp } = useLocalSearchParams();
  const setSession = useAuthStore((s) => s.setSession);
  const initialOtp = typeof devOtp === 'string' ? devOtp : '';
  const [otp, setOtp] = useState(initialOtp);
  const [loading, setLoading] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const inputRef = useRef<TextInput>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    } else if (resendTimer === 0 && resendDisabled) {
      setResendDisabled(false);
    }
    return () => clearInterval(interval);
  }, [resendTimer, resendDisabled]);

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== OTP_LENGTH) {
      alert('Please enter a valid 6-digit OTP');
      return;
    }

    Keyboard.dismiss();
    setLoading(true);
    try {
      const data = await api.post('/auth/verify-otp', { phone, otp });

      // Save token + user + expiry BEFORE navigating so every screen finds auth ready
      await setSession(data.token, data.user, data.expiresIn);
      setLoading(false);

      if (data.user.isNewUser) {
        router.push({
          pathname: '/(auth)/complete-profile',
          params: { token: data.token, userId: data.user.id, expiresIn: data.expiresIn },
        });
      } else {
        router.replace('/(home)');
      }
    } catch (error) {
      setLoading(false);
      alert('Verification failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleResendOtp = async () => {
    if (!phone) return;
    setResendDisabled(true);
    setResendTimer(30);
    setOtp('');

    try {
      await api.post('/auth/request-otp', { phone });
      alert('OTP resent successfully');
    } catch (error) {
      alert('Failed to resend OTP');
      setResendDisabled(false);
      setResendTimer(0);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor={Colors.white} barStyle="dark-content" />

        {/* Decorative Top Background Circles */}
        <View style={styles.topCircle} />
        <View style={styles.smallCircle} />

        {/* Back Button */}
        <View style={styles.backRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ChevronLeft size={20} color={Colors.textDark} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Header Section */}
          <View style={styles.headerContainer}>
            <View style={styles.iconRow}>
              <View style={styles.shieldIcon}>
                <ShieldCheck size={28} color={Colors.primary} strokeWidth={2} />
              </View>
            </View>
            <Text style={styles.title}>Verify OTP</Text>
            <Text style={styles.subtitle}>
              Enter the 6-digit code sent to{'\n'}
              <Text style={styles.phone}>{phone}</Text>
            </Text>
          </View>

          <View style={styles.mainContainer}>
            <Text style={styles.label}>OTP Code</Text>
            
            {/* Hidden Input wrapped in a visual 6-box UI */}
            <View style={styles.otpWrapper}>
              <TextInput
                ref={inputRef}
                value={otp}
                onChangeText={(val) => setOtp(val.replace(/[^0-9]/g, ''))}
                maxLength={OTP_LENGTH}
                keyboardType="number-pad"
                style={styles.hiddenInput}
                caretHidden={true}
                editable={!loading}
              />
              
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => inputRef.current?.focus()}
                style={styles.otpDisplayContainer}
              >
                {[...Array(OTP_LENGTH)].map((_, index) => {
                  const isActive = otp.length === index;
                  const isFilled = otp.length > index;
                  return (
                    <View
                      key={index}
                      style={[
                        styles.otpBox,
                        isActive && styles.otpBoxActive,
                        isFilled && styles.otpBoxFilled,
                      ]}
                    >
                      <Text style={[styles.otpText, isFilled && styles.otpTextFilled]}>
                        {otp[index] || ''}
                      </Text>
                    </View>
                  );
                })}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleVerifyOtp}
              disabled={loading}
              style={styles.buttonShadow}
            >
              <LinearGradient
                colors={[Colors.primaryLight, Colors.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.button}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.white} size="large" />
                ) : (
                  <Text style={styles.buttonText}>Verify OTP</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleResendOtp} disabled={resendDisabled}>
              <Text style={[styles.resend, resendDisabled && styles.resendDisabled]}>
                {resendDisabled ? `Resend in ${resendTimer}s` : "Didn't receive code? Resend"}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  topCircle: {
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: width * 0.6,
    backgroundColor: ExtendedColors.primaryAlpha03,
    position: 'absolute',
    top: -width * 0.7,
    left: -width * 0.2,
  },
  smallCircle: {
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: 'rgba(220,1,89,0.02)',
    position: 'absolute',
    top: width * 0.1,
    right: -width * 0.5,
  },
  backRow: {
    paddingHorizontal: Spacing.screenH,
    paddingTop: Spacing.md,
    zIndex: 10,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.circle,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.screenH,
    paddingTop: height * 0.04,
  },
  headerContainer: {
    marginBottom: 36,
  },
  iconRow: {
    marginBottom: Spacing['3xl'],
  },
  shieldIcon: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.lg,
    backgroundColor: ExtendedColors.primaryTint1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FontSize['5xl'],
    fontWeight: FontWeight.extrabold,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: Spacing.lg,
  },
  subtitle: {
    fontSize: FontSize.lg,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  phone: {
    color: Colors.primary,
    fontWeight: FontWeight.bold,
  },
  mainContainer: {
    width: '100%',
  },
  label: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing['3xl'],
    fontWeight: FontWeight.semibold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  otpWrapper: {
    position: 'relative',
    marginBottom: Spacing['6xl'],
  },
  hiddenInput: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0,
    zIndex: 1,
  },
  otpDisplayContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  otpBox: {
    width: (width - 40 - 50) / 6,
    aspectRatio: 0.85,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.screenBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxActive: {
    borderColor: Colors.primary,
    backgroundColor: ExtendedColors.primaryTint1,
    borderWidth: 1.5,
  },
  otpBoxFilled: {
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
  },
  otpText: {
    fontSize: FontSize['3xl'],
    fontWeight: FontWeight.semibold,
    color: Colors.textMuted,
  },
  otpTextFilled: {
    color: Colors.textPrimary,
  },
  buttonShadow: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: Spacing['4xl'],
  },
  button: {
    height: 56,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: Colors.white,
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
  resend: {
    textAlign: 'center',
    color: Colors.primary,
    fontWeight: FontWeight.bold,
    fontSize: FontSize.base,
  },
  resendDisabled: {
    color: Colors.textMuted,
  },
});

export default VerifyOtpScreen;
