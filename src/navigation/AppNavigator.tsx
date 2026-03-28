import React from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { createStackNavigator } from "@react-navigation/stack";

import Onboarding1Screen from "../screens/Onboarding1Screen";
import Onboarding2Screen from "../screens/Onboarding2Screen";
import Onboarding3Screen from "../screens/Onboarding3Screen";
import LoginScreen from "../screens/LoginScreen";
import OTPScreen from "../screens/OTPScreen";
import ProfileSetupScreen from "../screens/ProfileSetupScreen";
import MainTabNavigator from './MainTabNavigator';
import ChatScreen from '../screens/ChatScreen';
import ParticipantProfileScreen from '../screens/ParticipantProfileScreen';
import { SCREENS } from "../constants";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme/colors";

const Stack = createStackNavigator();

const AppNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: "#fff" },
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
      {isAuthenticated ? (
        <>
          <Stack.Screen name={SCREENS.MAIN} component={MainTabNavigator} />
          <Stack.Screen name={SCREENS.CHAT} component={ChatScreen} />
          <Stack.Screen name={SCREENS.PARTICIPANT_PROFILE} component={ParticipantProfileScreen} />
        </>
      ) : (
        <>
          <Stack.Screen
            name={SCREENS.ONBOARDING_1}
            component={Onboarding1Screen}
          />
          <Stack.Screen
            name={SCREENS.ONBOARDING_2}
            component={Onboarding2Screen}
          />
          <Stack.Screen
            name={SCREENS.ONBOARDING_3}
            component={Onboarding3Screen}
          />
          <Stack.Screen name={SCREENS.LOGIN} component={LoginScreen} />
          <Stack.Screen name={SCREENS.OTP} component={OTPScreen} />
          <Stack.Screen
            name={SCREENS.PROFILE_SETUP}
            component={ProfileSetupScreen}
          />
        </>
      )}
    </Stack.Navigator>
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
