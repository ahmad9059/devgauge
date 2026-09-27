import * as SecureStore from 'expo-secure-store';

import type { SecretStore } from './secret-store';

/**
 * Android Keystore-backed secret storage. Uses async APIs only. Android backup
 * excludes these values (see the expo-secure-store config plugin), and values
 * are never logged.
 */
export function createSecureStoreBackend(): SecretStore {
  return {
    get: (key) => SecureStore.getItemAsync(key),
    set: (key, value) => SecureStore.setItemAsync(key, value),
    delete: (key) => SecureStore.deleteItemAsync(key),
  };
}
