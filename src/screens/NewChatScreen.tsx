import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SectionList,
  ActivityIndicator,
  Alert,
  SectionListData,
} from 'react-native';
import * as Contacts from 'expo-contacts';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { APP_NAME, SCREENS } from '../constants';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import {
  conversationsErrorMessage,
  createGroupConversation,
  createPrivateConversation,
} from '../services/conversationsApi';
import { matchContactsInBatches, usersErrorMessage } from '../services/usersApi';
import type { ContactMatchDto } from '../types/contactMatch';
import {
  collectE164FromContacts,
  inferDefaultCountryFromUserPhone,
} from '../utils/contactPhoneNormalize';
import { loadAllDeviceContacts } from '../utils/loadAllContacts';
import { inferIsGroupFromConversationDto } from '../utils/conversationPreview';

const LETTER_INDEX = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('');

function sectionKeyForName(name: string): string {
  const t = name.trim();
  if (!t) return '#';
  const c = t[0].toUpperCase();
  if (c >= 'A' && c <= 'Z') return c;
  return '#';
}

function isLikelyUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    s.trim(),
  );
}

type NewChatScreenParams = { startInGroupMode?: boolean };

type RootStackParamList = {
  [SCREENS.NEW_CHAT]: NewChatScreenParams | undefined;
  [SCREENS.CHAT]: Record<string, unknown>;
  [key: string]: object | undefined;
};

type NewChatNav = StackNavigationProp<RootStackParamList, typeof SCREENS.NEW_CHAT>;
type NewChatRoute = RouteProp<RootStackParamList, typeof SCREENS.NEW_CHAT>;

type SectionRow = ContactMatchDto;

const NewChatScreen = ({
  navigation,
  route,
}: {
  navigation: NewChatNav;
  route: NewChatRoute;
}) => {
  const { user, accessToken } = useAuth();
  const startInGroupMode = Boolean(
    (route.params as NewChatScreenParams | undefined)?.startInGroupMode,
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [matches, setMatches] = useState<ContactMatchDto[]>([]);
  const [loadPhase, setLoadPhase] = useState<'idle' | 'loading' | 'done'>('idle');
  const [loadError, setLoadError] = useState<string | null>(null);

  const [groupPickMode, setGroupPickMode] = useState(startInGroupMode);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(() => new Set());
  const [userIdExpanded, setUserIdExpanded] = useState(false);
  const [participantUserId, setParticipantUserId] = useState('');
  const [busy, setBusy] = useState(false);

  const listRef = useRef<SectionList<SectionRow, { title: string; data: SectionRow[] }>>(null);

  const runLoadMatches = useCallback(async () => {
    if (!accessToken) {
      setLoadError('Sign in again to find people on UniChat.');
      setLoadPhase('done');
      return;
    }
    setLoadError(null);
    setLoadPhase('loading');
    try {
      const perm = await Contacts.requestPermissionsAsync();
      if (perm.status !== 'granted') {
        setMatches([]);
        setLoadPhase('done');
        setLoadError('Allow contacts access in Settings to see who is on UniChat.');
        return;
      }
      const deviceContacts = await loadAllDeviceContacts();
      const defaultCountry = inferDefaultCountryFromUserPhone(user?.phoneNumber);
      const e164List = collectE164FromContacts(deviceContacts, defaultCountry);
      if (e164List.length === 0) {
        setMatches([]);
        setLoadPhase('done');
        setLoadError(null);
        Alert.alert('No numbers found', 'No valid phone numbers were found in your contacts.');
        return;
      }
      const next = await matchContactsInBatches(e164List, { excludeSelf: true });
      setMatches(next);
      setLoadPhase('done');
      if (next.length === 0) {
        setLoadError('None of your contacts are on UniChat yet.');
      }
    } catch (e) {
      setLoadPhase('done');
      const msg = usersErrorMessage(e);
      setLoadError(msg);
      Alert.alert('Could not load contacts', msg);
    }
  }, [accessToken, user?.phoneNumber]);

  useEffect(() => {
    void runLoadMatches();
  }, [runLoadMatches]);

  const filteredMatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return matches;
    return matches.filter((m) => {
      const name = m.displayName.toLowerCase();
      const un = (m.username ?? '').toLowerCase();
      const phone = m.phoneNumber.replace(/\s/g, '');
      return name.includes(q) || un.includes(q) || phone.includes(q);
    });
  }, [matches, searchQuery]);

  const sections = useMemo((): SectionListData<SectionRow, { title: string; data: SectionRow[] }>[] => {
    const sorted = [...filteredMatches].sort((a, b) =>
      a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' }),
    );
    const byLetter = new Map<string, SectionRow[]>();
    for (const row of sorted) {
      const key = sectionKeyForName(row.displayName);
      const bucket = byLetter.get(key) ?? [];
      bucket.push(row);
      byLetter.set(key, bucket);
    }
    const ordered: SectionListData<SectionRow, { title: string; data: SectionRow[] }>[] = [];
    for (const L of LETTER_INDEX) {
      const data = byLetter.get(L);
      if (data?.length) {
        ordered.push({ title: L, data });
      }
    }
    return ordered;
  }, [filteredMatches]);

  const openChat = useCallback(
    async (participantId: string, displayTitle: string) => {
      setBusy(true);
      try {
        const conv = await createPrivateConversation({ participantUserId: participantId });
        navigation.replace(SCREENS.CHAT, {
          name: String(conv.title ?? conv.name ?? displayTitle),
          conversationId: conv.id,
          status: 'Tap for info',
          isGroup: inferIsGroupFromConversationDto(conv),
        });
      } catch (e) {
        Alert.alert('Could not start chat', conversationsErrorMessage(e));
      } finally {
        setBusy(false);
      }
    },
    [navigation],
  );

  const submitUserId = useCallback(async () => {
    const pid = participantUserId.trim();
    if (!isLikelyUuid(pid)) {
      Alert.alert('Invalid user id', 'Enter the other user’s UUID (same format as JWT `sub`).');
      return;
    }
    await openChat(pid, 'Chat');
  }, [participantUserId, openChat]);

  const createGroup = useCallback(async () => {
    const ids = Array.from(selectedUserIds);
    if (ids.length === 0) {
      Alert.alert('Select members', 'Choose at least one person for the group.');
      return;
    }
    setBusy(true);
    try {
      const conv = await createGroupConversation({
        title: 'New group',
        participantUserIds: ids,
      });
      navigation.replace(SCREENS.CHAT, {
        name: String(conv.title ?? conv.name ?? 'New group'),
        conversationId: conv.id,
        status: 'Tap for info',
        isGroup: true,
      });
    } catch (e) {
      Alert.alert('Could not create group', conversationsErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }, [navigation, selectedUserIds]);

  const toggleSelected = useCallback((id: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const exitGroupMode = useCallback(() => {
    setGroupPickMode(false);
    setSelectedUserIds(new Set());
  }, []);

  const scrollToLetter = useCallback(
    (letter: string) => {
      const sectionIndex = sections.findIndex((s) => s.title === letter);
      if (sectionIndex < 0 || !listRef.current) return;
      try {
        listRef.current.scrollToLocation({
          sectionIndex,
          itemIndex: 0,
          animated: true,
          viewOffset: 0,
        });
      } catch {
        /* SectionList scrollToLocation can throw if list not measured yet */
      }
    },
    [sections],
  );

  const ListHeader = useCallback(
    () => (
      <>
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search name or number"
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
          />
        </View>
        {!groupPickMode ? (
          <>
            <View style={styles.actionsCard}>
              <TouchableOpacity
                style={styles.actionRow}
                activeOpacity={0.85}
                onPress={() => {
                  setUserIdExpanded(false);
                  setGroupPickMode(true);
                }}
                disabled={busy}
              >
                <View style={styles.actionIconWrap}>
                  <Ionicons name="people-outline" size={22} color={colors.primary} />
                </View>
                <Text style={styles.actionLabel}>New group</Text>
              </TouchableOpacity>
              <View style={styles.rowDivider} />
              <TouchableOpacity
                style={styles.actionRow}
                activeOpacity={0.85}
                onPress={() => setUserIdExpanded((v) => !v)}
                disabled={busy}
              >
                <View style={styles.actionIconWrap}>
                  <Ionicons name="person-add-outline" size={22} color={colors.primary} />
                </View>
                <Text style={styles.actionLabel}>New contact</Text>
              </TouchableOpacity>
              <View style={styles.rowDivider} />
              <TouchableOpacity
                style={styles.actionRow}
                activeOpacity={0.85}
                onPress={() =>
                  Alert.alert('Coming soon', 'Communities are not available in this build yet.')
                }
                disabled={busy}
              >
                <View style={styles.actionIconWrap}>
                  <Ionicons name="people-circle-outline" size={22} color={colors.primary} />
                </View>
                <Text style={styles.actionLabel}>New community</Text>
              </TouchableOpacity>
              <View style={styles.rowDivider} />
              <TouchableOpacity
                style={styles.actionRow}
                activeOpacity={0.85}
                onPress={() =>
                  Alert.alert('Coming soon', 'Broadcast lists are not available in this build yet.')
                }
                disabled={busy}
              >
                <View style={styles.actionIconWrap}>
                  <Ionicons name="megaphone-outline" size={22} color={colors.primary} />
                </View>
                <Text style={styles.actionLabel}>New broadcast</Text>
              </TouchableOpacity>
            </View>
            {userIdExpanded ? (
              <View style={styles.userIdCard}>
                <Text style={styles.userIdHint}>Chat by user id (UUID)</Text>
                <TextInput
                  value={participantUserId}
                  onChangeText={setParticipantUserId}
                  placeholder="e.g. 3fa85f64-5717-4562-b3fc-2c963f66afa6"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.userIdInput}
                />
                <TouchableOpacity
                  style={styles.userIdBtn}
                  onPress={submitUserId}
                  disabled={busy}
                  activeOpacity={0.85}
                >
                  {busy ? (
                    <ActivityIndicator color={colors.textLight} />
                  ) : (
                    <Text style={styles.userIdBtnText}>Start chat</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : null}
          </>
        ) : null}
        <Text style={styles.sectionHeading}>Contacts on {APP_NAME}</Text>
        {loadPhase === 'done' && loadError ? <Text style={styles.bannerError}>{loadError}</Text> : null}
      </>
    ),
    [
      searchQuery,
      groupPickMode,
      userIdExpanded,
      participantUserId,
      loadPhase,
      loadError,
      busy,
      submitUserId,
    ],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.root}>
        <View style={styles.header}>
          {groupPickMode ? (
            <TouchableOpacity style={styles.headerIconBtn} onPress={exitGroupMode} activeOpacity={0.85}>
              <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          ) : (
            <View style={styles.headerSideSpacer} />
          )}
          <Text style={styles.headerTitle}>{groupPickMode ? 'New group' : 'New chat'}</Text>
          <TouchableOpacity style={styles.closeCircle} onPress={() => navigation.goBack()} activeOpacity={0.85}>
            <Ionicons name="close" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.listWrap}>
          {loadPhase === 'loading' && matches.length === 0 ? (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Finding people on UniChat…</Text>
            </View>
          ) : null}

          <SectionList<SectionRow, { title: string; data: SectionRow[] }>
            ref={listRef}
            sections={sections}
            keyExtractor={(item) => item.userId}
            stickySectionHeadersEnabled
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={ListHeader}
            ListEmptyComponent={
              loadPhase === 'done' && sections.length === 0 && !loadError ? (
                <Text style={styles.emptyList}>No contacts match your search.</Text>
              ) : null
            }
            renderSectionHeader={({ section: { title } }) => (
              <View style={styles.sectionLetterHeader}>
                <Text style={styles.sectionLetterText}>{title}</Text>
              </View>
            )}
            renderItem={({ item }) => {
              const selected = selectedUserIds.has(item.userId);
              return (
                <TouchableOpacity
                  style={styles.contactRow}
                  activeOpacity={0.85}
                  onPress={() => {
                    if (groupPickMode) {
                      toggleSelected(item.userId);
                    } else {
                      void openChat(item.userId, item.displayName);
                    }
                  }}
                  disabled={busy}
                >
                  {groupPickMode ? (
                    <View style={[styles.checkCircle, selected && styles.checkCircleOn]}>
                      {selected ? <Ionicons name="checkmark" size={16} color={colors.textLight} /> : null}
                    </View>
                  ) : null}
                  {item.profilePhoto ? (
                    <Image source={{ uri: item.profilePhoto }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarLetter}>
                        {item.displayName.trim().charAt(0).toUpperCase() || '?'}
                      </Text>
                    </View>
                  )}
                  <View style={styles.contactBody}>
                    <Text style={styles.contactName} numberOfLines={1}>
                      {item.displayName}
                    </Text>
                    {item.username ? (
                      <Text style={styles.contactSub} numberOfLines={1}>
                        @{item.username}
                      </Text>
                    ) : (
                      <Text style={styles.contactSub} numberOfLines={1}>
                        {item.phoneNumber}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            }}
          />

          <View style={styles.letterRail} pointerEvents="box-none">
            {LETTER_INDEX.map((L) => {
              const hasSection = sections.some((s) => s.title === L);
              return (
                <TouchableOpacity
                  key={L}
                  hitSlop={{ top: 2, bottom: 2, left: 8, right: 8 }}
                  onPress={() => scrollToLetter(L)}
                  disabled={!hasSection}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.letterRailText, !hasSection && styles.letterRailMuted]}>{L}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {groupPickMode ? (
          <View style={styles.groupFooter}>
            <TouchableOpacity
              style={[styles.groupCta, selectedUserIds.size === 0 && styles.groupCtaDisabled]}
              onPress={createGroup}
              disabled={busy || selectedUserIds.size === 0}
              activeOpacity={0.85}
            >
              {busy ? (
                <ActivityIndicator color={colors.textLight} />
              ) : (
                <Text style={styles.groupCtaText}>Create group ({selectedUserIds.size})</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
  },
  headerSideSpacer: {
    width: 40,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: typography.fontSizeMD,
    fontWeight: typography.fontWeightBold,
    color: colors.textPrimary,
  },
  closeCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listWrap: {
    flex: 1,
    position: 'relative',
    backgroundColor: colors.backgroundSecondary,
  },
  listContent: {
    paddingBottom: spacing.xl * 2,
    paddingRight: 28,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245,245,255,0.92)',
    zIndex: 2,
  },
  loadingText: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    fontSize: typography.fontSizeSM,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: typography.fontSizeSM,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  actionsCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: 14,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  actionIconWrap: {
    width: 40,
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  actionLabel: {
    flex: 1,
    fontSize: typography.fontSizeMD,
    fontWeight: typography.fontWeightSemiBold,
    color: colors.textPrimary,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: spacing.md + 40 + spacing.sm,
  },
  userIdCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: 14,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  userIdHint: {
    fontSize: typography.fontSizeXS,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  userIdInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.fontSizeSM,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  userIdBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  userIdBtnText: {
    color: colors.textLight,
    fontWeight: typography.fontWeightSemiBold,
    fontSize: typography.fontSizeSM,
  },
  sectionHeading: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    fontSize: typography.fontSizeXS,
    fontWeight: typography.fontWeightSemiBold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bannerError: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    color: colors.primary,
    fontSize: typography.fontSizeXS,
  },
  sectionLetterHeader: {
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  sectionLetterText: {
    fontSize: typography.fontSizeSM,
    fontWeight: typography.fontWeightBold,
    color: colors.textSecondary,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.backgroundSecondary,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: spacing.md,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: spacing.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: typography.fontSizeLG,
    fontWeight: typography.fontWeightBold,
    color: colors.primary,
  },
  contactBody: {
    flex: 1,
    minWidth: 0,
  },
  contactName: {
    fontSize: typography.fontSizeMD,
    fontWeight: typography.fontWeightSemiBold,
    color: colors.textPrimary,
  },
  contactSub: {
    fontSize: typography.fontSizeXS,
    color: colors.textMuted,
    marginTop: 2,
  },
  letterRail: {
    position: 'absolute',
    right: 2,
    top: 120,
    bottom: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  letterRailText: {
    fontSize: 10,
    fontWeight: typography.fontWeightBold,
    color: colors.primary,
    paddingVertical: 1,
  },
  letterRailMuted: {
    color: colors.textMuted,
    opacity: 0.45,
  },
  emptyList: {
    textAlign: 'center',
    color: colors.textMuted,
    padding: spacing.lg,
    fontSize: typography.fontSizeSM,
  },
  groupFooter: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: colors.backgroundSecondary,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  groupCta: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  groupCtaDisabled: {
    opacity: 0.45,
  },
  groupCtaText: {
    color: colors.textLight,
    fontWeight: typography.fontWeightBold,
    fontSize: typography.fontSizeMD,
  },
});

export default NewChatScreen;
