import React, { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { ParticipantProfileView } from '../components/participant/ParticipantProfileView';
import { SCREENS } from '../constants';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { getConversation } from '../services/conversationsApi';
import type { GroupMemberListItem } from '../types/groupMember';
import { mapParticipantsToGroupMemberList } from '../utils/groupMembers';

export type ParticipantProfileScreenParams = {
  participantName: string;
  subtitle?: string;
  mediaCount?: number;
  conversationId?: string;
  isGroup?: boolean;
  imageUrl?: string | null;
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
  } = params as ParticipantProfileScreenParams;

  const [groupMembers, setGroupMembers] = useState<GroupMemberListItem[]>([]);
  const [groupMembersLoading, setGroupMembersLoading] = useState(false);

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
    Alert.alert(
      'Block user?',
      `${participantName} will no longer be able to message you.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: () => Alert.alert('Blocked', 'User blocked (demo).'),
        },
      ],
    );
  }, [participantName]);

  const onReportAndBlock = useCallback(() => {
    Alert.alert(
      'Report and block?',
      'This user will be reported and blocked.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report and block',
          style: 'destructive',
          onPress: () => Alert.alert('Submitted', 'Report received. User blocked (demo).'),
        },
      ],
    );
  }, []);

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
      />
    </SafeAreaView>
  );
};

export default ParticipantProfileScreen;
