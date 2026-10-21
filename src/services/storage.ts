import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

/**
 * Browser storage can be unavailable (private windows, blocked site data,
 * sandboxed hosts). Then the app keeps working for the current visit from memory.
 */
const memory = new Map<string, string>();

const kv = {
  async get(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return memory.get(key) ?? null;
    }
  },
  async set(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch {
      memory.set(key, value);
    }
  },
  async remove(key: string): Promise<void> {
    memory.delete(key);
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // nothing persisted
    }
  },
};

/**
 * Secrets (the session token) go to the iOS Keychain / Android Keystore.
 * The web preview has no secure enclave, so it falls back to browser storage.
 */
export const secureStore = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === 'web') return kv.get(key);
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') return kv.set(key, value);
    return SecureStore.setItemAsync(key, value);
  },
  async remove(key: string): Promise<void> {
    if (Platform.OS === 'web') return kv.remove(key);
    return SecureStore.deleteItemAsync(key);
  },
};

export async function readJson<T>(key: string): Promise<T | null> {
  const raw = await kv.get(key);
  return raw ? (JSON.parse(raw) as T) : null;
}

export async function writeJson(key: string, value: unknown): Promise<void> {
  await kv.set(key, JSON.stringify(value));
}

export const removeKey = (key: string) => kv.remove(key);
