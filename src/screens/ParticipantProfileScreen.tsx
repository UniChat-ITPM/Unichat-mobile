import React, { useCallback } from 'react';
import { Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ParticipantProfileView } from '../components/participant/ParticipantProfileView';
import { SCREENS } from '../constants';
import { colors } from '../theme/colors';

export type ParticipantProfileScreenParams = {
  participantName: string;
  subtitle?: string;
  mediaCount?: number;
  conversationId?: string;
  isGroup?: boolean;
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
  const params = route.params ?? { participantName: 'Chat' };
  const { participantName, subtitle, mediaCount = 0, conversationId, isGroup } = params as ParticipantProfileScreenParams;

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
      navigation.navigate(SCREENS.EDIT_GROUP, { conversationId, currentTitle: participantName });
    } else {
      Alert.alert('Edit', 'Editing contact details will be available soon.');
    }
  }, [isGroup, conversationId, navigation, participantName]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundSecondary }} edges={['top']}>
      <ParticipantProfileView
        participantName={participantName}
        subtitle={subtitle}
        mediaCount={mediaCount}
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
