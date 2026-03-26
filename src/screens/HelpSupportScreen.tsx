import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';

const ActionRow = ({ icon, title, subtitle, onPress, iconColor = colors.primary }) => (
  <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.iconContainer, { backgroundColor: iconColor + '15' }]}>
      <Ionicons name={icon} size={22} color={iconColor} />
    </View>
    <View style={styles.rowContent}>
      <Text style={styles.rowTitle}>{title}</Text>
      {subtitle && <Text style={styles.rowSubtitle}>{subtitle}</Text>}
    </View>
    <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
  </TouchableOpacity>
);

const HelpSupportScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Get Help</Text>
        <View style={styles.card}>
          <ActionRow
            icon="information-circle-outline"
            title="Help Center"
            subtitle="Browse FAQs and guides"
            iconColor={colors.primary}
          />
          <View style={styles.divider} />
          <ActionRow
            icon="mail-outline"
            title="Contact Us"
            subtitle="Get support directly from our team"
            iconColor={colors.secondary}
          />
        </View>

        <Text style={styles.sectionTitle}>Legal</Text>
        <View style={styles.card}>
          <ActionRow
            icon="document-text-outline"
            title="Terms of Service"
            subtitle="Read our terms of service"
            iconColor={colors.textSecondary}
          />
          <View style={styles.divider} />
          <ActionRow
            icon="shield-half-outline"
            title="Privacy Policy"
            subtitle="Understand how we handle data"
            iconColor={colors.textSecondary}
          />
        </View>

        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>UniChat v1.2.0</Text>
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
  versionContainer: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  versionText: {
    fontSize: typography.fontSizeSM,
    color: colors.textMuted,
  },
});

export default HelpSupportScreen;
