import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ScrollView,
  Modal,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import * as Contacts from 'expo-contacts';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ChatListItem from '../components/ChatListItem';
import { useAuth } from '../context/AuthContext';
import { getProfileImageUrl } from '../utils/avatar';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { scrollPaddingAboveMainTabBar } from '../theme/layout';
import { SCREENS } from '../constants';
import {
  conversationsErrorMessage,
  createPrivateConversation,
  listMyConversations,
} from '../services/conversationsApi';
import { matchContactsInBatches, usersErrorMessage } from '../services/usersApi';
import type { ContactMatchDto } from '../types/contactMatch';
import type { ChatPreviewRow } from '../utils/conversationPreview';
import { conversationDtoToPreview } from '../utils/conversationPreview';
import {
  collectE164FromContacts,
  inferDefaultCountryFromUserPhone,
} from '../utils/contactPhoneNormalize';
import { loadAllDeviceContacts } from '../utils/loadAllContacts';
import { loadCachedConversationList, saveCachedConversationList } from '../services/chatCache';
import type { ConversationSummaryDto } from '../types/conversations';

type FilterKey = 'all' | 'unread' | 'favorites' | 'groups';

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'favorites', label: 'Favorites' },
  { key: 'groups', label: 'Groups' },
];

function isLikelyUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    s.trim(),
  );
}

const HomeScreen = ({
  navigation,
  variant,
}: {
  navigation: any;
  variant: 'chats' | 'groups';
}) => {
  const { user, logout, accessToken } = useAuth();
  const avatarUri = getProfileImageUrl(user);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [searchText, setSearchText] = useState('');
  const [chats, setChats] = useState<ChatPreviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newChatTab, setNewChatTab] = useState<'contacts' | 'userid'>('contacts');
  const [participantUserId, setParticipantUserId] = useState('');
  const [creatingChat, setCreatingChat] = useState(false);
  const [contactMatches, setContactMatches] = useState<ContactMatchDto[]>([]);
  const [contactScanPhase, setContactScanPhase] = useState<'idle' | 'loading' | 'done'>('idle');
  const [contactScanError, setContactScanError] = useState<string | null>(null);
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
      void saveCachedConversationList(JSON.stringify(rows));
    } catch (e) {
      setListError(conversationsErrorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
      firstLoadRef.current = false;
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadChats(false);
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
    if (variant === 'groups') {
      Alert.alert('New group', 'Group creation UI is not wired yet. Use POST /conversations/group from the API.');
      return;
    }
    setNewChatTab('contacts');
    setParticipantUserId('');
    setContactMatches([]);
    setContactScanPhase('idle');
    setContactScanError(null);
    setNewChatOpen(true);
  }, [variant]);

  const closeNewChatModal = useCallback(() => {
    if (creatingChat) {
      return;
    }
    setNewChatOpen(false);
  }, [creatingChat]);

  const startDirectChat = useCallback(
    async (participantId: string, displayTitle: string) => {
      setCreatingChat(true);
      try {
        const conv = await createPrivateConversation({ participantUserId: participantId });
        setNewChatOpen(false);
        setParticipantUserId('');
        setContactMatches([]);
        setContactScanPhase('idle');
        setContactScanError(null);
        await loadChats();
        navigation.navigate(SCREENS.CHAT, {
          name: String(conv.title ?? conv.name ?? displayTitle),
          conversationId: conv.id,
          status: 'Tap for info',
          unreadBackHrefCount: unreadTotal,
          isGroup: Boolean(conv.isGroup),
        });
      } catch (e) {
        Alert.alert('Could not start chat', conversationsErrorMessage(e));
      } finally {
        setCreatingChat(false);
      }
    },
    [loadChats, navigation, unreadTotal],
  );

  const submitNewDirectChat = useCallback(async () => {
    const pid = participantUserId.trim();
    if (!isLikelyUuid(pid)) {
      Alert.alert('Invalid user id', 'Enter the other user’s UUID (same format as JWT `sub`).');
      return;
    }
    await startDirectChat(pid, 'Chat');
  }, [participantUserId, startDirectChat]);

  const runContactMatchFlow = useCallback(() => {
    if (!accessToken) {
      Alert.alert('Not signed in', 'Log in again to find people from your contacts.');
      return;
    }
    setContactScanError(null);
    Alert.alert(
      'Find people you know on UniChat',
      'We compare your address book numbers with UniChat accounts. Only you can start this, and numbers are sent securely over HTTPS.',
      [
        { text: 'Not now', style: 'cancel' },
        {
          text: 'Continue',
          onPress: () => {
            void (async () => {
              try {
                const perm = await Contacts.requestPermissionsAsync();
                if (perm.status !== 'granted') {
                  Alert.alert(
                    'Contacts',
                    'Allow access to contacts in your device settings to find people on UniChat.',
                  );
                  return;
                }
                setContactScanPhase('loading');
                const deviceContacts = await loadAllDeviceContacts();
                const defaultCountry = inferDefaultCountryFromUserPhone(user?.phoneNumber);
                const e164List = collectE164FromContacts(deviceContacts, defaultCountry);
                if (__DEV__) {
                  console.log('[contact-match] unique E.164 count:', e164List.length);
                }
                if (e164List.length === 0) {
                  setContactMatches([]);
                  setContactScanPhase('done');
                  setContactScanError(null);
                  Alert.alert('No numbers found', 'No valid phone numbers were found in your contacts.');
                  return;
                }
                const matches = await matchContactsInBatches(e164List, { excludeSelf: true });
                if (__DEV__) {
                  console.log('[contact-match] matches:', matches.length);
                }
                setContactScanPhase('done');
                setContactMatches(matches);
                if (matches.length === 0) {
                  setContactScanError('None of your contacts are on UniChat yet.');
                } else {
                  setContactScanError(null);
                }
              } catch (e) {
                setContactScanPhase('idle');
                const msg = usersErrorMessage(e);
                setContactScanError(msg);
                Alert.alert('Could not match contacts', msg);
              }
            })();
          },
        },
      ],
    );
  }, [accessToken, user?.phoneNumber]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.topBar}>
          <Text style={styles.title}>{screenTitle}</Text>
          <View style={styles.topActions}>
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
                onPress={() =>
                  navigation.navigate(SCREENS.CHAT, {
                    name: item.name,
                    conversationId: item.id,
                    status: item.isOnline ? 'online' : 'last seen recently',
                    unreadBackHrefCount: unreadTotal,
                    isGroup: item.isGroup,
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

      <Modal
        visible={newChatOpen}
        animationType="slide"
        transparent
        onRequestClose={closeNewChatModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New direct chat</Text>

            <View style={styles.tabRow}>
              <TouchableOpacity
                style={[styles.tabPill, newChatTab === 'contacts' && styles.tabPillActive]}
                onPress={() => setNewChatTab('contacts')}
                disabled={creatingChat}
                activeOpacity={0.85}
              >
                <Text
                  style={[styles.tabPillText, newChatTab === 'contacts' && styles.tabPillTextActive]}
                >
                  Contacts
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabPill, newChatTab === 'userid' && styles.tabPillActive]}
                onPress={() => setNewChatTab('userid')}
                disabled={creatingChat}
                activeOpacity={0.85}
              >
                <Text
                  style={[styles.tabPillText, newChatTab === 'userid' && styles.tabPillTextActive]}
                >
                  User ID
                </Text>
              </TouchableOpacity>
            </View>

            {newChatTab === 'contacts' ? (
              <View style={styles.contactsPanel}>
                <Text style={styles.modalHint}>
                  Find people on UniChat who are in your address book. Requires contacts permission.
                </Text>
                <TouchableOpacity
                  style={styles.scanContactsBtn}
                  onPress={runContactMatchFlow}
                  disabled={creatingChat || contactScanPhase === 'loading'}
                  activeOpacity={0.85}
                >
                  {contactScanPhase === 'loading' ? (
                    <ActivityIndicator color={colors.textLight} />
                  ) : (
                    <Text style={styles.scanContactsBtnText}>Find from contacts</Text>
                  )}
                </TouchableOpacity>
                {contactScanError ? (
                  <Text style={styles.contactErrorText}>{contactScanError}</Text>
                ) : null}
                <FlatList
                  data={contactMatches}
                  keyExtractor={(item) => item.userId}
                  style={styles.matchesList}
                  keyboardShouldPersistTaps="handled"
                  ListEmptyComponent={
                    contactScanPhase === 'done' && contactMatches.length === 0 && !contactScanError ? (
                      <Text style={styles.matchesEmpty}>No matches yet. Try scanning after adding contacts.</Text>
                    ) : null
                  }
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.matchRow}
                      onPress={() => startDirectChat(item.userId, item.displayName)}
                      disabled={creatingChat}
                      activeOpacity={0.85}
                    >
                      {item.profilePhoto ? (
                        <Image source={{ uri: item.profilePhoto }} style={styles.matchAvatar} />
                      ) : (
                        <View style={styles.matchAvatarPlaceholder}>
                          <Text style={styles.matchAvatarLetter}>
                            {item.displayName.trim().charAt(0).toUpperCase() || '?'}
                          </Text>
                        </View>
                      )}
                      <View style={styles.matchBody}>
                        <Text style={styles.matchName} numberOfLines={1}>
                          {item.displayName}
                        </Text>
                        {item.username ? (
                          <Text style={styles.matchUsername} numberOfLines={1}>
                            @{item.username}
                          </Text>
                        ) : null}
                      </View>
                      <Text style={styles.matchChat}>Chat</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            ) : (
              <>
                <Text style={styles.modalHint}>Other user’s UUID (`participantUserId`)</Text>
                <TextInput
                  value={participantUserId}
                  onChangeText={setParticipantUserId}
                  placeholder="e.g. 3fa85f64-5717-4562-b3fc-2c963f66afa6"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.modalInput}
                />
              </>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalBtnGhost}
                onPress={closeNewChatModal}
                disabled={creatingChat}
              >
                <Text style={styles.modalBtnGhostText}>Close</Text>
              </TouchableOpacity>
              {newChatTab === 'userid' ? (
                <TouchableOpacity
                  style={styles.modalBtnPrimary}
                  onPress={submitNewDirectChat}
                  disabled={creatingChat}
                >
                  {creatingChat ? (
                    <ActivityIndicator color={colors.textLight} />
                  ) : (
                    <Text style={styles.modalBtnPrimaryText}>Start</Text>
                  )}
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: spacing.lg,
    maxHeight: '92%',
  },
  tabRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  tabPill: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  tabPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabPillText: {
    fontSize: typography.fontSizeSM,
    fontWeight: typography.fontWeightSemiBold,
    color: colors.textSecondary,
  },
  tabPillTextActive: {
    color: colors.textLight,
  },
  contactsPanel: {
    minHeight: 120,
    marginBottom: spacing.sm,
  },
  scanContactsBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  scanContactsBtnText: {
    color: colors.textLight,
    fontWeight: typography.fontWeightSemiBold,
    fontSize: typography.fontSizeSM,
  },
  contactErrorText: {
    color: colors.primary,
    fontSize: typography.fontSizeXS,
    marginBottom: spacing.sm,
  },
  matchesList: {
    maxHeight: 280,
    marginTop: spacing.xs,
  },
  matchesEmpty: {
    color: colors.textMuted,
    fontSize: typography.fontSizeXS,
    paddingVertical: spacing.md,
    textAlign: 'center',
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  matchAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: spacing.sm,
  },
  matchAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: spacing.sm,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchAvatarLetter: {
    fontSize: typography.fontSizeLG,
    fontWeight: typography.fontWeightBold,
    color: colors.primary,
  },
  matchBody: {
    flex: 1,
    minWidth: 0,
  },
  matchName: {
    fontSize: typography.fontSizeSM,
    fontWeight: typography.fontWeightSemiBold,
    color: colors.textPrimary,
  },
  matchUsername: {
    fontSize: typography.fontSizeXS,
    color: colors.textMuted,
    marginTop: 2,
  },
  matchChat: {
    fontSize: typography.fontSizeSM,
    fontWeight: typography.fontWeightSemiBold,
    color: colors.primary,
    marginLeft: spacing.sm,
  },
  modalTitle: {
    fontSize: typography.fontSizeLG,
    fontWeight: typography.fontWeightBold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  modalHint: {
    fontSize: typography.fontSizeXS,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.fontSizeSM,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  modalBtnGhost: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  modalBtnGhostText: {
    color: colors.textSecondary,
    fontWeight: typography.fontWeightSemiBold,
  },
  modalBtnPrimary: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    minWidth: 100,
    alignItems: 'center',
  },
  modalBtnPrimaryText: {
    color: colors.textLight,
    fontWeight: typography.fontWeightSemiBold,
  },
});

export default HomeScreen;
