import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import PrimaryButton from '../components/PrimaryButton';
import OnboardingPagination from '../components/OnboardingPagination';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { SCREENS } from '../constants';

const { width, height } = Dimensions.get('window');

const Onboarding1Screen = ({ navigation }) => {
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
            colors={['#EEF2FF', '#F5F3FF']}
            style={styles.illustrationBg}
          >
            {/* Decorative circles */}
            <View style={styles.decorCircleLarge} />
            <View style={styles.decorCircleSmall} />

            {/* Central icon group */}
            <View style={styles.iconCluster}>
              <View style={styles.mainIconWrapper}>
                <LinearGradient
                  colors={[colors.gradientStart, colors.gradientEnd]}
                  style={styles.mainIcon}
                >
                  <Ionicons name="chatbubbles" size={52} color="#fff" />
                </LinearGradient>
              </View>

              {/* Floating chips */}
              <View style={[styles.chip, styles.chipTopLeft]}>
                <Ionicons name="people" size={14} color={colors.primary} />
                <Text style={styles.chipText}>Campus</Text>
              </View>
              <View style={[styles.chip, styles.chipTopRight]}>
                <Ionicons name="star" size={14} color={colors.secondary} />
                <Text style={styles.chipText}>Groups</Text>
              </View>
              <View style={[styles.chip, styles.chipBottom]}>
                <Ionicons name="globe" size={14} color={colors.primary} />
                <Text style={styles.chipText}>Connect</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Text content */}
        <View style={styles.textContent}>
          <Text style={styles.title}>Connect Your{'\n'}Campus</Text>
          <Text style={styles.subtitle}>
            Chat with friends, classmates, and communities — all in one place.
          </Text>
        </View>

        {/* Bottom section */}
        <View style={styles.bottom}>
          <OnboardingPagination total={3} current={0} />
          <PrimaryButton
            title="Next  →"
            onPress={() => navigation.navigate(SCREENS.ONBOARDING_2)}
            style={styles.nextButton}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
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
  },
  decorCircleLarge: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#C7D2FE',
    opacity: 0.3,
    top: -40,
    right: -40,
  },
  decorCircleSmall: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#DDD6FE',
    opacity: 0.4,
    bottom: -20,
    left: -20,
  },
  iconCluster: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainIconWrapper: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  mainIcon: {
    width: 120,
    height: 120,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  chipTopLeft: { top: -36, left: -20 },
  chipTopRight: { top: -36, right: -20 },
  chipBottom: { bottom: -36 },
  chipText: {
    fontSize: typography.fontSizeXS,
    fontWeight: typography.fontWeightSemiBold,
    color: colors.textPrimary,
  },
  textContent: {
    marginBottom: spacing.xxl,
  },
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
  bottom: {
    gap: spacing.xl,
  },
  nextButton: {
    width: '100%',
  },
});

export default Onboarding1Screen;
