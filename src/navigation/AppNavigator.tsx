import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import Onboarding1Screen from '../screens/Onboarding1Screen';
import Onboarding2Screen from '../screens/Onboarding2Screen';
import Onboarding3Screen from '../screens/Onboarding3Screen';
import LoginScreen from '../screens/LoginScreen';
import OTPScreen from '../screens/OTPScreen';
import ProfileSetupScreen from '../screens/ProfileSetupScreen';
import { SCREENS } from '../constants';

const Stack = createStackNavigator();

const AppNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName={SCREENS.ONBOARDING_1}
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#fff' },
        // Smooth slide transition
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
      <Stack.Screen name={SCREENS.ONBOARDING_1} component={Onboarding1Screen} />
      <Stack.Screen name={SCREENS.ONBOARDING_2} component={Onboarding2Screen} />
      <Stack.Screen name={SCREENS.ONBOARDING_3} component={Onboarding3Screen} />
      <Stack.Screen name={SCREENS.LOGIN} component={LoginScreen} />
      <Stack.Screen name={SCREENS.OTP} component={OTPScreen} />
      <Stack.Screen name={SCREENS.PROFILE_SETUP} component={ProfileSetupScreen} />
    </Stack.Navigator>
  );
};

export default AppNavigator;
