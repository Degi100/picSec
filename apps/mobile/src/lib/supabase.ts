/**
 * Supabase Client
 *
 * Nur fuer Google OAuth Authentication.
 * User-Daten werden in unserer MongoDB gespeichert, nicht in Supabase.
 */

import { createClient } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';

// ============================================================================
// Config (aus Environment Variables)
// ============================================================================

const SUPABASE_URL = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase credentials nicht konfiguriert! Setze EXPO_PUBLIC_SUPABASE_URL und EXPO_PUBLIC_SUPABASE_ANON_KEY in .env');
}

// ============================================================================
// Client
// ============================================================================

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // Kein Auto-Refresh - wir nutzen Supabase nur fuer OAuth
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

// ============================================================================
// OAuth Helpers
// ============================================================================

/**
 * Erstellt die Redirect URI fuer OAuth
 * In Expo Go: exp://192.168.x.x:8081/--/auth/callback
 * In Production: picsec://auth/callback
 */
export const getRedirectUri = () => {
  const redirectUri = Linking.createURL('auth/callback');
  console.log('Redirect URI:', redirectUri);
  return redirectUri;
};

/**
 * Extrahiert Tokens aus der Callback URL
 * Supabase sendet: #access_token=...&refresh_token=...&provider_token=...
 */
const extractTokensFromUrl = (url: string): {
  accessToken: string;
  refreshToken: string;
  providerToken: string;
} | null => {
  try {
    // Fragment (#) enthaelt die Tokens
    const hashIndex = url.indexOf('#');
    if (hashIndex === -1) return null;

    const fragment = url.substring(hashIndex + 1);
    const params = new URLSearchParams(fragment);

    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const providerToken = params.get('provider_token'); // Das ist das Google ID Token

    if (!accessToken) return null;

    return {
      accessToken,
      refreshToken: refreshToken || '',
      providerToken: providerToken || '',
    };
  } catch (error) {
    console.error('Token extraction error:', error);
    return null;
  }
};

/**
 * Startet den Google OAuth Flow via Supabase
 * Gibt das Google Provider Token zurueck, das wir an unser Backend senden
 */
export const signInWithGoogle = async (): Promise<string | null> => {
  const redirectUri = getRedirectUri();

  // OAuth URL von Supabase holen
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUri,
      skipBrowserRedirect: true,
    },
  });

  if (error || !data.url) {
    console.error('Supabase OAuth Error:', error);
    return null;
  }

  console.log('Opening OAuth URL:', data.url);

  // Browser oeffnen fuer OAuth
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);

  if (result.type !== 'success') {
    console.log('OAuth cancelled or failed:', result.type);
    return null;
  }

  // Tokens aus der Redirect URL extrahieren
  const tokens = extractTokensFromUrl(result.url);

  if (!tokens) {
    console.error('Could not extract tokens from URL');
    return null;
  }

  // Provider Token ist das Google Access Token
  // Wir senden es an unser Backend zur Verifizierung
  return tokens.providerToken || tokens.accessToken;
};
