import React, { useCallback, useState } from 'react';
import type { AxiosError } from 'axios';
import { Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { ParticipantProfileView } from '../components/participant/ParticipantProfileView';
import { SCREENS } from '../constants';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { extractErrorMessage } from '../services/api';
import type { ApiErrorBody } from '../types/auth';
import { getConversation } from '../services/conversationsApi';
import { blockUser, getBlockStatus, unblockUser } from '../services/moderationApi';
import type { GroupMemberListItem } from '../types/groupMember';
import { mapParticipantsToGroupMemberList } from '../utils/groupMembers';
import { participantUserIdsFromDetail } from '../utils/conversationParticipants';

export type ParticipantProfileScreenParams = {
  participantName: string;
  subtitle?: string;
  mediaCount?: number;
  conversationId?: string;
  isGroup?: boolean;
  imageUrl?: string | null;
  /** Other user in a 1:1 chat; used for block/report when available */
  peerUserId?: string;
};

const ParticipantProfileScreen = ({
  navigation,
  route,
}: {
  navigation: {
    goBack: () => void;
    navigate: (name: string, params?: object) => void;
  };
  route: { params?: ParticipantProfileScreenParams };
}) => {
  const { user } = useAuth();
  const params = route.params ?? { participantName: 'Chat' };
  const {
    participantName,
    subtitle,
    mediaCount = 0,
    conversationId,
    isGroup,
    imageUrl,
    peerUserId: peerUserIdParam,
  } = params as ParticipantProfileScreenParams;

  const [groupMembers, setGroupMembers] = useState<GroupMemberListItem[]>([]);
  const [groupMembersLoading, setGroupMembersLoading] = useState(false);
  const [peerBlock, setPeerBlock] = useState<{
    haveIBlockedThem: boolean;
    amIBlockedByThem: boolean;
  } | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!isGroup || !conversationId) {
        setGroupMembers([]);
        setGroupMembersLoading(false);
        return undefined;
      }
      let cancelled = false;
      setGroupMembersLoading(true);
      void getConversation(conversationId)
        .then((c) => {
          if (cancelled) return;
          setGroupMembers(mapParticipantsToGroupMemberList(c.participants, user?.id));
        })
        .catch(() => {
          if (cancelled) return;
          setGroupMembers([]);
        })
        .finally(() => {
          if (!cancelled) {
            setGroupMembersLoading(false);
          }
        });
      return () => {
        cancelled = true;
      };
    }, [isGroup, conversationId, user?.id]),
  );

  const resolveDmPeerUserId = useCallback(async (): Promise<string | null> => {
    if (peerUserIdParam) {
      return peerUserIdParam;
    }
    if (!conversationId || !user?.id || isGroup) {
      return null;
    }
    try {
      const c = await getConversation(conversationId);
      const ids = participantUserIdsFromDetail(c);
      return ids.find((id) => id !== user.id) ?? null;
    } catch {
      return null;
    }
  }, [peerUserIdParam, conversationId, user?.id, isGroup]);

  const refreshPeerBlockStatus = useCallback(async () => {
    if (isGroup || !user?.id) {
      setPeerBlock(null);
      return;
    }
    const peer = await resolveDmPeerUserId();
    if (!peer) {
      setPeerBlock(null);
      return;
    }
    try {
      const s = await getBlockStatus(peer);
      setPeerBlock({ haveIBlockedThem: s.haveIBlockedThem, amIBlockedByThem: s.amIBlockedByThem });
    } catch {
      setPeerBlock(null);
    }
  }, [isGroup, user?.id, resolveDmPeerUserId]);

  useFocusEffect(
    useCallback(() => {
      void refreshPeerBlockStatus();
    }, [refreshPeerBlockStatus]),
  );

  const onMediaLinksDocs = useCallback(() => {
    Alert.alert('Media, links, and docs', 'Shared files for this chat will appear here soon.');
  }, []);

  const onNotification = useCallback(() => {
    navigation.navigate(SCREENS.MAIN, {
      screen: SCREENS.TAB_SETTINGS,
      params: { screen: SCREENS.NOTIFICATIONS_SETTINGS },
    });
  }, [navigation]);

  const onDeleteChat = useCallback(() => {
    Alert.alert(
      'Delete chat?',
      'This will remove the chat from your device. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Deleted', 'Chat removed (demo).');
            navigation.goBack();
          },
        },
      ],
    );
  }, [navigation]);

  const onBlockUser = useCallback(() => {
    if (isGroup) {
      return;
    }
    Alert.alert(
      'Block user?',
      `${participantName} will no longer be able to message you.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                const target = await resolveDmPeerUserId();
                if (!target) {
                  Alert.alert('Could not block', 'Could not identify this user. Try again in a moment.');
                  return;
                }
                await blockUser(target);
                await refreshPeerBlockStatus();
                Alert.alert(
                  'Blocked',
                  'You cannot exchange messages until you unblock this user from contact info.',
                );
              } catch (e) {
                Alert.alert('Could not block', extractErrorMessage(e as AxiosError<ApiErrorBody>));
              }
            })();
          },
        },
      ],
    );
  }, [isGroup, participantName, resolveDmPeerUserId, refreshPeerBlockStatus]);

  const onReportAndBlock = useCallback(() => {
    if (isGroup) {
      return;
    }
    Alert.alert(
      'Report and block?',
      'This user will be reported and blocked.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report and block',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                const target = await resolveDmPeerUserId();
                if (!target) {
                  Alert.alert('Could not block', 'Could not identify this user. Try again in a moment.');
                  return;
                }
                await blockUser(target, 'Reported by user');
                await refreshPeerBlockStatus();
                Alert.alert(
                  'Submitted',
                  'Your report was received and this user has been blocked.',
                );
              } catch (e) {
                Alert.alert(
                  'Could not complete request',
                  extractErrorMessage(e as AxiosError<ApiErrorBody>),
                );
              }
            })();
          },
        },
      ],
    );
  }, [isGroup, resolveDmPeerUserId, refreshPeerBlockStatus]);

  const onUnblockUser = useCallback(() => {
    if (isGroup) {
      return;
    }
    Alert.alert('Unblock user?', `${participantName} will be able to message you again.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unblock',
        onPress: () => {
          void (async () => {
            try {
              const target = await resolveDmPeerUserId();
              if (!target) {
                Alert.alert('Could not unblock', 'Could not identify this user. Try again in a moment.');
                return;
              }
              await unblockUser(target);
              await refreshPeerBlockStatus();
              Alert.alert('Unblocked', 'You can message each other again.');
            } catch (e) {
              Alert.alert('Could not unblock', extractErrorMessage(e as AxiosError<ApiErrorBody>));
            }
          })();
        },
      },
    ]);
  }, [isGroup, participantName, resolveDmPeerUserId, refreshPeerBlockStatus]);

  const onEdit = useCallback(() => {
    if (isGroup && conversationId) {
      navigation.navigate(SCREENS.EDIT_GROUP, {
        conversationId,
        currentTitle: participantName,
        imageUrl: imageUrl ?? null,
      });
    } else {
      Alert.alert('Edit', 'Editing contact details will be available soon.');
    }
  }, [isGroup, conversationId, navigation, participantName, imageUrl]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundSecondary }} edges={['top']}>
      <ParticipantProfileView
        participantName={participantName}
        subtitle={subtitle}
        mediaCount={mediaCount}
        avatarImageUri={imageUrl}
        isGroup={Boolean(isGroup)}
        groupMembers={groupMembers}
        groupMembersLoading={groupMembersLoading}
        onBack={() => navigation.goBack()}
        onEdit={onEdit}
        onMediaLinksDocs={onMediaLinksDocs}
        onNotification={onNotification}
        onDeleteChat={onDeleteChat}
        onBlockUser={onBlockUser}
        onReportAndBlock={onReportAndBlock}
        haveIBlockedThem={Boolean(peerBlock?.haveIBlockedThem)}
        theyBlockedMe={Boolean(peerBlock?.amIBlockedByThem)}
        onUnblockUser={onUnblockUser}
      />
    </SafeAreaView>
  );
};

export default ParticipantProfileScreen;
