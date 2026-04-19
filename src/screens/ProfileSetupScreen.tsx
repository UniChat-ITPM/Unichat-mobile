import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import PrimaryButton from '../components/PrimaryButton';
import TextInputField from '../components/TextInputField';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { useAuth } from '../context/AuthContext';
import { completeProfile, updateUserById } from '../services/auth';
import { getProfileImageUrl } from '../utils/avatar';
import { toBase64DataUri } from '../utils/image';
import {
  isValidDisplayName,
  normalizeDisplayName,
  isValidEmail,
  isValidE164,
  validateProfileImage,
} from '../utils/validators';
import { ProfileImage, UpdateUserPayload } from '../types/auth';

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
          toValue: -12,
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

const ProfileSetupScreen = ({ navigation }: any) => {
  const { user, completeAuthentication } = useAuth();
  const existingPhoto = getProfileImageUrl(user);
  const isExistingUser = user?.profileCompleted === true;

  const [setupStep, setSetupStep] = useState<1 | 2>(1);
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [selectedImage, setSelectedImage] = useState<ProfileImage | null>(null);
  const [loading, setLoading] = useState(false);

  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [imageError, setImageError] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 9,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const phoneNumber = user?.phoneNumber ?? '';

  const validateForm = (): boolean => {
    let valid = true;

    const trimmedName = normalizeDisplayName(displayName);
    if (!isValidDisplayName(trimmedName)) {
      setNameError(
        '3–50 characters: letters, numbers, underscores, and spaces between names',
      );
      valid = false;
    } else {
      setNameError('');
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail.includes('@')) {
      setEmailError('Email address must include @');
      valid = false;
    } else if (!isValidEmail(trimmedEmail)) {
      setEmailError('Please enter a valid email address');
      valid = false;
    } else {
      setEmailError('');
    }

    if (!isValidE164(phoneNumber)) {
      Alert.alert('Error', 'Invalid phone number. Please go back and verify again.');
      valid = false;
    }

    return valid;
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please allow access to your photo library to select a profile picture.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const mimeType = asset.mimeType ?? 'image/jpeg';
      const fileSize = asset.fileSize ?? 0;

      if (fileSize > 0) {
        const error = validateProfileImage(mimeType, fileSize);
        if (error) {
          setImageError(error);
          return;
        }
      }

      setSelectedImage({
        uri: asset.uri,
        mimeType,
        fileName: asset.fileName ?? 'profile.jpg',
        fileSize,
      });
      setImageError('');
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImageError('');
  };

  const hasChanges = useMemo(() => {
    if (selectedImage) return true;
    const userNormName = normalizeDisplayName(user?.displayName ?? '');
    if (normalizeDisplayName(displayName) !== userNormName) return true;
    if (email.trim() !== (user?.email ?? '')) return true;
    return false;
  }, [displayName, email, selectedImage, user]);

  const handleSubmit = async () => {
    if (isExistingUser && !hasChanges) {
      await completeAuthentication(user!);
      return;
    }

    if (!validateForm()) return;

    setLoading(true);
    try {
      if (isExistingUser) {
        const payload: UpdateUserPayload = {};
        if (normalizeDisplayName(displayName) !== normalizeDisplayName(user!.displayName ?? '')) {
          payload.displayName = normalizeDisplayName(displayName);
        }
        if (email.trim() !== (user!.email ?? '')) {
          payload.email = email.trim();
        }
        if (selectedImage) {
          payload.profilePhoto = await toBase64DataUri(
            selectedImage.uri,
            selectedImage.mimeType,
          );
        }
        const response = await updateUserById(user!.id, payload);
        await completeAuthentication(response.user, response.accessToken);
      } else {
        const response = await completeProfile({
          phoneNumber,
          username: normalizeDisplayName(displayName),
          email: email.trim(),
          profilePhoto: selectedImage ?? undefined,
        });
        await completeAuthentication(response.user, response.accessToken);
      }
    } catch (err: any) {
      const status = err?.response?.status;

      if (status === 404) {
        Alert.alert('Not Found', 'User not found. Please log in again.');
      } else if (status === 409) {
        Alert.alert(
          'Already Taken',
          'Username or email is already in use. Please choose a different one.',
        );
      } else if (status === 400) {
        const msg = err?.friendlyMessage ?? 'Please check your inputs and try again.';
        Alert.alert('Validation Error', msg);
      } else if (status === 500) {
        Alert.alert(
          'Server Error',
          'Something went wrong on our end. Please try again later.',
        );
      } else {
        const msg = err?.friendlyMessage ?? 'Something went wrong. Please try again.';
        Alert.alert('Error', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const normalizedName = normalizeDisplayName(displayName);
  const step1Ready = isValidDisplayName(normalizedName) && !nameError;
  const trimmedEmailForStep = email.trim();
  const step2Ready =
    step1Ready &&
    trimmedEmailForStep.includes('@') &&
    isValidEmail(trimmedEmailForStep) &&
    !emailError;

  const handleBack = () => {
    if (setupStep === 2) {
      setSetupStep(1);
    } else {
      navigation.goBack();
    }
  };

  const handleContinueStep1 = () => {
    if (!isValidDisplayName(normalizedName)) {
      setNameError(
        '3–50 characters: letters, numbers, underscores, and spaces between names',
      );
      return;
    }
    setNameError('');
    if (!isValidE164(phoneNumber)) {
      Alert.alert('Error', 'Invalid phone number. Please go back and verify again.');
      return;
    }
    setSetupStep(2);
  };

  const headerTitle =
    setupStep === 1
      ? isExistingUser
        ? 'Your name'
        : "What's your name?"
      : isExistingUser
        ? 'Welcome Back!'
        : 'Almost there';

  const headerSubtitle =
    setupStep === 1
      ? isExistingUser
        ? 'Update how your name appears. You can use two or more names with a space.'
        : 'Enter the name others will see. Example: Dumindu Dissanayake'
      : isExistingUser
        ? 'Update your email or photo, then continue to your chats'
        : 'Add your email and optional profile photo';

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
          <View style={styles.headerTopRow}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={handleBack}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>

            <View style={styles.stepBadge}>
              <Ionicons name="sparkles" size={12} color="#fff" />
              <Text style={styles.stepBadgeText}>Step {setupStep} of 2</Text>
            </View>

            <View style={{ width: 40 }} />
          </View>

          <Animated.View
            style={[
              styles.headerTextBlock,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.stepDotsRow}>
              <View
                style={[
                  styles.stepDot,
                  styles.stepDotHeader,
                  setupStep === 1 && styles.stepDotActiveHeader,
                ]}
              />
              <View
                style={[
                  styles.stepDot,
                  styles.stepDotHeader,
                  setupStep === 2 && styles.stepDotActiveHeader,
                ]}
              />
            </View>
            <Text style={styles.title}>{headerTitle}</Text>
            <Text style={styles.subtitle}>{headerSubtitle}</Text>
          </Animated.View>
        </SafeAreaView>
      </LinearGradient>

      <KeyboardAvoidingView
        style={styles.bottomSection}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <Animated.View
            style={[
              styles.card,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {setupStep === 2 ? (
              <View style={styles.photoSection}>
                <TouchableOpacity
                  style={styles.photoWrapper}
                  activeOpacity={0.85}
                  onPress={handlePickImage}
                  disabled={loading}
                >
                  {selectedImage ? (
                    <Image source={{ uri: selectedImage.uri }} style={styles.photoImage} />
                  ) : existingPhoto ? (
                    <Image source={{ uri: existingPhoto }} style={styles.photoImage} />
                  ) : (
                    <LinearGradient
                      colors={['#C7D2FE', '#DDD6FE']}
                      style={styles.photoPlaceholder}
                    >
                      <Ionicons name="person" size={48} color={colors.primary} />
                    </LinearGradient>
                  )}

                  <LinearGradient
                    colors={[colors.gradientStart, colors.gradientEnd]}
                    style={styles.cameraBadge}
                  >
                    <Ionicons name="camera" size={16} color="#fff" />
                  </LinearGradient>
                </TouchableOpacity>

                {selectedImage ? (
                  <TouchableOpacity
                    style={styles.photoActionButton}
                    onPress={handleRemoveImage}
                    disabled={loading}
                  >
                    <Text style={[styles.photoActionText, { color: colors.error }]}>
                      Remove Photo
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.photoActionButton}
                    onPress={handlePickImage}
                    disabled={loading}
                  >
                    <Text style={styles.photoActionText}>
                      {existingPhoto ? 'Change Profile Photo' : 'Add Profile Photo'}
                    </Text>
                  </TouchableOpacity>
                )}

                {imageError ? (
                  <View style={styles.inlineError}>
                    <Ionicons name="alert-circle" size={14} color={colors.error} />
                    <Text style={styles.inlineErrorText}>{imageError}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {setupStep === 1 ? (
              <>
                <Text style={styles.fieldLabel}>Full Name</Text>
                <TextInputField
                  placeholder="e.g. Dumindu Dissanayake"
                  value={displayName}
                  onChangeText={(text: string) => {
                    setDisplayName(text);
                    if (nameError) setNameError('');
                  }}
                  autoCapitalize="words"
                  maxLength={50}
                  editable={!loading}
                  errorText={nameError}
                  leftElement={
                    <Ionicons name="person-outline" size={20} color={colors.primary} />
                  }
                />

                <View style={styles.helperRow}>
                  <View style={styles.helperIconWrap}>
                    <Ionicons name="shield-checkmark" size={13} color={colors.primary} />
                  </View>
                  <Text style={styles.helperText}>
                    Use 3–50 characters. Letters, numbers, and spaces only.
                  </Text>
                </View>

                <PrimaryButton
                  title="Continue"
                  onPress={handleContinueStep1}
                  disabled={!step1Ready || loading}
                  loading={false}
                  style={styles.ctaButton}
                />
              </>
            ) : (
              <>
                <Text style={styles.fieldLabel}>Email Address</Text>
                <TextInputField
                  placeholder="you@example.com"
                  value={email}
                  onChangeText={(text: string) => {
                    setEmail(text);
                    if (emailError) setEmailError('');
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  maxLength={254}
                  editable={!loading}
                  errorText={emailError}
                  leftElement={
                    <Ionicons name="mail-outline" size={20} color={colors.primary} />
                  }
                />

                <View style={styles.helperRow}>
                  <View style={styles.helperIconWrap}>
                    <Ionicons
                      name="information-circle"
                      size={13}
                      color={colors.primary}
                    />
                  </View>
                  <Text style={styles.helperText}>
                    Profile photo is optional (max 5 MB)
                  </Text>
                </View>

                <PrimaryButton
                  title={
                    isExistingUser
                      ? hasChanges
                        ? 'Save & Continue'
                        : 'Continue'
                      : 'Complete Profile'
                  }
                  onPress={handleSubmit}
                  disabled={!step2Ready || loading}
                  loading={loading}
                  style={styles.ctaButton}
                />
              </>
            )}
          </Animated.View>

          <View style={styles.progressHint}>
            <View style={styles.progressStep}>
              <View style={[styles.progressDot, styles.progressDotDone]}>
                <Ionicons name="checkmark" size={13} color="#fff" />
              </View>
              <Text style={styles.progressLabel}>Verify</Text>
            </View>
            <View style={styles.progressLine} />
            <View style={styles.progressStep}>
              <View style={[styles.progressDot, styles.progressDotActive]}>
                <Ionicons name="person" size={13} color="#fff" />
              </View>
              <Text style={[styles.progressLabel, { color: colors.primary }]}>
                Profile
              </Text>
            </View>
            <View style={styles.progressLine} />
            <View style={styles.progressStep}>
              <View style={styles.progressDot}>
                <Ionicons name="chatbubbles" size={13} color={colors.textMuted} />
              </View>
              <Text style={styles.progressLabel}>Chat</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerGradient: {
    paddingBottom: spacing.xxxl + spacing.xl,
    overflow: 'hidden',
  },
  headerContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  stepBadgeText: {
    color: '#fff',
    fontSize: typography.fontSizeXS,
    fontWeight: typography.fontWeightSemiBold,
    letterSpacing: typography.letterSpacingWide,
  },
  headerTextBlock: {
    alignItems: 'center',
    paddingHorizontal: spacing.base,
  },
  stepDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stepDotHeader: {
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  stepDotActiveHeader: {
    backgroundColor: '#fff',
    width: 24,
    borderRadius: 4,
  },
  title: {
    fontSize: typography.fontSize2XL,
    fontWeight: typography.fontWeightExtraBold,
    color: '#fff',
    textAlign: 'center',
    letterSpacing: typography.letterSpacingTight,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.fontSizeSM,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    lineHeight: 20,
  },

  /* ── Bottom section ──────────────────────── */
  bottomSection: {
    flex: 1,
    marginTop: -(spacing.xxl + spacing.sm),
  },
  scrollView: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: 28,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 30,
    elevation: 10,
    marginBottom: spacing.xl,
  },
  fieldLabel: {
    fontSize: typography.fontSizeSM,
    fontWeight: typography.fontWeightSemiBold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    letterSpacing: typography.letterSpacingWide,
  },

  /* ── Photo ─────────────────────────────────── */
  photoSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  photoWrapper: {
    position: 'relative',
  },
  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 8,
  },
  photoImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: colors.background,
  },
  photoActionButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  photoActionText: {
    fontSize: typography.fontSizeSM,
    fontWeight: typography.fontWeightSemiBold,
    color: colors.primary,
  },
  inlineError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  inlineErrorText: {
    fontSize: typography.fontSizeXS,
    color: colors.error,
  },

  /* ── Helper / CTA ──────────────────────────── */
  helperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
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
  ctaButton: { width: '100%' },

  /* ── Progress ──────────────────────────────── */
  progressHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  progressStep: {
    alignItems: 'center',
    gap: 4,
  },
  progressDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.dotInactive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressDotDone: {
    backgroundColor: colors.success,
  },
  progressDotActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: colors.border,
    minWidth: 30,
    marginBottom: 16,
  },
  progressLabel: {
    fontSize: typography.fontSizeXS,
    fontWeight: typography.fontWeightMedium,
    color: colors.textMuted,
  },
});

export default ProfileSetupScreen;
