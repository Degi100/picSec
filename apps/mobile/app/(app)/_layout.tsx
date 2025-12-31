/**
 * App Layout (Authenticated)
 *
 * Layout fuer authentifizierte Screens.
 * Redirect zu Login wenn nicht eingeloggt.
 */

import { useEffect } from 'react';
import { View } from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuthStore } from '@/stores/authStore';

const AppLayout = () => {
  const { isAuthenticated } = useAuthStore();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: '#000' }}>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#000',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: '600',
          },
          contentStyle: {
            backgroundColor: '#111',
          },
        }}
      >
        <Stack.Screen
          name="galleries/index"
          options={{
            title: 'Galerien',
          }}
        />
        <Stack.Screen
          name="galleries/[id]"
          options={{
            title: 'Galerie',
          }}
        />
        <Stack.Screen
          name="invites"
          options={{
            title: 'Einladungen',
            presentation: 'modal',
          }}
        />
      </Stack>
    </View>
  );
};

export default AppLayout;
