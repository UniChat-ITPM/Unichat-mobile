import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import PrimaryButton from '../components/PrimaryButton';
import TextInputField from '../components/TextInputField';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { SCREENS } from '../constants';
import { useAuth } from '../context/AuthContext';

const ProfileSetupScreen = ({ navigation, route }: any) => {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const prefillName: string = route?.params?.prefillName ?? user?.displayName ?? '';

  useEffect(() => {
    if (prefillName) {
      setName(prefillName);
    }
  }, [prefillName]);

  const handleContinue = async () => {
    const trimmed = name.trim();
    if (trimmed.length === 0) return;

    setLoading(true);
    try {
      await updateUser({ displayName: trimmed });
      navigation.reset({ index: 0, routes: [{ name: SCREENS.HOME }] });
    } catch {
      Alert.alert('Error', 'Failed to save your profile. Please try again.');
    } finally {
      setLoading(false);
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
            disabled={loading}
          >
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>

          {/* Header text */}
          <Text style={styles.title}>Set Up Your Profile</Text>
          <Text style={styles.subtitle}>
            Add your name and photo so others can recognize you
          </Text>

          {/* Profile photo area */}
          <View style={styles.photoSection}>
            <TouchableOpacity style={styles.photoWrapper} activeOpacity={0.85}>
              <LinearGradient
                colors={['#C7D2FE', '#DDD6FE']}
                style={styles.photoPlaceholder}
              >
                <Ionicons name="person" size={56} color={colors.primary} />
              </LinearGradient>

              <LinearGradient
                colors={[colors.gradientStart, colors.gradientEnd]}
                style={styles.cameraBadge}
              >
                <Ionicons name="camera" size={18} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.addPhotoButton}>
              <Text style={styles.addPhotoText}>Add Profile Photo</Text>
            </TouchableOpacity>
          </View>

          {/* Name input card */}
          <View style={styles.card}>
            <TextInputField
              label="Your Name"
              placeholder="Enter your name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              maxLength={40}
              editable={!loading}
              leftElement={
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={colors.textMuted}
                />
              }
            />

            <PrimaryButton
              title="Continue"
              onPress={handleContinue}
              disabled={name.trim().length === 0 || loading}
              loading={loading}
              style={styles.ctaButton}
            />

            <View style={styles.helperRow}>
              <Ionicons
                name="information-circle-outline"
                size={14}
                color={colors.textMuted}
              />
              <Text style={styles.helperText}>You can change this later</Text>
            </View>
          </View>

          {/* Progress hint */}
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
  addPhotoButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  addPhotoText: {
    fontSize: typography.fontSizeMD,
    fontWeight: typography.fontWeightSemiBold,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
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
  ctaButton: { width: '100%', marginTop: spacing.sm, marginBottom: spacing.base },
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
