import React from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { createStackNavigator, type StackCardInterpolationProps } from "@react-navigation/stack";

import Onboarding1Screen from "../screens/Onboarding1Screen";
import Onboarding2Screen from "../screens/Onboarding2Screen";
import Onboarding3Screen from "../screens/Onboarding3Screen";
import LoginScreen from "../screens/LoginScreen";
import OTPScreen from "../screens/OTPScreen";
import ProfileSetupScreen from "../screens/ProfileSetupScreen";
import MainTabNavigator from './MainTabNavigator';
import ChatScreen from '../screens/ChatScreen';
import NewChatScreen from '../screens/NewChatScreen';
import ParticipantProfileScreen from '../screens/ParticipantProfileScreen';
import ConversationMediaScreen from '../screens/ConversationMediaScreen';
import EditGroupScreen from '../screens/EditGroupScreen';
import CallScreen from '../screens/CallScreen';
import { SCREENS } from "../constants";
import { useAuth } from "../context/AuthContext";
import { ChatsUnreadProvider } from "../context/ChatsUnreadContext";
import { colors } from "../theme/colors";

const Stack = createStackNavigator();

const stackScreenOptions = {
  headerShown: false,
  cardStyle: { backgroundColor: "#fff" },
  cardStyleInterpolator: ({ current, layouts }: StackCardInterpolationProps) => ({
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
};

const AppNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <Stack.Navigator screenOptions={stackScreenOptions}>
        <Stack.Screen name={SCREENS.ONBOARDING_1} component={Onboarding1Screen} />
        <Stack.Screen name={SCREENS.ONBOARDING_2} component={Onboarding2Screen} />
        <Stack.Screen name={SCREENS.ONBOARDING_3} component={Onboarding3Screen} />
        <Stack.Screen name={SCREENS.LOGIN} component={LoginScreen} />
        <Stack.Screen name={SCREENS.OTP} component={OTPScreen} />
        <Stack.Screen name={SCREENS.PROFILE_SETUP} component={ProfileSetupScreen} />
      </Stack.Navigator>
    );
  }

  return (
    <ChatsUnreadProvider>
      <Stack.Navigator screenOptions={stackScreenOptions}>
        <Stack.Screen name={SCREENS.MAIN} component={MainTabNavigator} />
        <Stack.Screen name={SCREENS.CHAT} component={ChatScreen} />
        <Stack.Screen name={SCREENS.NEW_CHAT} component={NewChatScreen} />
        <Stack.Screen name={SCREENS.PARTICIPANT_PROFILE} component={ParticipantProfileScreen} />
        <Stack.Screen name={SCREENS.CONVERSATION_MEDIA} component={ConversationMediaScreen} />
        <Stack.Screen name={SCREENS.EDIT_GROUP} component={EditGroupScreen} />
        <Stack.Screen name={SCREENS.CALL} component={CallScreen} />
      </Stack.Navigator>
    </ChatsUnreadProvider>
  );
};

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.backgroundSecondary,
  },
});

export default AppNavigator;
