import React, { useRef, useEffect, useState, useMemo } from 'react';
import {View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  useWindowDimensions} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Svg, { Path, Defs, RadialGradient, Stop } from 'react-native-svg';
import { api } from '../../services/api';
import { FontSize, FontWeight, BorderRadius, Spacing } from '../../theme';
import { useTheme, type AppTheme } from '../../hooks/useTheme';

const PinIcon = ({ size = 80 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 512 512">
    <Defs>
      <RadialGradient id="pinGradLogin" cx="40%" cy="30%" r="70%">
        <Stop offset="0%" stopColor="#FF3D7F" />
        <Stop offset="100%" stopColor="#A8003F" />
      </RadialGradient>
    </Defs>
    <Path
      fill="url(#pinGradLogin)"
      d="M256 32C167.6 32 96 103.6 96 192c0 112 160 288 160 288s160-176 160-288C416 103.6 344.4 32 256 32zm0 224c-35.3 0-64-28.7-64-64s28.7-64 64-64 64 28.7 64 64-28.7 64-64 64z"
    />
  </Svg>
);

const LoginScreen = () => {
  const router = useRouter();
  const theme = useTheme();
  const { colors, isDark } = theme;
  const { width } = useWindowDimensions();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const styles = useMemo(() => makeStyles(theme, width), [theme, width]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const validatePhone = (): string => {
    if (!phone.trim()) return 'Mobile number is required.';
    if (phone.length < 10) return 'Mobile number must be 10 digits.';
    if (phone.length > 10) return 'Mobile number must be 10 digits.';
    if (!/^[6-9]\d{9}$/.test(phone)) return 'Please enter a valid mobile number.';
    return '';
  };

  const handleSendOtp = async () => {
    const validationError = validatePhone();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setLoading(true);
    try {
      const data = await api.post('/auth/request-otp', { phone: '+91' + phone });
      setLoading(false);
      router.push({
        pathname: '/(auth)/verify-otp',
        params: { phone: '+91' + phone, ...(__DEV__ && data.devOtp ? { devOtp: data.devOtp } : {}) },
      });
    } catch (err: any) {
      setLoading(false);
      if (err?.isNetworkError || err?.status === 0) {
        setError('No internet connection. Check your network and try again.');
      } else if (err?.status >= 500) {
        setError('Unable to send OTP. Please try again.');
      } else if (typeof err?.message === 'string') {
        setError(err.message);
      } else {
        setError('Unable to send OTP. Please try again.');
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        backgroundColor={colors.white}
        barStyle={isDark ? 'light-content' : 'dark-content'}
      />

      {/* Decorative Top Background Circles */}
      <View style={styles.topCircle} />
      <View style={styles.smallCircle} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Logo + Brand */}
          <View style={styles.logoContainer}>
            <View style={styles.logoBackground}>
              <PinIcon size={64} />
            </View>
            <Text style={styles.brandName}>
              <Text style={styles.brandDark}>Park</Text>
              <Text style={styles.brandPink}>Swift</Text>
            </Text>
          </View>

          {/* Form Section */}
          <View style={styles.formSection}>
            <Text style={styles.heading}>Welcome back</Text>
            <Text style={styles.subheading}>Enter your phone number to continue</Text>

            {/* Phone Input */}
            <View style={[styles.phoneContainer, !!error && styles.phoneContainerError]}>
              <View style={styles.countryCode}>
                <Text style={styles.countryFlag}>🇮🇳</Text>
                <Text style={styles.countryText}>+91</Text>
              </View>
              <View style={styles.inputDivider} />
              <TextInput
                value={phone}
                onChangeText={(v) => { setPhone(v); setError(''); }}
                placeholder="Mobile number"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                maxLength={10}
                style={styles.input}
                editable={!loading}
              />
            </View>

            {!!error
              ? <Text style={styles.errorText}>{error}</Text>
              : <View style={{ marginBottom: Spacing['3xl'] }} />
            }

            {/* Continue Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleSendOtp}
              disabled={loading || phone.length !== 10}
              style={styles.buttonWrap}
            >
              <View style={[styles.button, (loading || phone.length !== 10) && styles.buttonDisabled]}>
                {loading ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={styles.buttonText}>Continue</Text>
                )}
              </View>
            </TouchableOpacity>

            {/* Terms and conditions text */}
            <Text style={styles.termsText}>
              By clicking Continue, you agree to our{' '}
              <Text style={styles.termsLink} onPress={() => router.push('/(auth)/terms')}>
                Terms & Conditions
              </Text>
              {' '}and{' '}
              <Text style={styles.termsLink} onPress={() => router.push('/(auth)/privacy')}>
                Privacy Policy
              </Text>
            </Text>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LoginScreen;

const makeStyles = ({ colors, spacing, radius, fontSize, fontWeight }: AppTheme, width: number) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.screenH,
    justifyContent: 'center',
  },
  topCircle: {
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: width * 0.6,
    backgroundColor: 'rgba(220,1,89,0.03)',
    position: 'absolute',
    top: -width * 0.6,
    right: -width * 0.2,
  },
  smallCircle: {
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: 'rgba(220,1,89,0.02)',
    position: 'absolute',
    top: width * 0.2,
    left: -width * 0.4,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoBackground: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#DC0159',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
    marginBottom: 24,
  },
  brandName: {
    fontSize: FontSize['4xl'],
    fontWeight: FontWeight.extrabold,
  },
  brandDark: {
    color: colors.textPrimary,
  },
  brandPink: {
    color: colors.primary,
  },
  formSection: {
    paddingTop: Spacing['4xl'],
  },
  heading: {
    fontSize: FontSize['5xl'],
    fontWeight: FontWeight.extrabold,
    color: colors.textPrimary,
    marginBottom: Spacing.md,
  },
  subheading: {
    fontSize: FontSize.md,
    color: colors.textSecondary,
    fontWeight: FontWeight.medium,
    marginBottom: Spacing['6xl'],
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderMedium,
    borderRadius: BorderRadius.lg,
    backgroundColor: colors.white,
    height: 60,
    marginBottom: Spacing.md,
    // iOS keeps a whisper-soft shadow for subtle depth. On Android, `elevation`
    // draws a hard grey halo that clashes with the 1px border (looks muddy/doubled
    // on a rounded field), so we drop it and let the crisp border carry the look —
    // the standard Material "outlined text field" treatment.
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: {},
    }),
  },
  phoneContainerError: {
    borderColor: colors.error,
    borderWidth: 1.5,
  },
  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing['3xl'],
    gap: 8,
  },
  countryFlag: {
    fontSize: 22,
  },
  countryText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: colors.textPrimary,
  },
  inputDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.borderMedium,
  },
  input: {
    flex: 1,
    height: 60,
    paddingHorizontal: Spacing['3xl'],
    fontSize: FontSize.xl,
    color: colors.textPrimary,
    fontWeight: FontWeight.semibold,
    letterSpacing: 1,
  },
  buttonWrap: {
    marginBottom: Spacing['4xl'],
  },
  button: {
    height: 52,
    borderRadius: BorderRadius.md,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: colors.white,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  terms: {
    fontSize: FontSize.sm,
    color: colors.textMuted,
    lineHeight: 20,
    textAlign: 'center',
  },
  termsLink: {
    color: colors.primary,
    fontWeight: FontWeight.semibold,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  termsText: {
    fontSize: FontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
  errorText: {
    color: colors.error,
    fontSize: FontSize.sm,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
});
