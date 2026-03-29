import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';

import HomeScreen from '../screens/HomeScreen';
import CallsScreen from '../screens/CallsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AccountSettingsScreen from '../screens/AccountSettingsScreen';
import PrivacySafetyScreen from '../screens/PrivacySafetyScreen';
import NotificationsSettingsScreen from '../screens/NotificationsSettingsScreen';
import StorageDataScreen from '../screens/StorageDataScreen';
import HelpSupportScreen from '../screens/HelpSupportScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import BottomTabBar, { HomeTabKey } from '../components/BottomTabBar';
import { SCREENS } from '../constants';
import { colors } from '../theme/colors';
import { useChatsUnread } from '../context/ChatsUnreadContext';

const Tab = createBottomTabNavigator();
const SettingsStackNav = createStackNavigator();

function SettingsStackScreen() {
  return (
    <SettingsStackNav.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: colors.background },
        cardStyleInterpolator: ({ current, layouts }) => ({
          cardStyle: {
            transform: [
              {
                translateX: current.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [layouts.screen.width, 0],
                }),
              },
            ],
          },
        }),
      }}
    >
      <SettingsStackNav.Screen name={SCREENS.SETTINGS} component={SettingsScreen} />
      <SettingsStackNav.Screen name={SCREENS.ACCOUNT_SETTINGS} component={AccountSettingsScreen} />
      <SettingsStackNav.Screen name={SCREENS.PRIVACY_SAFETY} component={PrivacySafetyScreen} />
      <SettingsStackNav.Screen
        name={SCREENS.NOTIFICATIONS_SETTINGS}
        component={NotificationsSettingsScreen}
      />
      <SettingsStackNav.Screen name={SCREENS.STORAGE_DATA} component={StorageDataScreen} />
      <SettingsStackNav.Screen name={SCREENS.HELP_SUPPORT} component={HelpSupportScreen} />
      <SettingsStackNav.Screen name={SCREENS.EDIT_PROFILE} component={EditProfileScreen} />
    </SettingsStackNav.Navigator>
  );
}

const ROUTE_TO_TAB_KEY: Record<string, HomeTabKey> = {
  [SCREENS.TAB_CHATS]: 'chats',
  [SCREENS.TAB_GROUPS]: 'groups',
  [SCREENS.TAB_CALLS]: 'calls',
  [SCREENS.TAB_SETTINGS]: 'settings',
};

const TAB_KEY_TO_ROUTE: Record<HomeTabKey, string> = {
  chats: SCREENS.TAB_CHATS,
  groups: SCREENS.TAB_GROUPS,
  calls: SCREENS.TAB_CALLS,
  settings: SCREENS.TAB_SETTINGS,
};

function UniChatTabBar({ state, navigation }: BottomTabBarProps) {
  const currentName = state.routes[state.index].name;
  const activeTab = ROUTE_TO_TAB_KEY[currentName] ?? 'chats';
  const { chatsTabUnread, groupsTabUnread } = useChatsUnread();

  return (
    <BottomTabBar
      activeTab={activeTab}
      badgeByTab={{
        chats: chatsTabUnread,
        groups: groupsTabUnread,
      }}
      onTabPress={(tab) => {
        navigation.navigate(TAB_KEY_TO_ROUTE[tab]);
      }}
    />
  );
}

function ChatsTabScreen(props: any) {
  return <HomeScreen {...props} variant="chats" />;
}

function GroupsTabScreen(props: any) {
  return <HomeScreen {...props} variant="groups" />;
}

const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <UniChatTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name={SCREENS.TAB_CHATS} component={ChatsTabScreen} options={{ title: 'Chats' }} />
      <Tab.Screen name={SCREENS.TAB_GROUPS} component={GroupsTabScreen} options={{ title: 'Groups' }} />
      <Tab.Screen name={SCREENS.TAB_CALLS} component={CallsScreen} options={{ title: 'Calls' }} />
      <Tab.Screen
        name={SCREENS.TAB_SETTINGS}
        component={SettingsStackScreen}
        options={{ title: 'Settings' }}
      />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;
