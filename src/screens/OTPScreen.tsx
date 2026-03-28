import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import PrimaryButton from '../components/PrimaryButton';
import OTPInput from '../components/OTPInput';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { OTP_LENGTH, SCREENS } from '../constants';
import { useAuth } from '../context/AuthContext';
import { requestOtp } from '../services/auth';
import { isValidOtp } from '../utils/validators';

/** Mask phone for display: "+94771234567" → "+94 *** *** 4567" */
const maskPhone = (phone: string) => {
  if (!phone || phone.length < 8) return phone;
  const last4 = phone.slice(-4);
  const countryCode = phone.slice(0, phone.length - 9);
  return `${countryCode} *** *** ${last4}`;
};

const OTPScreen = ({ navigation, route }: any) => {
  const { loginWithOtp } = useAuth();

  const phone: string = route?.params?.phone ?? '';
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');

  const isOtpReady = isValidOtp(otp);

  const handleVerify = async () => {
    setError('');

    if (!isOtpReady) {
      setError('Please enter a valid 6-digit code.');
      return;
    }

    setLoading(true);
    try {
      await loginWithOtp(phone, otp);
      navigation.replace(SCREENS.PROFILE_SETUP);
    } catch (err: any) {
      const message = err?.friendlyMessage ?? err?.message ?? 'Verification failed. Please try again.';
      setError(message);
      Alert.alert('Verification Failed', message);
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resending) return;
    setResending(true);
    setError('');
    try {
      await requestOtp(phone);
      Alert.alert('Code Sent', 'A new verification code has been sent to your phone.');
    } catch (err: any) {
      const message = err.friendlyMessage ?? 'Failed to resend code.';
      Alert.alert('Error', message);
    } finally {
      setResending(false);
    }
  };

  const scrollContent = (
    <>
          {/* Back button */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>

          {/* Header icon */}
          <View style={styles.iconCircle}>
            <Ionicons name="shield-checkmark" size={36} color={colors.primary} />
          </View>

          <Text style={styles.title}>Verify Your Number</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit code sent to
          </Text>
          <View style={styles.phonePill}>
            <Ionicons name="call" size={14} color={colors.primary} />
            <Text style={styles.phonePillText}>{maskPhone(phone)}</Text>
          </View>

          {/* OTP boxes */}
          <View style={styles.otpSection}>
            <OTPInput value={otp} onChange={setOtp} length={OTP_LENGTH} />
          </View>

          {/* Error message */}
          {error ? (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle" size={16} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Verify button */}
          <PrimaryButton
            title="Verify"
            onPress={handleVerify}
            disabled={!isOtpReady || loading}
            loading={loading}
            style={styles.verifyBtn}
          />

          {/* Secondary actions */}
          <View style={styles.secondaryActions}>
            <TouchableOpacity
              style={styles.textAction}
              onPress={handleResend}
              disabled={resending || loading}
            >
              <Ionicons name="refresh" size={15} color={resending ? colors.textMuted : colors.primary} />
              <Text style={[styles.textActionLabel, resending && { color: colors.textMuted }]}>
                {resending ? 'Sending…' : 'Resend code'}
              </Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.textAction}
              onPress={() => navigation.goBack()}
              disabled={loading}
            >
              <Ionicons name="pencil" size={15} color={colors.textSecondary} />
              <Text style={[styles.textActionLabel, { color: colors.textSecondary }]}>
                Change phone number
              </Text>
            </TouchableOpacity>
          </View>
    </>
  );

  return (
    <SafeAreaView style={styles.safe}>
      {Platform.OS === 'ios' ? (
        <KeyboardAvoidingView style={styles.keyboardWrap} behavior="padding">
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            {scrollContent}
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.keyboardWrap}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="none"
            showsVerticalScrollIndicator={false}
            overScrollMode="never"
          >
            {scrollContent}
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, minHeight: 0, backgroundColor: colors.backgroundSecondary },
  keyboardWrap: { flex: 1, minHeight: 0 },
  scrollView: { flex: 1, minHeight: 0 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  backBtn: {
    alignSelf: 'flex-start',
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 4,
  },
  title: {
    fontSize: typography.fontSize2XL,
    fontWeight: typography.fontWeightExtraBold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.fontSizeMD,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  phonePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#EEF2FF',
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.xxxl,
  },
  phonePillText: {
    fontSize: typography.fontSizeMD,
    fontWeight: typography.fontWeightBold,
    color: colors.primary,
    letterSpacing: 0.5,
  },
  otpSection: {
    width: '100%',
    marginBottom: spacing.xl,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.base,
    paddingHorizontal: spacing.sm,
  },
  errorText: {
    fontSize: typography.fontSizeSM,
    color: colors.error,
    flex: 1,
  },
  verifyBtn: {
    width: '100%',
    marginBottom: spacing.xl,
  },
  secondaryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
    marginBottom: spacing.xl,
  },
  textAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  textActionLabel: {
    fontSize: typography.fontSizeSM,
    fontWeight: typography.fontWeightSemiBold,
    color: colors.primary,
  },
  divider: {
    width: 1,
    height: 16,
    backgroundColor: colors.border,
  },
});

export default OTPScreen;
