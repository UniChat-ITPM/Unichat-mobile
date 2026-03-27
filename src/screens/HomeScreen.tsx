import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ChatListItem from '../components/ChatListItem';
import BottomTabBar, { HomeTabKey } from '../components/BottomTabBar';
import { useAuth } from '../context/AuthContext';
import { getProfileImageUrl } from '../utils/avatar';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { SCREENS } from '../constants';

type ChatPreview = {
  id: string;
  name: string;
  lastMessage: string;
  timeLabel: string;
  unreadCount: number;
  isOnline?: boolean;
  avatarColor?: string;
  isGroup?: boolean;
  isFavorite?: boolean;
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
    isGroup: true,
    isFavorite: true,
  },
  {
    id: '2',
    name: 'Kasun Perera',
    lastMessage: 'Can we meet near the library at 2?',
    timeLabel: '8:10 AM',
    unreadCount: 1,
    isOnline: true,
    avatarColor: '#F3E8FF',
    isFavorite: true,
  },
  {
    id: '3',
    name: 'Project Team Alpha',
    lastMessage: 'Sprint demo moved to tomorrow evening.',
    timeLabel: 'Yesterday',
    unreadCount: 0,
    avatarColor: '#DBEAFE',
    isGroup: true,
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

type FilterKey = 'all' | 'unread' | 'favorites' | 'groups';

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'favorites', label: 'Favorites' },
  { key: 'groups', label: 'Groups' },
];

const HomeScreen = ({ navigation }: { navigation: any }) => {
  const { user, logout } = useAuth();
  const avatarUri = getProfileImageUrl(user);
  const [activeTab, setActiveTab] = useState<HomeTabKey>('chats');
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [searchText, setSearchText] = useState('');

  const chats = useMemo(() => DEMO_CHATS, []);
  const chatsForTab = useMemo(() => {
    if (activeTab === 'groups') {
      return chats.filter((c) => c.isGroup);
    }
    return chats;
  }, [activeTab, chats]);

  const visibleFilters = useMemo(() => {
    if (activeTab === 'groups') {
      return FILTERS.filter((f) => f.key !== 'groups');
    }
    return FILTERS;
  }, [activeTab]);

  const unreadTotal = chatsForTab.reduce((acc, chat) => acc + chat.unreadCount, 0);
  const filteredChats = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();

    return chatsForTab.filter((chat) => {
      const filterMatch =
        activeFilter === 'all'
          ? true
          : activeFilter === 'unread'
          ? chat.unreadCount > 0
          : activeFilter === 'favorites'
          ? Boolean(chat.isFavorite)
          : Boolean(chat.isGroup);

      if (!filterMatch) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return (
        chat.name.toLowerCase().includes(normalizedSearch) ||
        chat.lastMessage.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [activeFilter, chatsForTab, searchText]);

  const screenTitle =
    activeTab === 'groups' ? 'Groups' : activeTab === 'calls' ? 'Calls' : 'Chats';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.topBar}>
          <Text style={styles.title}>{screenTitle}</Text>
          <View style={styles.topActions}>
            <TouchableOpacity style={styles.actionButton} activeOpacity={0.85}>
              <Ionicons name="camera-outline" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButtonPrimary} activeOpacity={0.85}>
              <Ionicons name="add" size={20} color={colors.textLight} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={18} color={colors.textMuted} />
            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Search"
              placeholderTextColor={colors.textMuted}
              style={styles.searchInput}
            />
          </View>
          <TouchableOpacity style={styles.profileButton} activeOpacity={0.85} onPress={logout}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.profileAvatar} />
            ) : (
              <Ionicons name="log-out-outline" size={20} color={colors.primary} />
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterRow}
        >
          {visibleFilters.map((filter) => {
            const isActive = activeFilter === filter.key;
            return (
              <TouchableOpacity
                key={filter.key}
                activeOpacity={0.85}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setActiveFilter(filter.key)}
              >
                <Text style={[styles.filterLabel, isActive && styles.filterLabelActive]}>
                  {filter.label}
                  {filter.key === 'unread' && unreadTotal > 0 ? ` ${unreadTotal}` : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <FlatList
          data={filteredChats}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ChatListItem
              name={item.name}
              lastMessage={item.lastMessage}
              timeLabel={item.timeLabel}
              unreadCount={item.unreadCount}
              isOnline={item.isOnline}
              avatarColor={item.avatarColor}
              onPress={() =>
                navigation.navigate(SCREENS.CHAT, {
                  name: item.name,
                  status: item.isOnline ? 'online' : 'last seen recently',
                  unreadBackHrefCount: unreadTotal,
                  isGroup: item.isGroup,
                })
              }
            />
          )}
          contentContainerStyle={styles.chatList}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={styles.welcomeText}>Hi {user?.displayName ?? 'there'}</Text>
          }
        />
      </View>

      <BottomTabBar
        activeTab={activeTab}
        onTabPress={(tab) => {
          if (tab === 'settings') {
            navigation.navigate(SCREENS.SETTINGS);
          } else {
            setActiveTab(tab);
          }
        }}
      />
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
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 36,
    fontWeight: typography.fontWeightExtraBold,
    color: colors.textPrimary,
    letterSpacing: typography.letterSpacingTight,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonPrimary: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  searchContainer: {
    flex: 1,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    marginLeft: spacing.sm,
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.fontSizeSM,
  },
  profileButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginLeft: spacing.sm,
  },
  profileAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  filterScroll: {
    flexGrow: 0,
    marginBottom: spacing.md,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterChip: {
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterLabel: {
    color: colors.textSecondary,
    fontWeight: typography.fontWeightMedium,
    fontSize: typography.fontSizeXS,
  },
  filterLabelActive: {
    color: colors.textLight,
    fontWeight: typography.fontWeightSemiBold,
  },
  welcomeText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizeSM,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  chatList: {
    paddingBottom: spacing.base,
  },
});

export default HomeScreen;
