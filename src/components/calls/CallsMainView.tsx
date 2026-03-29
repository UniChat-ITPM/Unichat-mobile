import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { scrollPaddingAboveMainTabBar } from '../../theme/layout';

export type CallLogEntry = {
  id: string;
  name: string;
  direction: 'incoming' | 'outgoing';
  isVideo?: boolean;
  timeLabel: string;
  streakCount?: number;
  avatarColor?: string;
};

export type CallsShortcutContact = {
  id: string;
  name: string;
  subtitle?: string;
  avatarColor?: string;
};

type QuickKey = 'call' | 'schedule' | 'keypad' | 'favorite';

export type CallsMainViewProps = {
  recentCalls: CallLogEntry[];
  shortcutContact?: CallsShortcutContact | null;
  onBack?: () => void;
  onMore?: () => void;
  onNewCall?: () => void;
  onQuickAction?: (key: QuickKey) => void;
  onShortcutContact?: () => void;
  onCallInfo?: (entry: CallLogEntry) => void;
  /** Tap main row area (not the info button) — e.g. open demo call */
  onCallLogPress?: (entry: CallLogEntry) => void;
};

function QuickActionChip({
  icon,
  label,
  onPress,
  avatarLabel,
  avatarColor,
}: {
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress?: () => void;
  avatarLabel?: string;
  avatarColor?: string;
}) {
  return (
    <TouchableOpacity style={styles.quickCell} onPress={onPress} activeOpacity={0.85}>
      <View
        style={[
          styles.quickCircle,
          avatarColor ? { backgroundColor: avatarColor } : null,
        ]}
      >
        {icon ? (
          <Ionicons name={icon} size={26} color={colors.primary} />
        ) : (
          <Text style={styles.quickAvatarLetter}>{avatarLabel ?? '?'}</Text>
        )}
      </View>
      <Text style={styles.quickLabel} numberOfLines={2}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function CallLogRow({
  item,
  onInfo,
  onPress,
}: {
  item: CallLogEntry;
  onInfo?: () => void;
  onPress?: () => void;
}) {
  const initial = item.name.trim().charAt(0).toUpperCase() || 'C';
  const dirLabel = item.direction === 'incoming' ? 'Incoming' : 'Outgoing';
  const dirIcon =
    item.direction === 'incoming'
      ? ('arrow-down-left-box-outline' as const)
      : ('arrow-up-right-box-outline' as const);
  const dirColor = item.direction === 'incoming' ? colors.success : colors.primaryLight;

  return (
    <View style={styles.logCard}>
      <TouchableOpacity
        style={styles.logCardMain}
        onPress={onPress}
        activeOpacity={onPress ? 0.88 : 1}
        disabled={!onPress}
      >
        <View style={styles.logLeft}>
          <View style={[styles.logAvatar, { backgroundColor: item.avatarColor ?? '#EEF2FF' }]}>
            <Text style={styles.logAvatarText}>{initial}</Text>
          </View>
        </View>

        <View style={styles.logBody}>
          <View style={styles.logTop}>
            <Text style={styles.logName} numberOfLines={1}>
              {item.name}
              {item.streakCount != null && item.streakCount > 1 ? (
                <Text style={styles.logStreak}> ({item.streakCount})</Text>
              ) : null}
            </Text>
            <Text style={styles.logTime}>{item.timeLabel}</Text>
          </View>
          <View style={styles.logMetaRow}>
            <Ionicons name={dirIcon} size={14} color={dirColor} />
            {item.isVideo ? (
              <Ionicons name="videocam" size={14} color={colors.textSecondary} style={styles.logVideoIcon} />
            ) : null}
            <Text style={styles.logMetaText} numberOfLines={1}>
              {dirLabel}
              {item.isVideo ? ' · Video' : ''}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.logInfoBtn}
        onPress={onInfo}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        accessibilityLabel="Call details"
      >
        <Ionicons name="information-circle-outline" size={22} color={colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

const CallsMainView = ({
  recentCalls,
  shortcutContact,
  onBack,
  onMore,
  onNewCall,
  onQuickAction,
  onShortcutContact,
  onCallInfo,
  onCallLogPress,
}: CallsMainViewProps) => {
  const contact = shortcutContact ?? {
    id: 'shortcut',
    name: 'Chuty',
    subtitle: 'Miss you! ',
    avatarColor: '#FBCFE8',
  };

  return (
    <FlatList
      data={recentCalls}
      keyExtractor={(item) => item.id}
      style={styles.list}
      contentContainerStyle={[
        styles.listContent,
        { paddingBottom: scrollPaddingAboveMainTabBar },
      ]}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <View>
          <View style={styles.topActions}>
            <TouchableOpacity
              style={styles.iconCircle}
              onPress={onBack ?? onMore}
              activeOpacity={0.85}
            >
              <Ionicons
                name={onBack ? 'arrow-back' : 'ellipsis-horizontal'}
                size={22}
                color={colors.textPrimary}
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.newCallCircle} onPress={onNewCall} activeOpacity={0.85}>
              <Ionicons name="add" size={26} color={colors.textLight} />
            </TouchableOpacity>
          </View>

          <Text style={styles.pageTitle}>Calls</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickRow}
          >
            <QuickActionChip
              icon="call-outline"
              label="Call"
              onPress={() => onQuickAction?.('call')}
            />
            <QuickActionChip
              icon="calendar-outline"
              label="Schedule"
              onPress={() => onQuickAction?.('schedule')}
            />
            <QuickActionChip
              icon="keypad-outline"
              label="Keypad"
              onPress={() => onQuickAction?.('keypad')}
            />
            <QuickActionChip
              label={contact.subtitle ? `${contact.subtitle}\n${contact.name}` : contact.name}
              avatarLabel={contact.name.trim().charAt(0).toUpperCase() || 'C'}
              avatarColor={contact.avatarColor}
              onPress={onShortcutContact}
            />
            <QuickActionChip
              icon="heart-outline"
              label="Favorite"
              onPress={() => onQuickAction?.('favorite')}
            />
          </ScrollView>

          <Text style={styles.sectionTitle}>Recent</Text>
        </View>
      }
      renderItem={({ item }) => (
        <CallLogRow
          item={item}
          onInfo={() => onCallInfo?.(item)}
          onPress={onCallLogPress ? () => onCallLogPress(item) : undefined}
        />
      )}
    />
  );
};

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.md,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newCallCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTitle: {
    fontSize: typography.fontSize3XL,
    fontWeight: typography.fontWeightExtraBold,
    color: colors.textPrimary,
    letterSpacing: typography.letterSpacingTight,
    marginBottom: spacing.lg,
  },
  quickRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingRight: spacing.md,
    marginBottom: spacing.xl,
  },
  quickCell: {
    width: 72,
    alignItems: 'center',
  },
  quickCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  quickAvatarLetter: {
    fontSize: typography.fontSizeXL,
    fontWeight: typography.fontWeightBold,
    color: colors.primaryDark,
  },
  quickLabel: {
    fontSize: typography.fontSizeXS,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 14,
  },
  sectionTitle: {
    fontSize: typography.fontSizeMD,
    fontWeight: typography.fontWeightSemiBold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  logCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 18,
    paddingVertical: spacing.md,
    paddingLeft: spacing.base,
    paddingRight: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  logCardMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
    paddingRight: spacing.xs,
  },
  logLeft: {
    marginRight: spacing.md,
  },
  logAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logAvatarText: {
    color: colors.primaryDark,
    fontSize: typography.fontSizeLG,
    fontWeight: typography.fontWeightBold,
  },
  logBody: {
    flex: 1,
    minWidth: 0,
  },
  logTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  logName: {
    flex: 1,
    fontSize: typography.fontSizeLG,
    fontWeight: typography.fontWeightSemiBold,
    color: colors.textPrimary,
  },
  logStreak: {
    fontWeight: typography.fontWeightMedium,
    color: colors.textSecondary,
  },
  logTime: {
    fontSize: typography.fontSizeXS,
    color: colors.textMuted,
  },
  logMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
  },
  logVideoIcon: {
    marginLeft: spacing.xs,
    marginRight: spacing.xs,
  },
  logMetaText: {
    marginLeft: spacing.xs,
    fontSize: typography.fontSizeSM,
    color: colors.textSecondary,
    flex: 1,
  },
  logInfoBtn: {
    marginLeft: spacing.sm,
    padding: spacing.xs,
  },
});

export default CallsMainView;
