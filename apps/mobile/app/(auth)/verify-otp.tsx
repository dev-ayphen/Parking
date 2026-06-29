import React, { useState, useRef, useEffect, useMemo } from 'react';
import {View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Animated,
  useWindowDimensions,
  Keyboard,
  Alert,
  Platform,
  TouchableWithoutFeedback} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ShieldCheck } from 'lucide-react-native';
import { ChevronLeft } from 'lucide-react-native';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { FontSize, FontWeight, BorderRadius, Spacing, ExtendedColors, Shadows } from '../../theme';
import type { ColorsType } from '../../theme';
import { useTheme } from '../../hooks/useTheme';

const OTP_LENGTH = 6;

const VerifyOtpScreen = () => {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const styles = useMemo(() => makeStyles(colors, width), [colors, width]);
  const { phone, devOtp } = useLocalSearchParams();
  const setSession = useAuthStore((s) => s.setSession);
  const initialOtp = typeof devOtp === 'string' ? devOtp : '';
  const [otp, setOtp] = useState(initialOtp);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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
      setError('Please enter the 6-digit code sent to your phone.');
      return;
    }

    setError('');
    Keyboard.dismiss();
    setLoading(true);
    try {
      const data = await api.post('/auth/verify-otp', { phone, otp });

      await setSession(data.token, data.user, data.expiresIn, data.refreshToken);

      const CURRENT_TC_VERSION = '1.0.0';
      if (data.user?.acceptedTermsVersion !== CURRENT_TC_VERSION) {
        try {
          await api.post('/auth/accept-terms', {
            termsVersion: CURRENT_TC_VERSION,
            platform: Platform.OS,
          });
        } catch (_) {}
      }

      setLoading(false);

      if (!data.user.isProfileComplete) {
        // Session is already saved above — don't pass tokens through route params
        // (they'd be visible in navigation history and debug tooling).
        router.replace({
          pathname: '/(auth)/complete-profile',
          params: { userId: data.user.id },
        });
      } else {
        router.replace('/(home)');
      }
    } catch (error) {
      setLoading(false);
      setError(typeof (error as any)?.message === 'string' ? (error as any).message : 'Incorrect OTP. Please try again.');
    }
  };

  const handleResendOtp = async () => {
    if (!phone || resendDisabled) return;
    setResendDisabled(true);
    setResendTimer(30);
    setOtp('');

    try {
      await api.post('/auth/request-otp', { phone });
      Alert.alert('Code Sent', 'A new OTP has been sent to your phone.');
    } catch (error) {
      Alert.alert('Resend Failed', 'Could not resend OTP. Please try again.');
      setResendDisabled(false);
      setResendTimer(0);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.white }]}>
        <StatusBar backgroundColor={colors.white} barStyle={isDark ? 'light-content' : 'dark-content'} />

        {/* Decorative circles — very subtle, won't tint SafeAreaView */}
        <View style={styles.topCircle} />
        <View style={styles.smallCircle} />

        <TouchableOpacity
          onPress={() => router.replace('/(auth)/login')}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <ChevronLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.headerContainer}>
            <View style={styles.iconRow}>
              <View style={styles.shieldIcon}>
                <ShieldCheck size={28} color={colors.primary} strokeWidth={2} />
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

            <View style={styles.otpWrapper}>
              <TextInput
                ref={inputRef}
                value={otp}
                onChangeText={(val) => { setOtp(val.replace(/[^0-9]/g, '')); setError(''); }}
                maxLength={OTP_LENGTH}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
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

            {!!error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleVerifyOtp}
              disabled={loading}
              style={styles.buttonShadow}
            >
              <LinearGradient
                colors={[colors.primaryLight, colors.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.button}
              >
                {loading ? (
                  <ActivityIndicator color={colors.white} size="large" />
                ) : (
                  <Text style={styles.buttonText}>Verify OTP</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleResendOtp} disabled={resendDisabled} style={styles.resendRow}>
              {resendDisabled ? (
                <Text style={styles.resendDisabled}>Resend in {resendTimer}s</Text>
              ) : (
                <Text style={styles.resendLabel}>
                  Didn't receive code?{' '}
                  <Text style={styles.resendLink}>Resend</Text>
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

const makeStyles = (colors: ColorsType, width: number) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    paddingHorizontal: 0,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.screenBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.screenH,
    marginTop: Spacing.md,
  },
  topCircle: {
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: width * 0.6,
    backgroundColor: 'rgba(220,1,89,0.04)',
    position: 'absolute',
    top: -width * 0.85,
    left: -width * 0.2,
  },
  smallCircle: {
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: 'rgba(220,1,89,0.025)',
    position: 'absolute',
    top: width * 0.1,
    right: -width * 0.5,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.screenH,
    paddingTop: 24,
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
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: Spacing.lg,
  },
  subtitle: {
    fontSize: FontSize.lg,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  phone: {
    color: colors.primary,
    fontWeight: FontWeight.bold,
  },
  mainContainer: {
    width: '100%',
  },
  label: {
    fontSize: FontSize.sm,
    color: colors.textSecondary,
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
    borderColor: colors.border,
    borderRadius: BorderRadius.md,
    backgroundColor: colors.screenBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxActive: {
    borderColor: colors.primary,
    backgroundColor: ExtendedColors.primaryTint1,
    borderWidth: 1.5,
  },
  otpBoxFilled: {
    borderColor: colors.border,
    backgroundColor: colors.white,
    borderWidth: 1.5,
  },
  otpText: {
    fontSize: FontSize['3xl'],
    fontWeight: FontWeight.semibold,
    color: colors.textMuted,
  },
  otpTextFilled: {
    color: colors.textPrimary,
  },
  buttonShadow: {
    shadowColor: colors.primary,
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
    color: colors.white,
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
  resendRow: {
    alignItems: 'center',
  },
  resendLabel: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: FontSize.base,
  },
  resendLink: {
    color: colors.primary,
    fontWeight: FontWeight.bold,
  },
  resendDisabled: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: FontSize.base,
  },
  errorText: {
    color: colors.error,
    fontSize: FontSize.sm,
    marginTop: -Spacing['3xl'],
    marginBottom: Spacing['3xl'],
    textAlign: 'center',
  },
});

export default VerifyOtpScreen;
