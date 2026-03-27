import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import PrimaryButton from '../components/PrimaryButton';
import OnboardingPagination from '../components/OnboardingPagination';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { SCREENS } from '../constants';

const { width } = Dimensions.get('window');

const ConversionDemo = () => (
  <View style={styles.conversionDemo}>
    {/* Singlish input bubble */}
    <View style={styles.bubbleRow}>
      <View style={styles.avatarSmall}>
        <Text style={{ fontSize: 16 }}>👤</Text>
      </View>
      <View style={styles.singlishBubble}>
        <Text style={styles.singlishLabel}>You type</Text>
        <Text style={styles.singlishText}>kohomada machan?</Text>
      </View>
    </View>

    {/* Arrow */}
    <View style={styles.arrowRow}>
      <View style={styles.arrowLine} />
      <Ionicons name="arrow-down-circle" size={28} color={colors.primary} />
      <Text style={styles.arrowLabel}>AI converts instantly</Text>
    </View>

    {/* Sinhala output bubble */}
    <View style={[styles.bubbleRow, { justifyContent: 'flex-end' }]}>
      <View style={styles.sinhalaBubble}>
        <Text style={styles.sinhalaLabel}>Sent as</Text>
        <Text style={styles.sinhalaText}>කොහොමද මචං?</Text>
      </View>
    </View>
  </View>
);

const Onboarding2Screen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Skip button */}
        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => navigation.navigate(SCREENS.LOGIN)}
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>

        {/* Illustration area */}
        <View style={styles.illustrationContainer}>
          <LinearGradient
            colors={['#F5F3FF', '#EDE9FE']}
            style={styles.illustrationBg}
          >
            <View style={styles.decorCircle} />
            <View style={styles.badgeRow}>
              <LinearGradient
                colors={[colors.gradientStart, colors.gradientEnd]}
                style={styles.badge}
              >
                <Ionicons name="language" size={22} color="#fff" />
                <Text style={styles.badgeText}>Singlish → සිංහල</Text>
              </LinearGradient>
            </View>
            <ConversionDemo />
          </LinearGradient>
        </View>

        {/* Text content */}
        <View style={styles.textContent}>
          <Text style={styles.title}>
            Type in Singlish,{'\n'}Send in Sinhala
          </Text>
          <Text style={styles.subtitle}>
            Your messages are instantly converted to Sinhala Unicode in real
            time — no extra effort needed.
          </Text>
        </View>

        {/* Bottom section */}
        <View style={styles.bottom}>
          <OnboardingPagination total={3} current={1} />
          <View style={styles.navButtons}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={20} color={colors.primary} />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
            <PrimaryButton
              title="Next  →"
              onPress={() => navigation.navigate(SCREENS.ONBOARDING_3)}
              style={styles.nextButton}
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
  },
  skipButton: {
    alignSelf: 'flex-end',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    marginTop: spacing.md,
  },
  skipText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizeMD,
    fontWeight: typography.fontWeightMedium,
  },
  illustrationContainer: {
    flex: 1,
    marginTop: spacing.base,
    marginBottom: spacing.xl,
  },
  illustrationBg: {
    flex: 1,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  decorCircle: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#C4B5FD',
    opacity: 0.2,
    top: -60,
    right: -60,
  },
  badgeRow: {
    marginBottom: spacing.base,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: 20,
  },
  badgeText: {
    color: '#fff',
    fontWeight: typography.fontWeightBold,
    fontSize: typography.fontSizeMD,
    letterSpacing: 0.5,
  },
  // Conversion demo styles
  conversionDemo: {
    width: '100%',
    gap: spacing.sm,
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  avatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  singlishBubble: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    flex: 1,
  },
  singlishLabel: {
    fontSize: typography.fontSizeXS,
    color: colors.textMuted,
    marginBottom: 2,
  },
  singlishText: {
    fontSize: typography.fontSizeMD,
    color: colors.textPrimary,
    fontWeight: typography.fontWeightMedium,
  },
  arrowRow: {
    alignItems: 'center',
    gap: 4,
  },
  arrowLine: {
    width: 1,
    height: 8,
    backgroundColor: colors.dotInactive,
  },
  arrowLabel: {
    fontSize: typography.fontSizeXS,
    color: colors.textSecondary,
    fontWeight: typography.fontWeightMedium,
  },
  sinhalaBubble: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    borderBottomRightRadius: 4,
    padding: spacing.md,
    maxWidth: '75%',
  },
  sinhalaLabel: {
    fontSize: typography.fontSizeXS,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 2,
  },
  sinhalaText: {
    fontSize: typography.fontSizeLG,
    color: '#fff',
    fontWeight: typography.fontWeightBold,
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
  nextButton: { flex: 1 },
});

export default Onboarding2Screen;
