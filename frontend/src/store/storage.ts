import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Use AsyncStorage for all platforms (more compatible)
// MMKV can be added later for native-only performance boost

export const localStorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(key);
    } catch (e) {
      console.error('Error getting item from storage:', e);
      return null;
    }
  },
  
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      console.error('Error setting item in storage:', e);
    }
  },
  
  removeItem: async (key: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (e) {
      console.error('Error removing item from storage:', e);
    }
  },
};

export default localStorageAdapter;
