import React, { useRef, useEffect, useState, useMemo } from 'react';
import {View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { Smartphone } from 'lucide-react-native';
import { api } from '../../services/api';
import { FontSize, FontWeight, BorderRadius, Spacing } from '../../theme';
import { useTheme, type AppTheme } from '../../hooks/useTheme';

const { width } = Dimensions.get('window');

const ParkSwiftLogo = ({ color }: { color: string }) => (
  <Svg width={48} height={48} viewBox="0 0 512 512">
    <Path
      fill={color}
      d="M256 32C167.6 32 96 103.6 96 192c0 112 160 288 160 288s160-176 160-288C416 103.6 344.4 32 256 32zm0 224c-35.3 0-64-28.7-64-64s28.7-64 64-64 64 28.7 64 64-28.7 64-64 64z"
    />
  </Svg>
);

const LoginScreen = () => {
  const router = useRouter();
  const theme = useTheme();
  const { colors, isDark } = theme;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const styles = useMemo(() => makeStyles(theme), [theme]);

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

  const handleSendOtp = async () => {
    if (!phone || phone.length !== 10) {
      alert('Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);
    try {
      const data = await api.post('/auth/request-otp', { phone: '+91' + phone });

      setLoading(false);
      router.push({
        pathname: '/(auth)/verify-otp',
        params: { phone: '+91' + phone, devOtp: data.devOtp || '' },
      });
    } catch (error) {
      setLoading(false);
      alert('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        backgroundColor={colors.white}
        barStyle={isDark ? 'light-content' : 'dark-content'}
      />

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
            <View style={styles.logoCircle}>
              <ParkSwiftLogo color={colors.white} />
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
            <View style={styles.phoneContainer}>
              <View style={styles.countryCode}>
                <Text style={styles.countryFlag}>🇮🇳</Text>
                <Text style={styles.countryText}>+91</Text>
              </View>
              <View style={styles.inputDivider} />
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="Mobile number"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                maxLength={10}
                style={styles.input}
                editable={!loading}
              />
            </View>

            {/* Continue Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleSendOtp}
              disabled={loading}
              style={styles.buttonWrap}
            >
              <View style={styles.button}>
                {loading ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={styles.buttonText}>Continue</Text>
                )}
              </View>
            </TouchableOpacity>

            {/* Terms */}
            <Text style={styles.terms}>
              By continuing, you agree to our{' '}
              <Text style={styles.termsLink} onPress={() => router.push('/(auth)/terms')}>
                Terms
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

const makeStyles = ({ colors, spacing, radius, fontSize, fontWeight }: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.screenH,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing['3xl'],
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
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: BorderRadius.md,
    backgroundColor: colors.screenBg,
    height: 52,
    marginBottom: Spacing['4xl'],
  },
  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing['3xl'],
    gap: 6,
  },
  countryFlag: {
    fontSize: 18,
  },
  countryText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: colors.textSecondary,
  },
  inputDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
  },
  input: {
    flex: 1,
    height: 52,
    paddingHorizontal: Spacing['3xl'],
    fontSize: FontSize.lg,
    color: colors.textPrimary,
    fontWeight: FontWeight.medium,
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
});
