import { MMKV } from 'react-native-mmkv';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Try MMKV first, fallback to AsyncStorage for web
let storage: MMKV | null = null;
let useMMKV = false;

try {
  storage = new MMKV();
  useMMKV = true;
} catch (e) {
  console.log('MMKV not available, using AsyncStorage fallback');
  useMMKV = false;
}

export const localStorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (useMMKV && storage) {
      return storage.getString(key) ?? null;
    }
    return AsyncStorage.getItem(key);
  },
  
  setItem: async (key: string, value: string): Promise<void> => {
    if (useMMKV && storage) {
      storage.set(key, value);
      return;
    }
    return AsyncStorage.setItem(key, value);
  },
  
  removeItem: async (key: string): Promise<void> => {
    if (useMMKV && storage) {
      storage.delete(key);
      return;
    }
    return AsyncStorage.removeItem(key);
  },
};

export default localStorageAdapter;
