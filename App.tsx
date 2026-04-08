import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import IncomingCallListener from './src/components/calls/IncomingCallListener';
import IncomingCallOverlay from './src/components/calls/IncomingCallOverlay';
import { navigationRef } from './src/navigation/navigationRef';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { IncomingCallProvider } from './src/context/IncomingCallContext';

function AuthIncomingCallBridge() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return null;
  }
  return (
    <>
      <IncomingCallListener />
      <IncomingCallOverlay />
    </>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <AuthProvider>
          <IncomingCallProvider>
            <NavigationContainer ref={navigationRef}>
              <StatusBar style="dark" />
              <AppNavigator />
              <AuthIncomingCallBridge />
            </NavigationContainer>
          </IncomingCallProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
