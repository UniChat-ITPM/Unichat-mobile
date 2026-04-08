import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import type { NotificationType } from '../services/notificationService';

interface NotificationListItemProps {
  type: NotificationType;
  title: string;
  body: string;
  timeLabel: string;
  read: boolean;
  onPress: () => void;
}

const getIconForType = (type: NotificationType) => {
  switch (type) {
    case 'MESSAGE':
      return { name: 'chatbubble-ellipses', color: colors.primary };
    case 'GROUP':
      return { name: 'people', color: colors.primary };
    case 'OTP':
      return { name: 'key', color: '#10B981' }; // Emerald Green
    case 'SECURITY':
      return { name: 'shield-checkmark', color: '#F59E0B' }; // Amber
    case 'SYSTEM':
    default:
      return { name: 'information-circle', color: colors.textSecondary };
  }
};

const NotificationListItem: React.FC<NotificationListItemProps> = ({
  type,
  title,
  body,
  timeLabel,
  read,
  onPress,
}) => {
  const iconConfig = getIconForType(type);

  return (
    <TouchableOpacity
      style={[styles.container, !read && styles.unreadContainer]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.iconWrapper, { backgroundColor: iconConfig.color + '15' }]}>
        <Ionicons name={iconConfig.name as any} size={24} color={iconConfig.color} />
      </View>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, !read && styles.unreadText]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[styles.time, !read && styles.unreadTimeText]}>{timeLabel}</Text>
        </View>
        <Text style={styles.body} numberOfLines={2}>
          {body}
        </Text>
      </View>
      {!read && <View style={styles.unreadIndicator} />}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    alignItems: 'center',
  },
  unreadContainer: {
    backgroundColor: colors.primary + '08', // very subtle primary tint
  },
  iconWrapper: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: typography.fontSizeMD,
    fontWeight: typography.fontWeightMedium,
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  unreadText: {
    fontWeight: typography.fontWeightBold,
  },
  time: {
    fontSize: typography.fontSizeXS,
    color: colors.textMuted,
  },
  unreadTimeText: {
    color: colors.primary,
    fontWeight: typography.fontWeightMedium,
  },
  body: {
    fontSize: typography.fontSizeSM,
    color: colors.textSecondary,
    lineHeight: 20,
    paddingRight: spacing.sm,
  },
  unreadIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginLeft: spacing.sm,
  },
});

export default NotificationListItem;
