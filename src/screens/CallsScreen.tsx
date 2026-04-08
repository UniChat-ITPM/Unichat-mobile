import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CallsMainView from '../components/calls/CallsMainView';
import { getCallLogEntries } from '../services/callLogStorage';
import type { CallLogEntry } from '../types/callLog';
import { colors } from '../theme/colors';

const CallsScreen = ({
  navigation,
}: {
  navigation: {
    goBack: () => void;
    canGoBack: () => boolean;
    navigate: (name: string, params?: object) => void;
  };
}) => {
  const showBack = navigation.canGoBack();
  const [recentCalls, setRecentCalls] = useState<CallLogEntry[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void getCallLogEntries().then((rows) => {
        if (active) {
          setRecentCalls(rows);
        }
      });
      return () => {
        active = false;
      };
    }, []),
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <CallsMainView
        recentCalls={recentCalls}
        shortcutContact={null}
        onBack={showBack ? () => navigation.goBack() : undefined}
        onMore={() => Alert.alert('More options', 'Coming soon.')}
        onNewCall={() =>
          Alert.alert(
            'New call',
            'Open Chats, select a private conversation, then tap the phone or video icon in the top bar.',
          )
        }
        onQuickAction={(key) => {
          Alert.alert(
            'Coming soon',
            key === 'call'
              ? 'Start a call from a private chat using the header icons.'
              : 'This action is not available yet.',
          );
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
});

export default CallsScreen;
