import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_SINGLISH_TO_SINHALA = 'chatPrefs.singlishToSinhala';

export async function getSinglishToSinhalaEnabled(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(KEY_SINGLISH_TO_SINHALA);
    return v === '1';
  } catch {
    return false;
  }
}

export async function setSinglishToSinhalaEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(KEY_SINGLISH_TO_SINHALA, enabled ? '1' : '0');
}
