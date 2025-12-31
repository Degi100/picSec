/**
 * Storage Abstraction
 *
 * Verwendet SecureStore auf Native, localStorage auf Web.
 */

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Speichert einen Wert sicher
 */
export const setItem = async (key: string, value: string): Promise<void> => {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
};

/**
 * Liest einen gespeicherten Wert
 */
export const getItem = async (key: string): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  } else {
    return await SecureStore.getItemAsync(key);
  }
};

/**
 * Loescht einen gespeicherten Wert
 */
export const deleteItem = async (key: string): Promise<void> => {
  if (Platform.OS === 'web') {
    localStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
};
