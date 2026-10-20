import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_KEY = 'AuthSession';

export const storeAuthSession = async (session: any) => {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
};

export const getAuthSession = async (): Promise<string | null> => {
  const secure = await SecureStore.getItemAsync(SESSION_KEY);
  if (secure) return secure;

  const legacy = await AsyncStorage.getItem(SESSION_KEY);
  if (legacy) {
    await SecureStore.setItemAsync(SESSION_KEY, legacy);
    await AsyncStorage.removeItem(SESSION_KEY);
    return legacy;
  }

  return null;
};

export const removeAuthSession = async () => {
  await SecureStore.deleteItemAsync(SESSION_KEY);
  await AsyncStorage.removeItem(SESSION_KEY);
  await AsyncStorage.removeItem('userToken');
};
