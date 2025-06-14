import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_KEY = 'AuthSession';

export const storeAuthSession = async (session: any) => {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
};

export const getAuthSession = async (): Promise<string | null> => {
  return await AsyncStorage.getItem(SESSION_KEY);
};

export const removeAuthSession = async () => {
  await AsyncStorage.removeItem(SESSION_KEY);
};