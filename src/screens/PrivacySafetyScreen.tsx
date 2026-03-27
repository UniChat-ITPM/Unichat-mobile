import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';

const ActionRow = ({ icon, title, subtitle, onPress, iconColor = colors.primary, badgeColor = null, badgeText = null }) => (
  <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.iconContainer, { backgroundColor: iconColor + '15' }]}>
      <Ionicons name={icon} size={22} color={iconColor} />
    </View>
    <View style={styles.rowContent}>
      <Text style={styles.rowTitle}>{title}</Text>
      {subtitle && <Text style={styles.rowSubtitle}>{subtitle}</Text>}
    </View>
    {badgeColor && badgeText && (
      <View style={[styles.badge, { backgroundColor: badgeColor + '20' }]}>
        <Text style={[styles.badgeText, { color: badgeColor }]}>{badgeText}</Text>
      </View>
    )}
    <Ionicons name="chevron-forward" size={20} color={colors.textMuted} style={{ marginLeft: spacing.xs }} />
  </TouchableOpacity>
);

const PrivacySafetyScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy & Safety</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Status</Text>
        <View style={styles.card}>
          <ActionRow
            icon="checkmark-circle-outline"
            title="Account Status"
            subtitle="Your account is in good standing"
            iconColor={colors.success}
            badgeColor={colors.success}
            badgeText="Normal"
          />
          <View style={styles.divider} />
          <ActionRow
            icon="warning-outline"
            title="Security Alerts"
            subtitle="No recent suspicious logins"
            iconColor={colors.warning}
          />
        </View>

        <Text style={styles.sectionTitle}>Interactions</Text>
        <View style={styles.card}>
          <ActionRow
            icon="person-remove-outline"
            title="Blocked Users"
            subtitle="Manage your blocked contacts"
          />
          <View style={styles.divider} />
          <ActionRow
            icon="flag-outline"
            title="Report History"
            subtitle="View your submitted reports"
          />
        </View>

        <Text style={styles.sectionTitle}>Assistance</Text>
        <View style={styles.card}>
          <ActionRow
            icon="bug-outline"
            title="Report a Problem"
            subtitle="Send feedback or report an issue"
            iconColor={colors.error}
          />
        </View>

        <View style={{ height: spacing.xxxl }} />
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
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.base,
    paddingBottom: spacing.xxxl,
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
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: typography.fontSizeXS,
    fontWeight: typography.fontWeightBold,
  },
});

export default PrivacySafetyScreen;
