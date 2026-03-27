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
  Image,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import PrimaryButton from '../components/PrimaryButton';
import TextInputField from '../components/TextInputField';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { useAuth } from '../context/AuthContext';
import { completeProfile } from '../services/auth';
import { getProfileImageUrl } from '../utils/avatar';
import {
  isValidUsername,
  isValidEmail,
  isValidE164,
  validateProfileImage,
} from '../utils/validators';
import { ProfileImage } from '../types/auth';

const ProfileSetupScreen = ({ navigation }: any) => {
  const { user, completeAuthentication } = useAuth();
  const existingPhoto = getProfileImageUrl(user);

  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [selectedImage, setSelectedImage] = useState<ProfileImage | null>(null);
  const [loading, setLoading] = useState(false);

  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [imageError, setImageError] = useState('');

  const phoneNumber = user?.phoneNumber ?? '';

  const validateForm = (): boolean => {
    let valid = true;

    const trimmedName = displayName.trim();
    if (!isValidUsername(trimmedName)) {
      setNameError('3–50 characters: letters, numbers, and underscore only');
      valid = false;
    } else {
      setNameError('');
    }

    const trimmedEmail = email.trim();
    if (!isValidEmail(trimmedEmail)) {
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

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const wasAlreadyCompleted = user?.profileCompleted === true;

      const response = await completeProfile({
        phoneNumber,
        username: displayName.trim(),
        email: email.trim(),
        profilePhoto: selectedImage ?? undefined,
      });

      if (wasAlreadyCompleted) {
        Alert.alert(
          'Profile Already Set',
          'Profile already completed. Name/photo updates are not allowed by current backend flow.',
          [{ text: 'Continue', onPress: () => completeAuthentication(response.user) }],
        );
        return;
      }

      await completeAuthentication(response.user);
    } catch (err: any) {
      const status = err?.response?.status;

      if (status === 409) {
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

  const isFormValid =
    displayName.trim().length >= 3 &&
    email.trim().length > 0 &&
    !nameError &&
    !emailError;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
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
            disabled={loading}
          >
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>

          {/* Header */}
          <Text style={styles.title}>Set Up Your Profile</Text>
          <Text style={styles.subtitle}>
            Add your name, email and photo so others can recognize you
          </Text>

          {/* Profile photo */}
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
                  <Ionicons name="person" size={56} color={colors.primary} />
                </LinearGradient>
              )}

              <LinearGradient
                colors={[colors.gradientStart, colors.gradientEnd]}
                style={styles.cameraBadge}
              >
                <Ionicons name="camera" size={18} color="#fff" />
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

          {/* Form card */}
          <View style={styles.card}>
            <TextInputField
              label="Display Name"
              placeholder="Enter your display name"
              value={displayName}
              onChangeText={(text: string) => {
                setDisplayName(text);
                if (nameError) setNameError('');
              }}
              autoCapitalize="none"
              maxLength={50}
              editable={!loading}
              errorText={nameError}
              leftElement={
                <Ionicons name="person-outline" size={20} color={colors.textMuted} />
              }
            />

            <TextInputField
              label="Email"
              placeholder="Enter your email address"
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
                <Ionicons name="mail-outline" size={20} color={colors.textMuted} />
              }
            />

            <PrimaryButton
              title="Complete Profile"
              onPress={handleSubmit}
              disabled={!isFormValid || loading}
              loading={loading}
              style={styles.ctaButton}
            />

            <View style={styles.helperRow}>
              <Ionicons
                name="information-circle-outline"
                size={14}
                color={colors.textMuted}
              />
              <Text style={styles.helperText}>
                Profile photo is optional (max 5 MB)
              </Text>
            </View>
          </View>

          {/* Progress indicator */}
          <View style={styles.progressHint}>
            <View style={styles.progressStep}>
              <View style={[styles.progressDot, styles.progressDotDone]}>
                <Ionicons name="checkmark" size={12} color="#fff" />
              </View>
              <Text style={styles.progressLabel}>Verify</Text>
            </View>
            <View style={styles.progressLine} />
            <View style={styles.progressStep}>
              <View style={[styles.progressDot, styles.progressDotActive]}>
                <Ionicons name="person" size={12} color="#fff" />
              </View>
              <Text style={[styles.progressLabel, { color: colors.primary }]}>
                Profile
              </Text>
            </View>
            <View style={styles.progressLine} />
            <View style={styles.progressStep}>
              <View style={styles.progressDot}>
                <Ionicons name="chatbubbles" size={12} color={colors.textMuted} />
              </View>
              <Text style={styles.progressLabel}>Chat</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
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
  title: {
    fontSize: typography.fontSize2XL,
    fontWeight: typography.fontWeightExtraBold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.fontSizeMD,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xxl,
    paddingHorizontal: spacing.base,
  },

  /* ── Photo ───────────────────────────────────────── */
  photoSection: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
    gap: spacing.md,
  },
  photoWrapper: {
    position: 'relative',
  },
  photoPlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 8,
  },
  photoImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 34,
    height: 34,
    borderRadius: 17,
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
    fontSize: typography.fontSizeMD,
    fontWeight: typography.fontWeightSemiBold,
    color: colors.primary,
    textDecorationLine: 'underline',
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

  /* ── Card ─────────────────────────────────────────── */
  card: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: 28,
    padding: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 20,
    elevation: 5,
    marginBottom: spacing.xxl,
  },
  ctaButton: {
    width: '100%',
    marginTop: spacing.sm,
    marginBottom: spacing.base,
  },
  helperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  helperText: {
    fontSize: typography.fontSizeXS,
    color: colors.textMuted,
  },

  /* ── Progress ─────────────────────────────────────── */
  progressHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  progressStep: {
    alignItems: 'center',
    gap: 4,
  },
  progressDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.dotInactive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressDotDone: {
    backgroundColor: colors.success,
  },
  progressDotActive: {
    backgroundColor: colors.primary,
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: colors.border,
    minWidth: 40,
    marginBottom: 16,
  },
  progressLabel: {
    fontSize: typography.fontSizeXS,
    fontWeight: typography.fontWeightMedium,
    color: colors.textMuted,
  },
});

export default ProfileSetupScreen;
