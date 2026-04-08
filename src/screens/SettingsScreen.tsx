import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { scrollPaddingAboveMainTabBar } from '../theme/layout';
import { SCREENS } from '../constants';
import { useAuth } from '../context/AuthContext';
import { getProfileImageUrl } from '../utils/avatar';

const SettingsRow = ({ icon, title, subtitle, onPress, iconColor = colors.primary, showRightArrow = true }) => (
  <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.iconContainer, { backgroundColor: iconColor + '15' }]}>
      <Ionicons name={icon} size={22} color={iconColor} />
    </View>
    <View style={styles.rowContent}>
      <Text style={styles.rowTitle}>{title}</Text>
      {subtitle && <Text style={styles.rowSubtitle}>{subtitle}</Text>}
    </View>
    {showRightArrow && (
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    )}
  </TouchableOpacity>
);

const SettingsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const avatarUri = getProfileImageUrl(user);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        {navigation.canGoBack() ? (
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSide} />
        )}
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerSide} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: scrollPaddingAboveMainTabBar },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Section */}
        <TouchableOpacity 
          style={styles.profileCard} 
          activeOpacity={0.8}
          onPress={() => navigation.navigate(SCREENS.EDIT_PROFILE)}
        >
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.profileAvatarImage} />
          ) : (
            <LinearGradient
              colors={['#C7D2FE', '#DDD6FE']}
              style={styles.profileAvatar}
            >
              <Ionicons name="person" size={40} color={colors.primary} />
            </LinearGradient>
          )}
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.displayName ?? 'User'}</Text>
            <Text style={styles.profilePhone}>{user?.phoneNumber ?? ''}</Text>
          </View>
          <View style={styles.editBtn}>
            <Ionicons name="pencil" size={16} color={colors.primary} />
          </View>
        </TouchableOpacity>

        {/* Settings Lists */}
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <SettingsRow
            icon="person-circle-outline"
            title="Account"
            subtitle="Account info, change number"
            onPress={() => navigation.navigate(SCREENS.ACCOUNT_SETTINGS)}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon="shield-checkmark-outline"
            title="Privacy & Safety"
            subtitle="Blocked users, account status"
            onPress={() => navigation.navigate(SCREENS.PRIVACY_SAFETY)}
          />
        </View>

        <Text style={styles.sectionTitle}>General</Text>
        <View style={styles.card}>
          <SettingsRow
            icon="notifications-outline"
            title="Notifications"
            subtitle="Message & group tones"
            onPress={() => navigation.navigate(SCREENS.NOTIFICATIONS_SETTINGS)}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon="language-outline"
            title="Singlish typing"
            subtitle="Romanized input → Sinhala Unicode in chat"
            onPress={() => navigation.navigate(SCREENS.SINGLISH_CONVERSION)}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon="server-outline"
            title="Storage & Data"
            subtitle="Media storage, clear cache"
            onPress={() => navigation.navigate(SCREENS.STORAGE_DATA)}
          />
        </View>

        <Text style={styles.sectionTitle}>Support</Text>
        <View style={styles.card}>
          <SettingsRow
            icon="help-circle-outline"
            title="Help & Support"
            subtitle="Help center, contact support"
            onPress={() => navigation.navigate(SCREENS.HELP_SUPPORT)}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundSecondary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.fontSizeXL,
    fontWeight: typography.fontWeightBold,
    color: colors.textPrimary,
  },
  headerSide: {
    width: 44,
    height: 44,
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
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.base,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 28,
    padding: spacing.lg,
    marginBottom: spacing.xxl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 20,
    elevation: 5,
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  profileAvatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: spacing.md,
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  profileName: {
    fontSize: typography.fontSizeLG,
    fontWeight: typography.fontWeightBold,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  profilePhone: {
    fontSize: typography.fontSizeSM,
    color: colors.textSecondary,
  },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: typography.fontSizeSM,
    fontWeight: typography.fontWeightSemiBold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginLeft: spacing.base,
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: 24,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  rowContent: {
    flex: 1,
    justifyContent: 'center',
  },
  rowTitle: {
    fontSize: typography.fontSizeMD,
    fontWeight: typography.fontWeightSemiBold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  rowSubtitle: {
    fontSize: typography.fontSizeSM,
    color: colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 42 + spacing.md + spacing.base,
  },
});

export default SettingsScreen;
