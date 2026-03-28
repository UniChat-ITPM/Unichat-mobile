import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import PrimaryButton from '../components/PrimaryButton';
import TextInputField from '../components/TextInputField';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { APP_NAME, DEFAULT_COUNTRY_CODE, DEFAULT_COUNTRY_FLAG, SCREENS } from '../constants';
import { requestOtp } from '../services/auth';
import { toE164, isValidE164 } from '../utils/validators';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const FloatingOrb = ({
  size,
  top,
  left,
  delay,
  opacity,
}: {
  size: number;
  top: number;
  left: number;
  delay: number;
  opacity: number;
}) => {
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: -14,
          duration: 2800,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 2800,
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [translateY, delay]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top,
        left,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: `rgba(255, 255, 255, ${opacity})`,
        transform: [{ translateY }],
      }}
    />
  );
};

const LoginScreen = ({ navigation }: any) => {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const logoScale = useRef(new Animated.Value(0.6)).current;
  const focusAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 9,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 60,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, logoScale]);

  useEffect(() => {
    Animated.spring(focusAnim, {
      toValue: isFocused ? 1 : 0,
      tension: 60,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [isFocused, focusAnim]);

  const cardFocusTranslateY = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -120],
  });

  const logoTransX = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SCREEN_WIDTH / 2 - 80],
  });

  const logoTransY = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -40],
  });

  const activeLogoScale = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.5],
  });

  const combinedScale = Animated.multiply(logoScale, activeLogoScale);

  const fullNumber = toE164(phone, DEFAULT_COUNTRY_CODE);
  const isPhoneValid = phone.trim().length >= 7 && isValidE164(fullNumber);

  const handleSendOTP = async () => {
    setError('');

    if (!isPhoneValid) {
      setError('Please enter a valid phone number.');
      return;
    }

    setLoading(true);
    try {
      await requestOtp(fullNumber);
      navigation.navigate(SCREENS.OTP, { phone: fullNumber });
    } catch (err: any) {
      const message = err.friendlyMessage ?? 'Failed to send OTP. Please try again.';
      setError(message);
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[colors.gradientStart, colors.secondary, colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <FloatingOrb size={120} top={-20} left={-30} delay={0} opacity={0.07} />
        <FloatingOrb size={80} top={40} left={SCREEN_WIDTH * 0.65} delay={400} opacity={0.09} />
        <FloatingOrb size={50} top={100} left={SCREEN_WIDTH * 0.2} delay={800} opacity={0.06} />
        <FloatingOrb size={65} top={10} left={SCREEN_WIDTH * 0.45} delay={200} opacity={0.05} />

        <SafeAreaView style={styles.headerContent}>
          <Animated.View
            style={[
              styles.logoArea,
              { 
                opacity: fadeAnim,
                transform: [
                  { translateY: logoTransY },
                  { translateX: logoTransX },
                  { scale: combinedScale }
                ],
              },
            ]}
          >
            <View style={styles.logoBox}>
              <Ionicons name="chatbubbles" size={34} color="#fff" />
            </View>
            <Text style={styles.appName}>{APP_NAME}</Text>
            <Text style={styles.tagline}>Your Campus. Connected.</Text>
          </Animated.View>
        </SafeAreaView>
      </LinearGradient>

      {Platform.OS === 'ios' ? (
        <KeyboardAvoidingView
          style={[styles.bottomSection, { zIndex: 10 }]}
          behavior="padding"
          keyboardVerticalOffset={0}
        >
          <Animated.View style={{ flex: 1, transform: [{ translateY: cardFocusTranslateY }] }}>
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scroll}
              keyboardShouldPersistTaps="always"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
              overScrollMode="never"
              bounces={false}
            >
              <Animated.View
                style={[
                  styles.card,
                  {
                    opacity: fadeAnim,
                    transform: [
                      { translateY: slideAnim }
                    ],
                  },
                ]}
              >
                <LoginFormCardBody
                  phone={phone}
                  setPhone={setPhone}
                  error={error}
                  setError={setError}
                  loading={loading}
                  isPhoneValid={isPhoneValid}
                  handleSendOTP={handleSendOTP}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                />
              </Animated.View>
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      ) : (
        <View style={[styles.bottomSection, { zIndex: 10 }]}>
          <Animated.View style={{ flex: 1, transform: [{ translateY: cardFocusTranslateY }] }}>
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scroll}
              keyboardShouldPersistTaps="always"
              keyboardDismissMode="none"
              showsVerticalScrollIndicator={false}
              overScrollMode="never"
              bounces={false}
            >
              <Animated.View 
                style={[
                  styles.card,
                  {
                    opacity: fadeAnim,
                    transform: [
                      { translateY: slideAnim }
                    ],
                  },
                ]}
              >
                <LoginFormCardBody
                  phone={phone}
                  setPhone={setPhone}
                  error={error}
                  setError={setError}
                  loading={loading}
                  isPhoneValid={isPhoneValid}
                  handleSendOTP={handleSendOTP}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                />
              </Animated.View>
            </ScrollView>
          </Animated.View>
        </View>
      )}
    </View>
  );
};

type LoginFormProps = {
  phone: string;
  setPhone: (v: string) => void;
  error: string;
  setError: (v: string) => void;
  loading: boolean;
  isPhoneValid: boolean;
  handleSendOTP: () => void | Promise<void>;
  onFocus: () => void;
  onBlur: () => void;
};

function LoginFormCardBody({
  phone,
  setPhone,
  error,
  setError,
  loading,
  isPhoneValid,
  handleSendOTP,
  onFocus,
  onBlur,
}: LoginFormProps) {
  return (
    <>
      <Text style={styles.title}>Welcome Back</Text>
      <Text style={styles.subtitle}>
        Enter your phone number to get started
      </Text>

      <View style={styles.divider} />

      <Text style={styles.fieldLabel}>Phone Number</Text>
      <View style={styles.phoneRow}>
        <View style={styles.countryBadge}>
          <Text style={styles.countryFlag}>{DEFAULT_COUNTRY_FLAG}</Text>
          <Text style={styles.countryCode}>{DEFAULT_COUNTRY_CODE}</Text>
          <Ionicons
            name="chevron-down"
            size={12}
            color={colors.primary}
            style={{ marginLeft: 2 }}
          />
        </View>

        <View style={styles.phoneSeparator} />

        <View style={styles.phoneInputWrapper}>
          <TextInputField
            placeholder="7X XXX XXXX"
            value={phone}
            onChangeText={(text: string) => {
              setPhone(text);
              if (error) setError('');
            }}
            keyboardType="phone-pad"
            maxLength={10}
            style={styles.phoneInput}
            inputWrapperStyle={styles.phoneInputInner}
            errorText={error}
            errorSlotMinHeight={
              Platform.OS === 'android'
                ? typography.fontSizeXS + spacing.xs + spacing.sm + 6
                : undefined
            }
            editable={!loading}
            onFocus={onFocus}
            onBlur={onBlur}
          />
        </View>
      </View>

      <View style={styles.helperRow}>
        <View style={styles.helperIconWrap}>
          <Ionicons name="shield-checkmark" size={13} color={colors.primary} />
        </View>
        <Text style={styles.helperText}>
          We'll send a secure verification code via SMS
        </Text>
      </View>

      <PrimaryButton
        title="Continue"
        onPress={handleSendOTP}
        disabled={!isPhoneValid || loading}
        loading={loading}
        style={styles.ctaButton}
      />

      <Text style={styles.terms}>
        By continuing, you agree to our{' '}
        <Text style={styles.termsLink}>Terms of Service</Text>
        {' and '}
        <Text style={styles.termsLink}>Privacy Policy</Text>
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
    backgroundColor: colors.background,
  },
  headerGradient: {
    paddingBottom: spacing.xxxl + spacing.lg,
    overflow: 'hidden',
  },
  headerContent: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
  },
  logoArea: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  appName: {
    fontSize: typography.fontSize3XL,
    fontWeight: typography.fontWeightExtraBold,
    color: '#FFFFFF',
    letterSpacing: typography.letterSpacingTight,
    marginTop: spacing.xs,
  },
  tagline: {
    fontSize: typography.fontSizeSM,
    fontWeight: typography.fontWeightMedium,
    color: 'rgba(255, 255, 255, 0.75)',
    letterSpacing: typography.letterSpacingWide,
  },
  bottomSection: {
    flex: 1,
    minHeight: 0,
    marginTop: -(spacing.xxl + spacing.sm),
    zIndex: 10,
  },
  scrollView: {
    flex: 1,
    minHeight: 0,
    overflow: 'visible',
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: 28,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 30,
    elevation: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: typography.fontWeightExtraBold,
    color: colors.textPrimary,
    letterSpacing: typography.letterSpacingTight,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.fontSizeMD,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
    opacity: 0.6,
  },
  fieldLabel: {
    fontSize: typography.fontSizeSM,
    fontWeight: typography.fontWeightSemiBold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    letterSpacing: typography.letterSpacingWide,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingLeft: spacing.md,
    marginBottom: spacing.sm,
  },
  countryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    height: 56,
    paddingRight: spacing.sm,
  },
  countryFlag: { fontSize: 20 },
  countryCode: {
    fontSize: typography.fontSizeMD,
    fontWeight: typography.fontWeightSemiBold,
    color: colors.textPrimary,
  },
  phoneSeparator: {
    width: 1.5,
    height: 28,
    backgroundColor: colors.border,
    alignSelf: 'center',
  },
  phoneInputWrapper: { flex: 1 },
  phoneInput: { marginBottom: 0 },
  phoneInputInner: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderRadius: 0,
    paddingHorizontal: spacing.md,
    minHeight: 56,
  },
  helperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.xs,
  },
  helperIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: `${colors.primary}14`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helperText: {
    fontSize: typography.fontSizeXS,
    color: colors.textMuted,
    flex: 1,
    lineHeight: 16,
  },
  ctaButton: { width: '100%', marginBottom: spacing.lg },
  terms: {
    textAlign: 'center',
    fontSize: typography.fontSizeXS,
    color: colors.textMuted,
    lineHeight: 18,
    paddingHorizontal: spacing.sm,
  },
  termsLink: {
    color: colors.primary,
    fontWeight: typography.fontWeightSemiBold,
  },
});

export default LoginScreen;
