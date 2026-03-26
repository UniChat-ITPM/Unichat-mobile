import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ChatListItem from '../components/ChatListItem';
import BottomTabBar, { HomeTabKey } from '../components/BottomTabBar';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';

type ChatPreview = {
  id: string;
  name: string;
  lastMessage: string;
  timeLabel: string;
  unreadCount: number;
  isOnline?: boolean;
  avatarColor?: string;
};

const DEMO_CHATS: ChatPreview[] = [
  {
    id: '1',
    name: 'Uni Study Group',
    lastMessage: 'Lecture slides are uploaded in the drive.',
    timeLabel: '9:42 AM',
    unreadCount: 4,
    isOnline: true,
    avatarColor: '#E0E7FF',
  },
  {
    id: '2',
    name: 'Kasun Perera',
    lastMessage: 'Can we meet near the library at 2?',
    timeLabel: '8:10 AM',
    unreadCount: 1,
    isOnline: true,
    avatarColor: '#F3E8FF',
  },
  {
    id: '3',
    name: 'Project Team Alpha',
    lastMessage: 'Sprint demo moved to tomorrow evening.',
    timeLabel: 'Yesterday',
    unreadCount: 0,
    avatarColor: '#DBEAFE',
  },
  {
    id: '4',
    name: 'Amaya',
    lastMessage: 'Thanks! I got the notes.',
    timeLabel: 'Yesterday',
    unreadCount: 0,
    avatarColor: '#E0F2FE',
  },
];

const HomeScreen = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<HomeTabKey>('chats');

  const chats = useMemo(() => DEMO_CHATS, []);
  const unreadTotal = chats.reduce((acc, chat) => acc + chat.unreadCount, 0);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>UniChat</Text>
            <Text style={styles.subtitle}>Hi {user?.displayName ?? 'there'}, welcome back</Text>
          </View>
          <TouchableOpacity style={styles.headerIcon} activeOpacity={0.85} onPress={logout}>
            <Ionicons name="log-out-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Chats</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadTotal}</Text>
          </View>
        </View>

        <FlatList
          data={chats}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ChatListItem
              name={item.name}
              lastMessage={item.lastMessage}
              timeLabel={item.timeLabel}
              unreadCount={item.unreadCount}
              isOnline={item.isOnline}
              avatarColor={item.avatarColor}
            />
          )}
          contentContainerStyle={styles.chatList}
          showsVerticalScrollIndicator={false}
        />
      </View>

      <BottomTabBar activeTab={activeTab} onTabPress={setActiveTab} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
  },
  header: {
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.base,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  title: {
    fontSize: typography.fontSizeXL,
    fontWeight: typography.fontWeightExtraBold,
    color: colors.textPrimary,
    letterSpacing: typography.letterSpacingTight,
  },
  subtitle: {
    marginTop: spacing.xs,
    fontSize: typography.fontSizeSM,
    color: colors.textSecondary,
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  sectionTitle: {
    fontSize: typography.fontSizeLG,
    color: colors.textPrimary,
    fontWeight: typography.fontWeightBold,
  },
  badge: {
    minWidth: 24,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    height: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: colors.textLight,
    fontWeight: typography.fontWeightBold,
    fontSize: typography.fontSizeXS,
  },
  chatList: {
    paddingBottom: spacing.base,
  },
});

export default HomeScreen;
