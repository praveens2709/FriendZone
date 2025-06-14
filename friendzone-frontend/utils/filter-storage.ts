import AsyncStorage from '@react-native-async-storage/async-storage';

const FILTER_KEY = 'FilterSettings';

export const removeFilterSettings = async () => {
  await AsyncStorage.removeItem(FILTER_KEY);
};
