import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import type { GroupMemberListItem } from '../../types/groupMember';

export type { GroupMemberListItem };

export type ParticipantProfileViewProps = {
  participantName: string;
  subtitle?: string;
  mediaCount?: number;
  /** Group or profile photo URL when available */
  avatarImageUri?: string | null;
  /** When true, top bar title is "Group info" and members list may render */
  isGroup?: boolean;
  groupMembers?: GroupMemberListItem[];
  groupMembersLoading?: boolean;
  /** Signed-in user's role in this group (for admin actions). */
  selfGroupRole?: string | null;
  /** Owner or admin: show add/remove member actions. */
  canManageMembers?: boolean;
  onAddGroupMembers?: () => void;
  onRemoveGroupMember?: (userId: string, displayName: string) => void;
  onBack: () => void;
  onEdit?: () => void;
  onMediaLinksDocs: () => void;
  onNotification: () => void;
  onDeleteChat: () => void;
  onBlockUser: () => void;
  onReportAndBlock: () => void;
  /** 1:1: you blocked this user — show Unblock instead of Block */
  haveIBlockedThem?: boolean;
  /** 1:1: this user blocked you */
  theyBlockedMe?: boolean;
  onUnblockUser?: () => void;
};

function MenuRow({
  icon,
  label,
  valueRight,
  onPress,
  destructive,
  showChevron = true,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  valueRight?: string;
  onPress: () => void;
  destructive?: boolean;
  showChevron?: boolean;
}) {
  const tint = destructive ? colors.error : colors.primary;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed]}
      android_ripple={{ color: 'rgba(79, 70, 229, 0.12)' }}
    >
      <View style={[styles.menuIconWrap, { backgroundColor: destructive ? `${colors.error}18` : `${colors.primary}15` }]}>
        <Ionicons name={icon} size={22} color={tint} />
      </View>
      <View style={styles.menuRowBody}>
        <Text style={[styles.menuLabel, destructive && styles.menuLabelDestructive]} numberOfLines={2}>
          {label}
        </Text>
      </View>
      {valueRight ? (
        <Text style={[styles.menuValue, destructive && styles.menuValueDestructive]} numberOfLines={1}>
          {valueRight}
        </Text>
      ) : null}
      {showChevron ? (
        <Ionicons name="chevron-forward" size={20} color={destructive ? colors.error : colors.textMuted} />
      ) : (
        <View style={{ width: 20 }} />
      )}
    </Pressable>
  );
}

function GroupMemberRow({
  item,
  removable,
  onPress,
}: {
  item: GroupMemberListItem;
  removable?: boolean;
  onPress?: () => void;
}) {
  const initial = item.title.trim().charAt(0).toUpperCase() || '?';
  const remote = item.avatarUrl?.trim();

  const inner = (
    <>
      <View style={styles.memberAvatar}>
        {remote ? (
          <Image
            source={{ uri: remote }}
            style={styles.memberAvatarImage}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <Text style={styles.memberAvatarLetter}>{initial}</Text>
        )}
      </View>
      <View style={styles.memberBody}>
        <View style={styles.memberTitleRow}>
          <Text style={styles.memberTitle} numberOfLines={1}>
            {item.title}
          </Text>
          {item.isSelf ? (
            <View style={styles.youBadge}>
              <Text style={styles.youBadgeText}>You</Text>
            </View>
          ) : null}
        </View>
        {item.roleLabel ? (
          <Text style={styles.memberRole} numberOfLines={1}>
            {item.roleLabel}
          </Text>
        ) : null}
      </View>
      {removable ? (
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} style={{ marginLeft: spacing.sm }} />
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.memberRow, pressed && styles.memberRowPressed]}
        android_ripple={{ color: 'rgba(79, 70, 229, 0.12)' }}
      >
        {inner}
      </Pressable>
    );
  }

  return <View style={styles.memberRow}>{inner}</View>;
}

export function ParticipantProfileView({
  participantName,
  subtitle,
  mediaCount = 0,
  avatarImageUri,
  isGroup = false,
  groupMembers = [],
  groupMembersLoading = false,
  selfGroupRole = null,
  canManageMembers = false,
  onAddGroupMembers,
  onRemoveGroupMember,
  onBack,
  onEdit,
  onMediaLinksDocs,
  onNotification,
  onDeleteChat,
  onBlockUser,
  onReportAndBlock,
  haveIBlockedThem = false,
  theyBlockedMe = false,
  onUnblockUser,
}: ParticipantProfileViewProps) {
  const initial = participantName.trim().charAt(0).toUpperCase() || '?';
  const mediaRight = mediaCount > 0 ? String(mediaCount) : undefined;
  const remoteAvatar = avatarImageUri?.trim();
  const topTitle = isGroup ? 'Group info' : 'Contact info';
  const selfRoleUpper = (selfGroupRole ?? 'MEMBER').toUpperCase();

  const memberRemovable = (m: GroupMemberListItem) => {
    if (!canManageMembers || !onRemoveGroupMember) return false;
    if (m.isSelf) return false;
    const r = m.role.toUpperCase();
    if (r === 'OWNER') return false;
    if (r === 'ADMIN' && selfRoleUpper !== 'OWNER') return false;
    return true;
  };

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.topBarBtn} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{topTitle}</Text>
        <TouchableOpacity onPress={onEdit} style={styles.topBarBtnRight} hitSlop={12} accessibilityRole="button" accessibilityLabel="Edit">
          <Text style={styles.editLink}>Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <LinearGradient colors={[colors.dotInactive, '#E0E7FF']} style={styles.avatarRing}>
            <View style={styles.avatarInner}>
              {remoteAvatar ? (
                <Image
                  source={{ uri: remoteAvatar }}
                  style={styles.avatarPhoto}
                  accessibilityIgnoresInvertColors
                />
              ) : (
                <Text style={styles.avatarLetter}>{initial}</Text>
              )}
            </View>
          </LinearGradient>
          <Text style={styles.displayName} numberOfLines={2}>
            {participantName}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
          {!isGroup && theyBlockedMe ? (
            <Text style={styles.blockStatusHint}>This user blocked you. You cannot send them messages.</Text>
          ) : null}
        </View>

        {isGroup ? (
          <View style={[styles.card, styles.cardSpaced]}>
            <View style={styles.membersSectionHeader}>
              <Text style={styles.membersSectionTitle}>Members</Text>
              <View style={styles.membersHeaderRight}>
                {!groupMembersLoading && groupMembers.length > 0 ? (
                  <Text style={styles.membersCount}>{groupMembers.length}</Text>
                ) : null}
                {canManageMembers && onAddGroupMembers ? (
                  <TouchableOpacity
                    onPress={onAddGroupMembers}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Add members"
                  >
                    <Text style={styles.addMembersLink}>Add</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
            {groupMembersLoading ? (
              <View style={styles.membersLoading}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : groupMembers.length === 0 ? (
              <Text style={styles.membersEmpty}>No members loaded.</Text>
            ) : (
              groupMembers.map((m, i) => {
                const removable = memberRemovable(m);
                return (
                  <View key={m.userId}>
                    <GroupMemberRow
                      item={m}
                      removable={removable}
                      onPress={
                        removable
                          ? () => onRemoveGroupMember?.(m.userId, m.title)
                          : undefined
                      }
                    />
                    {i < groupMembers.length - 1 ? <View style={styles.memberDivider} /> : null}
                  </View>
                );
              })
            )}
          </View>
        ) : null}

        <View style={[styles.card, isGroup ? styles.cardSpaced : null]}>
          <MenuRow
            icon="images-outline"
            label="Media, links, and docs"
            valueRight={mediaRight}
            onPress={onMediaLinksDocs}
          />
          <View style={styles.divider} />
          <MenuRow icon="notifications-outline" label="Notification" onPress={onNotification} />
        </View>

        <View style={[styles.card, styles.cardSpaced]}>
          <MenuRow
            icon="trash-outline"
            label="Delete chat"
            onPress={onDeleteChat}
            destructive
            valueRight={undefined}
            showChevron={false}
          />
          {!isGroup ? (
            haveIBlockedThem ? (
              <>
                <View style={styles.divider} />
                <MenuRow
                  icon="checkmark-circle-outline"
                  label="Unblock user"
                  onPress={onUnblockUser ?? (() => {})}
                  showChevron={false}
                />
              </>
            ) : (
              <>
                <View style={styles.divider} />
                <MenuRow
                  icon="remove-circle-outline"
                  label="Block user"
                  onPress={onBlockUser}
                  destructive
                  showChevron={false}
                />
                <View style={styles.divider} />
                <MenuRow
                  icon="flag-outline"
                  label="Report and block user"
                  onPress={onReportAndBlock}
                  destructive
                  showChevron={false}
                />
              </>
            )
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  topBarBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarBtnRight: {
    minWidth: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  topBarTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: typography.fontSizeLG,
    fontWeight: typography.fontWeightSemiBold,
    color: colors.textPrimary,
  },
  editLink: {
    fontSize: typography.fontSizeMD,
    fontWeight: typography.fontWeightSemiBold,
    color: colors.primary,
  },
  scroll: {
    paddingBottom: spacing.xl * 2,
  },
  hero: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background,
  },
  avatarRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarInner: {
    width: '100%',
    height: '100%',
    borderRadius: 56,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.background,
    overflow: 'hidden',
  },
  avatarPhoto: {
    width: '100%',
    height: '100%',
  },
  avatarLetter: {
    fontSize: 44,
    fontWeight: typography.fontWeightBold,
    color: colors.primaryDark,
  },
  displayName: {
    fontSize: typography.fontSize2XL,
    fontWeight: typography.fontWeightBold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: spacing.xs,
    fontSize: typography.fontSizeMD,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  blockStatusHint: {
    marginTop: spacing.md,
    fontSize: typography.fontSizeSM,
    color: colors.error,
    textAlign: 'center',
    lineHeight: 20,
  },
  card: {
    marginHorizontal: spacing.md,
    backgroundColor: colors.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cardSpaced: {
    marginTop: spacing.md,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  menuRowPressed: {
    backgroundColor: colors.surface,
  },
  menuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuRowBody: {
    flex: 1,
    minWidth: 0,
  },
  menuLabel: {
    fontSize: typography.fontSizeMD,
    fontWeight: typography.fontWeightMedium,
    color: colors.textPrimary,
  },
  menuLabelDestructive: {
    color: colors.error,
    fontWeight: typography.fontWeightSemiBold,
  },
  menuValue: {
    fontSize: typography.fontSizeSM,
    color: colors.textMuted,
    marginRight: 4,
    maxWidth: 72,
  },
  menuValueDestructive: {
    color: colors.error,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: spacing.md + 40 + spacing.md,
  },
  membersSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  membersSectionTitle: {
    fontSize: typography.fontSizeSM,
    fontWeight: typography.fontWeightSemiBold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  membersCount: {
    fontSize: typography.fontSizeSM,
    color: colors.textMuted,
    fontWeight: typography.fontWeightMedium,
  },
  membersHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  addMembersLink: {
    fontSize: typography.fontSizeSM,
    fontWeight: typography.fontWeightSemiBold,
    color: colors.primary,
  },
  membersLoading: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  membersEmpty: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    fontSize: typography.fontSizeSM,
    color: colors.textMuted,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  memberRowPressed: {
    backgroundColor: colors.surface,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.dotInactive,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  memberAvatarImage: {
    width: '100%',
    height: '100%',
  },
  memberAvatarLetter: {
    fontSize: typography.fontSizeLG,
    fontWeight: typography.fontWeightBold,
    color: colors.primaryDark,
  },
  memberBody: {
    flex: 1,
    minWidth: 0,
  },
  memberTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  memberTitle: {
    flex: 1,
    fontSize: typography.fontSizeMD,
    fontWeight: typography.fontWeightSemiBold,
    color: colors.textPrimary,
  },
  youBadge: {
    backgroundColor: `${colors.primary}18`,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
  },
  youBadgeText: {
    fontSize: typography.fontSizeXS,
    fontWeight: typography.fontWeightSemiBold,
    color: colors.primary,
  },
  memberRole: {
    marginTop: 2,
    fontSize: typography.fontSizeSM,
    color: colors.textMuted,
  },
  memberDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: spacing.md + 44 + spacing.md,
  },
});
