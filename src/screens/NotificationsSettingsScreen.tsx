import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { scrollPaddingAboveMainTabBar } from '../theme/layout';
import { getNotificationPreferences, updateNotificationPreferences } from '../services/notificationService';

const SwitchRow = ({ icon, title, subtitle, value, onValueChange, iconColor = colors.primary }) => (
  <View style={styles.row}>
    <View style={[styles.iconContainer, { backgroundColor: iconColor + '15' }]}>
      <Ionicons name={icon} size={22} color={iconColor} />
    </View>
    <View style={styles.rowContent}>
      <Text style={styles.rowTitle}>{title}</Text>
      {subtitle && <Text style={styles.rowSubtitle}>{subtitle}</Text>}
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: colors.border, true: colors.primary }}
      thumbColor={colors.background}
      ios_backgroundColor={colors.border}
    />
  </View>
);

const NotificationsSettingsScreen = ({ navigation }) => {
  const [msgTones, setMsgTones] = useState(true);
  const [msgVibrate, setMsgVibrate] = useState(true);
  const [groupTones, setGroupTones] = useState(true);
  const [groupVibrate, setGroupVibrate] = useState(false);
  
  const [otpNotifications, setOtpNotifications] = useState(true);
  const [securityNotifications, setSecurityNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);

  React.useEffect(() => {
    // Load initial preferences
    getNotificationPreferences().then(prefs => {
      setMsgTones(prefs.messageNotifications);
      setGroupTones(prefs.groupNotifications);
      setOtpNotifications(prefs.otpNotifications);
      setSecurityNotifications(prefs.securityNotifications);
      setPushNotifications(prefs.pushNotifications);
    }).catch(console.error);
  }, []);

  const handleUpdatePreference = (key: string, value: boolean) => {
    // Optimistic UI update and backend call
    const payload = { [key]: value };
    updateNotificationPreferences(payload).catch(console.error);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: scrollPaddingAboveMainTabBar },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Messages</Text>
        <View style={styles.card}>
          <SwitchRow
            icon="musical-notes-outline"
            title="Conversation Tones"
            subtitle="Play sounds for incoming messages"
            value={msgTones}
            onValueChange={(val) => { setMsgTones(val); handleUpdatePreference('messageNotifications', val); }}
          />
          <View style={styles.divider} />
          <SwitchRow
            icon="phone-portrait-outline"
            title="Vibrate"
            subtitle="Vibrate on incoming message"
            value={msgVibrate}
            onValueChange={setMsgVibrate}
          />
        </View>

        <Text style={styles.sectionTitle}>Groups</Text>
        <View style={styles.card}>
          <SwitchRow
            icon="people-outline"
            title="Group Tones"
            subtitle="Play sounds for group messages"
            value={groupTones}
            onValueChange={(val) => { setGroupTones(val); handleUpdatePreference('groupNotifications', val); }}
          />
          <View style={styles.divider} />
          <SwitchRow
            icon="phone-portrait-outline"
            title="Vibrate"
            subtitle="Vibrate on group message"
            value={groupVibrate}
            onValueChange={setGroupVibrate}
          />
        </View>

        <Text style={styles.sectionTitle}>System & Security</Text>
        <View style={styles.card}>
          <SwitchRow
            icon="key-outline"
            title="OTP Notifications"
            subtitle="Receive login verification codes"
            value={otpNotifications}
            onValueChange={(val) => { setOtpNotifications(val); handleUpdatePreference('otpNotifications', val); }}
          />
          <View style={styles.divider} />
          <SwitchRow
            icon="shield-checkmark-outline"
            title="Security Alerts"
            subtitle="Get notified about suspicious logins"
            value={securityNotifications}
            onValueChange={(val) => { setSecurityNotifications(val); handleUpdatePreference('securityNotifications', val); }}
          />
        </View>

        <Text style={styles.sectionTitle}>Device Settings</Text>
        <View style={styles.card}>
          <SwitchRow
            icon="notifications-circle-outline"
            title="Push Notifications"
            subtitle="Receive alerts outside the app"
            value={pushNotifications}
            onValueChange={(val) => { setPushNotifications(val); handleUpdatePreference('pushNotifications', val); }}
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
    marginRight: spacing.sm,
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

export default NotificationsSettingsScreen;
