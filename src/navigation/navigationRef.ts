import { createNavigationContainerRef } from '@react-navigation/native';
import { SCREENS } from '../constants';
import type { CallScreenParams } from '../types/callScreenParams';

export type RootStackParamList = {
  [key: string]: object | undefined;
  [SCREENS.CALL]: CallScreenParams | undefined;
};

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigateToCallScreen(params: CallScreenParams): void {
  if (navigationRef.isReady()) {
    navigationRef.navigate(SCREENS.CALL, params);
  }
}
