/**
 * Auth Store
 *
 * Zustand Store fuer Authentifizierung.
 * Speichert User, Tokens und Keypair.
 */

import { create } from 'zustand';

import { loadKeyPair, saveKeyPair, deleteKeyPair, type KeyPair } from '@/lib/crypto';
import { setItem, getItem, deleteItem } from '@/lib/storage';

// ============================================================================
// Types
// ============================================================================

interface User {
  id: string;
  email: string;
  displayName: string;
  publicKey: string;
  appRole: string;
}

interface Tokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthState {
  user: User | null;
  tokens: Tokens | null;
  keyPair: KeyPair | null;
  isAuthenticated: boolean;
  isInitialized: boolean;

  // Actions
  initialize: () => Promise<void>;
  setAuth: (user: User, tokens: Tokens) => Promise<void>;
  setKeyPair: (keyPair: KeyPair) => Promise<void>;
  updateTokens: (tokens: Tokens) => Promise<void>;
  logout: () => Promise<void>;
}

// ============================================================================
// Storage Keys
// ============================================================================

const STORAGE_KEYS = {
  USER: 'picsec_user',
  TOKENS: 'picsec_tokens',
} as const;

// ============================================================================
// Store
// ============================================================================

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  tokens: null,
  keyPair: null,
  isAuthenticated: false,
  isInitialized: false,

  /**
   * Initialisiert den Store aus Storage
   */
  initialize: async () => {
    try {
      // User laden
      const userJson = await getItem(STORAGE_KEYS.USER);
      const user = userJson ? JSON.parse(userJson) : null;

      // Tokens laden
      const tokensJson = await getItem(STORAGE_KEYS.TOKENS);
      const tokens = tokensJson ? JSON.parse(tokensJson) : null;

      // Keypair laden
      const keyPair = await loadKeyPair();

      set({
        user,
        tokens,
        keyPair,
        isAuthenticated: !!user && !!tokens,
        isInitialized: true,
      });
    } catch (error) {
      console.error('Auth Store Initialize Error:', error);
      set({ isInitialized: true });
    }
  },

  /**
   * Setzt User und Tokens nach Login/Register
   */
  setAuth: async (user, tokens) => {
    try {
      await setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      await setItem(STORAGE_KEYS.TOKENS, JSON.stringify(tokens));

      set({
        user,
        tokens,
        isAuthenticated: true,
      });
    } catch (error) {
      console.error('Auth Store setAuth Error:', error);
      throw error;
    }
  },

  /**
   * Speichert Keypair
   */
  setKeyPair: async (keyPair) => {
    try {
      await saveKeyPair(keyPair);
      set({ keyPair });
    } catch (error) {
      console.error('Auth Store setKeyPair Error:', error);
      throw error;
    }
  },

  /**
   * Aktualisiert nur die Tokens (nach Refresh)
   */
  updateTokens: async (tokens) => {
    try {
      await setItem(STORAGE_KEYS.TOKENS, JSON.stringify(tokens));
      set({ tokens });
    } catch (error) {
      console.error('Auth Store updateTokens Error:', error);
      throw error;
    }
  },

  /**
   * Logout - Loescht alle gespeicherten Daten
   */
  logout: async () => {
    try {
      await deleteItem(STORAGE_KEYS.USER);
      await deleteItem(STORAGE_KEYS.TOKENS);
      await deleteKeyPair();

      set({
        user: null,
        tokens: null,
        keyPair: null,
        isAuthenticated: false,
      });
    } catch (error) {
      console.error('Auth Store logout Error:', error);
      throw error;
    }
  },
}));

/**
 * Helper: Gibt den aktuellen Access Token zurueck
 */
export const getAccessToken = (): string | null => {
  return useAuthStore.getState().tokens?.accessToken ?? null;
};

/**
 * Helper: Gibt den aktuellen Refresh Token zurueck
 */
export const getRefreshToken = (): string | null => {
  return useAuthStore.getState().tokens?.refreshToken ?? null;
};
