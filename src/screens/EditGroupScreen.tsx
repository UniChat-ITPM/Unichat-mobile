import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import PrimaryButton from '../components/PrimaryButton';
import TextInputField from '../components/TextInputField';
import { SCREENS } from '../constants';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { scrollPaddingAboveMainTabBar } from '../theme/layout';
import {
  patchConversationSettings,
  conversationsErrorMessage,
} from '../services/conversationsApi';
import type { PatchConversationSettingsBody } from '../types/conversations';
import { toBase64DataUri } from '../utils/image';
import { validateProfileImage, MAX_GROUP_IMAGE_SIZE_BYTES } from '../utils/validators';

export type EditGroupScreenParams = {
  conversationId: string;
  currentTitle: string;
  imageUrl?: string | null;
};

const TITLE_MAX = 100;

type PickedImage = { uri: string; mimeType: string };

const EditGroupScreen = ({
  navigation,
  route,
}: {
  navigation: {
    goBack: () => void;
    navigate: (options: { name: string; params?: object; merge?: boolean }) => void;
  };
  route: { params?: EditGroupScreenParams };
}) => {
  const params = route.params;
  const conversationId = params?.conversationId ?? '';
  const initialTitle = params?.currentTitle ?? '';
  const initialRemoteImage = params?.imageUrl?.trim() ?? '';

  const [title, setTitle] = useState(initialTitle);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [selectedImage, setSelectedImage] = useState<PickedImage | null>(null);
  const [imageError, setImageError] = useState('');

  const trimmed = title.trim();
  const titleDirty = trimmed !== initialTitle.trim();
  const photoDirty = selectedImage !== null;
  const canSave = useMemo(() => {
    if (!trimmed || trimmed.length > TITLE_MAX) {
      return false;
    }
    return titleDirty || photoDirty;
  }, [trimmed, titleDirty, photoDirty]);

  const previewUri = selectedImage?.uri ?? (initialRemoteImage ? initialRemoteImage : null);
  const previewInitial = trimmed.charAt(0).toUpperCase() || '?';

  const handlePickPhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission required',
        'Allow photo library access to set a group picture.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }
    const asset = result.assets[0];
    const mimeType = asset.mimeType ?? 'image/jpeg';
    const fileSize = asset.fileSize ?? 0;
    const invalid = validateProfileImage(mimeType, fileSize, MAX_GROUP_IMAGE_SIZE_BYTES);
    if (invalid) {
      setImageError(invalid);
      return;
    }
    setImageError('');
    setSelectedImage({ uri: asset.uri, mimeType });
  }, []);

  const onSave = useCallback(async () => {
    if (!conversationId) {
      Alert.alert('Error', 'Missing conversation.');
      return;
    }
    if (!trimmed) {
      setErrorText('Enter a group name.');
      return;
    }
    if (trimmed.length > TITLE_MAX) {
      setErrorText(`At most ${TITLE_MAX} characters.`);
      return;
    }

    setErrorText('');
    setLoading(true);
    try {
      const body: PatchConversationSettingsBody = { title: trimmed };
      if (selectedImage) {
        body.imageUrl = await toBase64DataUri(selectedImage.uri, selectedImage.mimeType);
      }

      const data = await patchConversationSettings(conversationId, body);
      const conv = data.conversation;
      const mergedTitle = String(conv?.title ?? conv?.name ?? trimmed).trim() || trimmed;
      const mergedImage =
        conv?.imageUrl != null
          ? String(conv.imageUrl)
          : initialRemoteImage || null;

      navigation.navigate({
        name: SCREENS.PARTICIPANT_PROFILE,
        params: {
          participantName: mergedTitle,
          conversationId,
          isGroup: true,
          imageUrl: mergedImage,
        },
        merge: true,
      });
    } catch (e) {
      Alert.alert('Could not update group', conversationsErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [conversationId, trimmed, navigation, selectedImage, initialRemoteImage]);

  if (!conversationId) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit group</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={styles.centered}>
          <Text style={styles.hint}>This group could not be loaded.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit group</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: scrollPaddingAboveMainTabBar },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionLabel}>Group photo</Text>
          <TouchableOpacity
            style={styles.photoTouchable}
            onPress={handlePickPhoto}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Change group photo"
          >
            <LinearGradient colors={[colors.dotInactive, '#E0E7FF']} style={styles.photoRing}>
              <View style={styles.photoInner}>
                {previewUri ? (
                  <Image
                    source={{ uri: previewUri }}
                    style={styles.photoImage}
                    accessibilityIgnoresInvertColors
                  />
                ) : (
                  <Text style={styles.photoLetter}>{previewInitial}</Text>
                )}
              </View>
            </LinearGradient>
            <View style={styles.photoHintRow}>
              <Ionicons name="camera" size={18} color={colors.primary} />
              <Text style={styles.photoHint}>Tap to choose a new photo</Text>
            </View>
          </TouchableOpacity>
          {imageError ? <Text style={styles.imageError}>{imageError}</Text> : null}

          <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>Group name</Text>
          <TextInputField
            label=""
            placeholder="Group name"
            value={title}
            onChangeText={(t: string) => {
              setTitle(t);
              if (errorText) setErrorText('');
            }}
            autoCapitalize="sentences"
            maxLength={TITLE_MAX}
            errorText={errorText}
            errorSlotMinHeight={22}
            style={undefined}
            inputStyle={undefined}
            inputWrapperStyle={undefined}
            leftElement={undefined}
            rightElement={undefined}
            onFocus={undefined}
            onBlur={undefined}
          />
          <Text style={styles.counter}>
            {title.length}/{TITLE_MAX}
          </Text>

          <PrimaryButton
            title="Save"
            onPress={onSave}
            disabled={!canSave}
            loading={loading}
            style={styles.saveBtn}
            textStyle={undefined}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: colors.backgroundSecondary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -spacing.sm,
  },
  headerTitle: {
    fontSize: typography.fontSizeXL,
    fontWeight: typography.fontWeightBold,
    color: colors.textPrimary,
  },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  sectionLabel: {
    fontSize: typography.fontSizeSM,
    fontWeight: typography.fontWeightSemiBold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  sectionLabelSpaced: {
    marginTop: spacing.lg,
  },
  photoTouchable: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  photoRing: {
    width: 112,
    height: 112,
    borderRadius: 56,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoInner: {
    width: '100%',
    height: '100%',
    borderRadius: 52,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.backgroundSecondary,
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoLetter: {
    fontSize: 40,
    fontWeight: typography.fontWeightBold,
    color: colors.primaryDark,
  },
  photoHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  photoHint: {
    fontSize: typography.fontSizeMD,
    color: colors.primary,
    fontWeight: typography.fontWeightSemiBold,
  },
  imageError: {
    color: colors.error,
    fontSize: typography.fontSizeSM,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  counter: {
    fontSize: typography.fontSizeXS,
    color: colors.textMuted,
    alignSelf: 'flex-end',
    marginTop: spacing.xs,
  },
  saveBtn: {
    marginTop: spacing.xl,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  hint: {
    fontSize: typography.fontSizeMD,
    color: colors.textMuted,
    textAlign: 'center',
  },
});

export default EditGroupScreen;
