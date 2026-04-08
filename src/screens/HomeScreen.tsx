import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ChatListItem from '../components/ChatListItem';
import { useAuth } from '../context/AuthContext';
import { useChatsUnread } from '../context/ChatsUnreadContext';
import { getProfileImageUrl } from '../utils/avatar';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { scrollPaddingAboveMainTabBar } from '../theme/layout';
import { SCREENS } from '../constants';
import { conversationsErrorMessage, listMyConversations } from '../services/conversationsApi';
import type { ChatPreviewRow } from '../utils/conversationPreview';
import {
  conversationDtoToPreview,
  inferIsGroupFromConversationDto,
} from '../utils/conversationPreview';
import { loadCachedConversationList, saveCachedConversationList } from '../services/chatCache';
import type { ConversationSummaryDto } from '../types/conversations';
import { subscribeRealtime } from '../services/chatSocket';
import { getUnreadNotificationCount } from '../services/notificationService';

type FilterKey = 'all' | 'unread' | 'favorites' | 'groups';

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'favorites', label: 'Favorites' },
  { key: 'groups', label: 'Groups' },
];

const HomeScreen = ({
  navigation,
  variant,
}: {
  navigation: any;
  variant: 'chats' | 'groups';
}) => {
  const { user, logout } = useAuth();
  const { setTabUnreadTotals } = useChatsUnread();
  const avatarUri = getProfileImageUrl(user);

  const applyUnreadTabTotals = useCallback(
    (rows: ConversationSummaryDto[]) => {
      let allUnread = 0;
      let groupUnread = 0;
      for (const c of rows) {
        const n = Math.max(0, c.unreadCount ?? 0);
        allUnread += n;
        if (inferIsGroupFromConversationDto(c)) {
          groupUnread += n;
        }
      }
      setTabUnreadTotals(allUnread, groupUnread);
    },
    [setTabUnreadTotals],
  );
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [searchText, setSearchText] = useState('');
  const [chats, setChats] = useState<ChatPreviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);
  const firstLoadRef = useRef(true);

  const loadChats = useCallback(async (fromPullRefresh = false) => {
    setListError(null);
    if (fromPullRefresh) {
      setRefreshing(true);
    } else if (firstLoadRef.current) {
      const raw = await loadCachedConversationList();
      let usedCache = false;
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as ConversationSummaryDto[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            setChats(parsed.map((c, i) => conversationDtoToPreview(c, i, user?.id)));
            applyUnreadTabTotals(parsed);
            usedCache = true;
          }
        } catch {
          /* ignore stale cache */
        }
      }
      if (!usedCache) {
        setLoading(true);
      }
    }
    try {
      const rows = await listMyConversations();
      setChats(rows.map((c, i) => conversationDtoToPreview(c, i, user?.id)));
      applyUnreadTabTotals(rows);
      void saveCachedConversationList(JSON.stringify(rows));
    } catch (e) {
      setListError(conversationsErrorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
      firstLoadRef.current = false;
    }
  }, [user?.id, applyUnreadTabTotals]);

  useEffect(() => {
    return subscribeRealtime((envelope) => {
      if (envelope.type === 'MESSAGE_CREATED') {
        loadChats(false);
      }
    });
  }, [loadChats]);

  useFocusEffect(
    useCallback(() => {
      loadChats(false);
      getUnreadNotificationCount().then(setNotificationUnreadCount).catch(console.error);
    }, [loadChats]),
  );

  const onRefresh = useCallback(() => {
    loadChats(true);
  }, [loadChats]);

  const chatsForTab = useMemo(() => {
    if (variant === 'groups') {
      return chats.filter((c) => c.isGroup);
    }
    return chats;
  }, [variant, chats]);

  const visibleFilters = useMemo(() => {
    if (variant === 'groups') {
      return FILTERS.filter((f) => f.key !== 'groups');
    }
    return FILTERS;
  }, [variant]);

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

  const screenTitle = variant === 'groups' ? 'Groups' : 'Chats';

  const openNewChat = useCallback(() => {
    navigation.navigate(SCREENS.NEW_CHAT, {
      startInGroupMode: variant === 'groups',
    });
  }, [navigation, variant]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.topBar}>
          <Text style={styles.title}>{screenTitle}</Text>
          <View style={styles.topActions}>
            <TouchableOpacity 
              style={styles.actionButton} 
              activeOpacity={0.85}
              onPress={() => navigation.navigate(SCREENS.NOTIFICATION_CENTER)}
            >
              <Ionicons name="notifications-outline" size={20} color={colors.textPrimary} />
              {notificationUnreadCount > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>{notificationUnreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} activeOpacity={0.85}>
              <Ionicons name="camera-outline" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButtonPrimary}
              activeOpacity={0.85}
              onPress={openNewChat}
            >
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

        {listError ? (
          <Text style={styles.errorBanner}>{listError}</Text>
        ) : null}

        {loading && chats.length === 0 ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
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
                imageUrl={item.imageUrl}
                onPress={() =>
                  navigation.navigate(SCREENS.CHAT, {
                    name: item.name,
                    conversationId: item.id,
                    status: item.isOnline ? 'online' : 'last seen recently',
                    unreadBackHrefCount: unreadTotal,
                    isGroup: item.isGroup,
                    imageUrl: item.imageUrl,
                  })
                }
              />
            )}
            contentContainerStyle={[
              styles.chatList,
              { paddingBottom: scrollPaddingAboveMainTabBar },
            ]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
            }
            ListHeaderComponent={
              <Text style={styles.welcomeText}>Hi {user?.displayName ?? 'there'}</Text>
            }
            ListEmptyComponent={
              !loading ? (
                <Text style={styles.emptyText}>
                  {listError ? 'Pull to retry.' : 'No conversations yet. Tap + to start a direct chat.'}
                </Text>
              ) : null
            }
          />
        )}
      </View>

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
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: colors.primary, // Using primary since red might not be defined in your theme
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: colors.backgroundSecondary,
  },
  bellBadgeText: {
    color: colors.textLight,
    fontSize: 9,
    fontWeight: typography.fontWeightBold,
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
  errorBanner: {
    color: colors.primary,
    fontSize: typography.fontSizeXS,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  emptyText: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatList: {},
});

export default HomeScreen;
