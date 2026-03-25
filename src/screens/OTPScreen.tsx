import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PrimaryButton from '../components/PrimaryButton';
import OTPInput from '../components/OTPInput';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { OTP_LENGTH, SCREENS } from '../constants';

// Mask a phone like "+94 77 123 4567" -> "+94 7X XXX XXXX"
const maskPhone = (phone = '') => {
  if (!phone) return '+94 7X XXX XXXX';
  const digits = phone.replace(/\D/g, '');
  const last = digits.slice(-4);
  const country = phone.split(' ')[0] || '+94';
  return `${country} 7X XXX ${last}`;
};

const OTPScreen = ({ navigation, route }) => {
  const [otp, setOtp] = useState('');
  const phone = route?.params?.phone || '+94 7X XXX XXXX';

  const handleVerify = () => {
    if (otp.length === OTP_LENGTH) {
      navigation.navigate(SCREENS.PROFILE_SETUP);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back button */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
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

          {/* Verify button */}
          <PrimaryButton
            title="Verify"
            onPress={handleVerify}
            disabled={otp.length < OTP_LENGTH}
            style={styles.verifyBtn}
          />

          {/* Secondary actions */}
          <View style={styles.secondaryActions}>
            <TouchableOpacity style={styles.textAction}>
              <Ionicons name="refresh" size={15} color={colors.primary} />
              <Text style={styles.textActionLabel}>Resend code</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.textAction}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="pencil" size={15} color={colors.textSecondary} />
              <Text style={[styles.textActionLabel, { color: colors.textSecondary }]}>
                Change phone number
              </Text>
            </TouchableOpacity>
          </View>

          {/* Info note */}
          <View style={styles.noteBox}>
            <Ionicons name="information-circle" size={16} color={colors.primaryLight} />
            <Text style={styles.noteText}>
              OTP verification is bypassed in demo mode. Enter any 6 digits to continue.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundSecondary },
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
    marginBottom: spacing.xxl,
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
  noteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: '#EEF2FF',
    borderRadius: 14,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  noteText: {
    flex: 1,
    fontSize: typography.fontSizeXS,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});

export default OTPScreen;
