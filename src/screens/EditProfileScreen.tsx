import React, { useState, useMemo } from 'react';
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
import { updateUserById } from '../services/auth';
import { getProfileImageUrl } from '../utils/avatar';
import { toBase64DataUri } from '../utils/image';
import {
  isValidUsername,
  isValidEmail,
  validateProfileImage,
} from '../utils/validators';
import { ProfileImage, UpdateUserPayload } from '../types/auth';

const EditProfileScreen = ({ navigation }: any) => {
  const { user, updateUser } = useAuth();
  const currentPhoto = getProfileImageUrl(user);

  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [selectedImage, setSelectedImage] = useState<ProfileImage | null>(null);
  const [loading, setLoading] = useState(false);

  const [nameError, setNameError] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [imageError, setImageError] = useState('');

  const hasChanges = useMemo(() => {
    if (selectedImage) return true;
    if (displayName.trim() !== (user?.displayName ?? '')) return true;
    if (username.trim() !== (user?.username ?? '')) return true;
    if (email.trim() !== (user?.email ?? '')) return true;
    return false;
  }, [displayName, username, email, selectedImage, user]);

  const isFormValid =
    displayName.trim().length >= 3 &&
    email.trim().length > 0 &&
    !nameError &&
    !usernameError &&
    !emailError;

  const validateForm = (): boolean => {
    let valid = true;

    if (!isValidUsername(displayName.trim())) {
      setNameError('3–50 characters: letters, numbers, and underscore only');
      valid = false;
    } else {
      setNameError('');
    }

    const trimmedUsername = username.trim();
    if (trimmedUsername.length > 0 && !isValidUsername(trimmedUsername)) {
      setUsernameError('3–50 characters: letters, numbers, and underscore only');
      valid = false;
    } else {
      setUsernameError('');
    }

    if (!isValidEmail(email.trim())) {
      setEmailError('Please enter a valid email address');
      valid = false;
    } else {
      setEmailError('');
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

  const handleSave = async () => {
    if (!hasChanges || !user) return;
    if (!validateForm()) return;

    setLoading(true);
    try {
      const payload: UpdateUserPayload = {};

      if (displayName.trim() !== (user.displayName ?? '')) {
        payload.displayName = displayName.trim();
      }
      if (username.trim() !== (user.username ?? '')) {
        payload.username = username.trim();
      }
      if (email.trim() !== (user.email ?? '')) {
        payload.email = email.trim();
      }
      if (selectedImage) {
        payload.profilePhoto = await toBase64DataUri(
          selectedImage.uri,
          selectedImage.mimeType,
        );
      }

      const response = await updateUserById(user.id, payload);
      await updateUser(response.user);
      Alert.alert('Success', 'Your profile has been updated.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
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
        const msg =
          err?.friendlyMessage ?? 'Please check your inputs and try again.';
        Alert.alert('Validation Error', msg);
      } else if (status === 500) {
        Alert.alert(
          'Server Error',
          'Something went wrong on our end. Please try again later.',
        );
      } else {
        const msg =
          err?.friendlyMessage ?? 'Something went wrong. Please try again.';
        Alert.alert('Error', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const displayedPhoto = selectedImage?.uri ?? currentPhoto;

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
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
              disabled={loading}
            >
              <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Edit Profile</Text>
            <View style={{ width: 44 }} />
          </View>

          {/* Profile photo */}
          <View style={styles.photoSection}>
            <TouchableOpacity
              style={styles.photoWrapper}
              activeOpacity={0.85}
              onPress={handlePickImage}
              disabled={loading}
            >
              {displayedPhoto ? (
                <Image source={{ uri: displayedPhoto }} style={styles.photoImage} />
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
                  {displayedPhoto ? 'Change Photo' : 'Add Photo'}
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

          {/* Form */}
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
              label="Username"
              placeholder="Enter a unique username"
              value={username}
              onChangeText={(text: string) => {
                setUsername(text);
                if (usernameError) setUsernameError('');
              }}
              autoCapitalize="none"
              maxLength={50}
              editable={!loading}
              errorText={usernameError}
              leftElement={
                <Ionicons name="at-outline" size={20} color={colors.textMuted} />
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
              title="Save Changes"
              onPress={handleSave}
              disabled={!hasChanges || !isFormValid || loading}
              loading={loading}
              style={styles.ctaButton}
            />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: spacing.xxl,
  },
  headerTitle: {
    fontSize: typography.fontSizeXL,
    fontWeight: typography.fontWeightBold,
    color: colors.textPrimary,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  /* ── Photo ───────────────────────────────────────── */
  photoSection: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
    gap: spacing.md,
  },
  photoWrapper: { position: 'relative' },
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
  },
});

export default EditProfileScreen;
