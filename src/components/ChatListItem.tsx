import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

interface ChatListItemProps {
  name: string;
  lastMessage: string;
  timeLabel: string;
  unreadCount?: number;
  isOnline?: boolean;
  avatarColor?: string;
  onPress?: () => void;
}

const ChatListItem = ({
  name,
  lastMessage,
  timeLabel,
  unreadCount = 0,
  isOnline = false,
  avatarColor = '#EEF2FF',
  onPress,
}: ChatListItemProps) => {
  const initial = name.trim().charAt(0).toUpperCase() || 'U';
  const hasUnread = unreadCount > 0;

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={onPress}>
      <View style={styles.left}>
        <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
          <Text style={styles.avatarLabel}>{initial}</Text>
          {isOnline ? <View style={styles.onlineDot} /> : null}
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <Text style={[styles.time, hasUnread && styles.timeUnread]}>{timeLabel}</Text>
        </View>

        <View style={styles.bottomRow}>
          <View style={styles.messageRow}>
            <Ionicons
              name="checkmark-done"
              size={14}
              color={hasUnread ? colors.primary : colors.textMuted}
            />
            <Text style={[styles.message, hasUnread && styles.messageUnread]} numberOfLines={1}>
              {lastMessage}
            </Text>
          </View>

          {hasUnread ? (
            <View style={styles.unreadPill}>
              <Text style={styles.unreadText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 18,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  left: {
    marginRight: spacing.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLabel: {
    color: colors.primaryDark,
    fontSize: typography.fontSizeLG,
    fontWeight: typography.fontWeightBold,
  },
  onlineDot: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.success,
    borderColor: colors.background,
    borderWidth: 2,
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  name: {
    flex: 1,
    fontSize: typography.fontSizeLG,
    fontWeight: typography.fontWeightSemiBold,
    color: colors.textPrimary,
    marginRight: spacing.sm,
  },
  time: {
    fontSize: typography.fontSizeXS,
    color: colors.textMuted,
  },
  timeUnread: {
    color: colors.primary,
    fontWeight: typography.fontWeightSemiBold,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  message: {
    marginLeft: spacing.xs,
    color: colors.textSecondary,
    fontSize: typography.fontSizeSM,
    flex: 1,
  },
  messageUnread: {
    color: colors.textPrimary,
    fontWeight: typography.fontWeightMedium,
  },
  unreadPill: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  unreadText: {
    color: colors.textLight,
    fontSize: typography.fontSizeXS,
    fontWeight: typography.fontWeightBold,
  },
});

export default ChatListItem;
