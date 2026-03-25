import React, { useState } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import PrimaryButton from '../components/PrimaryButton';
import TextInputField from '../components/TextInputField';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { APP_NAME, DEFAULT_COUNTRY_CODE, DEFAULT_COUNTRY_FLAG, SCREENS } from '../constants';

const LoginScreen = ({ navigation }) => {
  const [phone, setPhone] = useState('');

  const handleSendOTP = () => {
    if (phone.trim().length > 0) {
      navigation.navigate(SCREENS.OTP, { phone: `${DEFAULT_COUNTRY_CODE} ${phone}` });
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
          {/* Logo area */}
          <View style={styles.logoArea}>
            <LinearGradient
              colors={[colors.gradientStart, colors.gradientEnd]}
              style={styles.logoBox}
            >
              <Ionicons name="chatbubbles" size={38} color="#fff" />
            </LinearGradient>
            <Text style={styles.appName}>{APP_NAME}</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.title}>Welcome Back 👋</Text>
            <Text style={styles.subtitle}>
              Enter your phone number to continue
            </Text>

            {/* Country code + Phone input */}
            <Text style={styles.fieldLabel}>PHONE NUMBER</Text>
            <View style={styles.phoneRow}>
              {/* Country code badge */}
              <View style={styles.countryBadge}>
                <Text style={styles.countryFlag}>{DEFAULT_COUNTRY_FLAG}</Text>
                <Text style={styles.countryCode}>{DEFAULT_COUNTRY_CODE}</Text>
                <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
              </View>

              {/* Phone input */}
              <View style={styles.phoneInputWrapper}>
                <TextInputField
                  placeholder="7X XXX XXXX"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  maxLength={10}
                  style={styles.phoneInput}
                />
              </View>
            </View>

            {/* Helper text */}
            <View style={styles.helperRow}>
              <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
              <Text style={styles.helperText}>
                We'll send a verification code to your phone
              </Text>
            </View>

            {/* CTA */}
            <PrimaryButton
              title="Send OTP"
              onPress={handleSendOTP}
              disabled={phone.trim().length < 7}
              style={styles.ctaButton}
            />
          </View>

          {/* Terms */}
          <Text style={styles.terms}>
            By continuing, you agree to UniChat's{' '}
            <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundSecondary },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
    gap: spacing.md,
  },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 10,
  },
  appName: {
    fontSize: typography.fontSize2XL,
    fontWeight: typography.fontWeightExtraBold,
    color: colors.textPrimary,
    letterSpacing: typography.letterSpacingTight,
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: 28,
    padding: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: typography.fontSize2XL,
    fontWeight: typography.fontWeightBold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.fontSizeMD,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  fieldLabel: {
    fontSize: typography.fontSizeXS,
    fontWeight: typography.fontWeightSemiBold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    letterSpacing: typography.letterSpacingWidest,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  countryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 56,
  },
  countryFlag: { fontSize: 20 },
  countryCode: {
    fontSize: typography.fontSizeMD,
    fontWeight: typography.fontWeightSemiBold,
    color: colors.textPrimary,
  },
  phoneInputWrapper: { flex: 1 },
  phoneInput: { marginBottom: 0 },
  helperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xl,
  },
  helperText: {
    fontSize: typography.fontSizeXS,
    color: colors.textMuted,
    flex: 1,
    lineHeight: 18,
  },
  ctaButton: { width: '100%' },
  terms: {
    textAlign: 'center',
    fontSize: typography.fontSizeXS,
    color: colors.textMuted,
    lineHeight: 18,
    paddingHorizontal: spacing.base,
  },
  termsLink: {
    color: colors.primary,
    fontWeight: typography.fontWeightMedium,
  },
});

export default LoginScreen;
