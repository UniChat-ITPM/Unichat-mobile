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
import { useAuth } from '../context/AuthContext';

const AccountSettingsScreen = ({ navigation }) => {
  const { user } = useAuth();
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Account Info</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Phone Number</Text>
              <Text style={styles.infoValue}>{user?.phoneNumber ?? '—'}</Text>
            </View>
            <Ionicons name="call" size={20} color={colors.textMuted} />
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Account Created</Text>
              <Text style={styles.infoValue}>Oct 15, 2025</Text>
            </View>
            <Ionicons name="calendar" size={20} color={colors.textMuted} />
          </View>
        </View>

        <TouchableOpacity style={styles.actionCard} activeOpacity={0.7}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="phone-portrait-outline" size={22} color={colors.primary} />
          </View>
          <Text style={styles.actionTitle}>Change Phone Number</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>
        
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
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: typography.fontSizeSM,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: typography.fontSizeMD,
    fontWeight: typography.fontWeightSemiBold,
    color: colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.lg,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 24,
    padding: spacing.base,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  actionTitle: {
    flex: 1,
    fontSize: typography.fontSizeMD,
    fontWeight: typography.fontWeightSemiBold,
    color: colors.textPrimary,
  },
});

export default AccountSettingsScreen;
