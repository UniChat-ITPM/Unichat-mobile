import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import PrimaryButton from '../components/PrimaryButton';
import OnboardingPagination from '../components/OnboardingPagination';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { SCREENS } from '../constants';

const FeatureCard = ({ icon, color, label }) => (
  <View style={styles.featureCard}>
    <View style={[styles.featureIcon, { backgroundColor: color + '22' }]}>
      <Ionicons name={icon} size={24} color={color} />
    </View>
    <Text style={styles.featureLabel}>{label}</Text>
  </View>
);

const Onboarding3Screen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Illustration area */}
        <View style={styles.illustrationContainer}>
          <LinearGradient
            colors={['#EEF2FF', '#F5F3FF']}
            style={styles.illustrationBg}
          >
            <View style={styles.decorCircle1} />
            <View style={styles.decorCircle2} />

            {/* Central community icon */}
            <View style={styles.centerGroup}>
              <LinearGradient
                colors={[colors.gradientStart, colors.gradientEnd]}
                style={styles.centreIcon}
              >
                <Ionicons name="people-circle" size={56} color="#fff" />
              </LinearGradient>
              <Text style={styles.centreLabel}>Your Community</Text>
            </View>

            {/* Feature cards row */}
            <View style={styles.featureRow}>
              <FeatureCard icon="megaphone" color={colors.primary} label="Announcements" />
              <FeatureCard icon="layers" color={colors.secondary} label="Groups" />
              <FeatureCard icon="share-social" color="#0EA5E9" label="Share" />
            </View>
          </LinearGradient>
        </View>

        {/* Text content */}
        <View style={styles.textContent}>
          <Text style={styles.title}>
            Build Your Student{'\n'}Community
          </Text>
          <Text style={styles.subtitle}>
            Create groups, share updates, and stay connected with your
            university circle.
          </Text>
        </View>

        {/* Bottom section */}
        <View style={styles.bottom}>
          <OnboardingPagination total={3} current={2} />

          <View style={styles.navButtons}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={20} color={colors.primary} />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
            <PrimaryButton
              title="Get Started"
              onPress={() => navigation.navigate(SCREENS.LOGIN)}
              style={styles.ctaButton}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
  },
  illustrationContainer: {
    flex: 1,
    marginBottom: spacing.xl,
  },
  illustrationBg: {
    flex: 1,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    gap: spacing.xl,
    paddingVertical: spacing.xl,
  },
  decorCircle1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#C7D2FE',
    opacity: 0.3,
    top: -60,
    left: -60,
  },
  decorCircle2: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#DDD6FE',
    opacity: 0.3,
    bottom: -40,
    right: -30,
  },
  centerGroup: {
    alignItems: 'center',
    gap: spacing.md,
  },
  centreIcon: {
    width: 120,
    height: 120,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  centreLabel: {
    fontSize: typography.fontSizeMD,
    fontWeight: typography.fontWeightBold,
    color: colors.primary,
    letterSpacing: 0.5,
  },
  featureRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.base,
  },
  featureCard: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureLabel: {
    fontSize: typography.fontSizeXS,
    fontWeight: typography.fontWeightSemiBold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  textContent: { marginBottom: spacing.xxl },
  title: {
    fontSize: typography.fontSize3XL,
    fontWeight: typography.fontWeightExtraBold,
    color: colors.textPrimary,
    letterSpacing: typography.letterSpacingTight,
    lineHeight: 38,
    marginBottom: spacing.base,
  },
  subtitle: {
    fontSize: typography.fontSizeMD,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  bottom: { gap: spacing.xl },
  navButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.base,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  backText: {
    color: colors.primary,
    fontWeight: typography.fontWeightSemiBold,
    fontSize: typography.fontSizeMD,
  },
  ctaButton: { flex: 1 },
});

export default Onboarding3Screen;
