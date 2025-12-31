/**
 * Index Route
 *
 * Redirect basierend auf Auth Status.
 */

import { Redirect } from 'expo-router';

import { useAuthStore } from '@/stores/authStore';

const Index = () => {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Redirect href="/(app)/galleries" />;
  }

  return <Redirect href="/(auth)/login" />;
};

export default Index;
