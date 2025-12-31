/**
 * Expo App Config
 *
 * Dynamische Konfiguration mit Environment Variables.
 */

import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'PicSec',
  slug: 'picsec',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'picsec',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#000000',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'de.picsec.app',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#000000',
    },
    package: 'de.picsec.app',
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    [
      'expo-image-picker',
      {
        photosPermission: 'PicSec benoetigt Zugriff auf deine Fotos um sie in Galerien hochzuladen.',
        cameraPermission: 'PicSec benoetigt Zugriff auf die Kamera um Fotos aufzunehmen.',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    // API
    apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.100:3000/api/v1',
    // Supabase (nur fuer OAuth)
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  },
});
