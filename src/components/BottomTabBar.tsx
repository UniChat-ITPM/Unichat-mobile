import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

export type HomeTabKey = 'chats' | 'groups' | 'calls' | 'settings';

interface BottomTabBarProps {
  activeTab: HomeTabKey;
  onTabPress: (tab: HomeTabKey) => void;
}

const TAB_CONFIG: Array<{ key: HomeTabKey; label: string; icon: keyof typeof Ionicons.glyphMap }> =
  [
    { key: 'chats', label: 'Chats', icon: 'chatbubbles-outline' },
    { key: 'groups', label: 'Groups', icon: 'people-outline' },
    { key: 'calls', label: 'Calls', icon: 'call-outline' },
    { key: 'settings', label: 'Settings', icon: 'settings-outline' },
  ];

const BottomTabBar = ({ activeTab, onTabPress }: BottomTabBarProps) => {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrapper, { paddingBottom: spacing.base + insets.bottom }]}>
      {TAB_CONFIG.map((tab) => {
        const active = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tabButton}
            activeOpacity={0.85}
            onPress={() => onTabPress(tab.key)}
          >
            <View style={[styles.iconBubble, active && styles.iconBubbleActive]}>
              <Ionicons
                name={tab.icon}
                size={20}
                color={active ? colors.textLight : colors.textSecondary}
              />
            </View>
            <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBubbleActive: {
    backgroundColor: colors.primary,
  },
  label: {
    fontSize: typography.fontSizeXS,
    color: colors.textSecondary,
    fontWeight: typography.fontWeightMedium,
  },
  labelActive: {
    color: colors.primary,
    fontWeight: typography.fontWeightSemiBold,
  },
});

export default BottomTabBar;
