import AsyncStorage from '@react-native-async-storage/async-storage';

/** Cache JSON no sensible (perfil, preferencias, installation id). */
export const appStorage = {
  async get<T>(key: string): Promise<T | null> {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },
  async set<T>(key: string, value: T): Promise<void> {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  },
  async remove(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  },
};

export const STORAGE_KEYS = {
  installationId: 'rutard-cliente.installationId',
  authProfile: 'rutard-cliente.authProfile',
  themeMode: 'rutard-cliente.themeMode',
} as const;
