/**
 * Pending Invites Screen
 *
 * Liste aller ausstehenden Einladungen des Users.
 */

import { View, Text, FlatList, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { Stack, router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { api } from '@/api/client';
import { styles } from '@/styles/invites';

interface PendingInvite {
  id: string;
  gallery: {
    id: string;
    name: string;
    description: string | null;
  } | null;
  inviter: {
    id: string;
    displayName: string;
  } | null;
  role: string;
  createdAt: string;
  expiresAt: string;
}

const InvitesScreen = () => {
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['pending-invites'],
    queryFn: () => api.invites.pending(),
  });

  const acceptMutation = useMutation({
    mutationFn: (inviteId: string) => {
      // TODO: Hier muesste der verschluesselte Gallery Key uebergeben werden
      // Fuer jetzt erstmal ohne Encryption
      return api.invites.accept(inviteId, 'placeholder-key');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-invites'] });
      queryClient.invalidateQueries({ queryKey: ['galleries'] });
    },
  });

  const declineMutation = useMutation({
    mutationFn: (inviteId: string) => api.invites.decline(inviteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-invites'] });
    },
  });

  const invites = data?.data.invites ?? [];

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'photoshoter':
        return 'Photoshoter';
      case 'viewer':
        return 'Viewer';
      default:
        return role;
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'photoshoter':
        return 'camera-outline';
      case 'viewer':
        return 'eye-outline';
      default:
        return 'person-outline';
    }
  };

  const renderInvite = ({ item }: { item: PendingInvite }) => {
    const isPending = acceptMutation.isPending || declineMutation.isPending;
    const isThisAccepting = acceptMutation.isPending && acceptMutation.variables === item.id;
    const isThisDeclining = declineMutation.isPending && declineMutation.variables === item.id;

    // Galerie nicht mehr vorhanden
    if (!item.gallery) {
      return null;
    }

    return (
      <View style={styles.inviteCard}>
        <View style={styles.inviteHeader}>
          <Ionicons name="images-outline" size={20} color="#007AFF" />
          <Text style={styles.galleryName}>{item.gallery.name}</Text>
        </View>

        <View style={styles.inviteInfo}>
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={16} color="#888" />
            <Text style={styles.infoText}>Eingeladen von {item.inviter?.displayName ?? 'Unbekannt'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name={getRoleIcon(item.role) as any} size={16} color="#888" />
            <Text style={styles.infoText}>Rolle: {getRoleLabel(item.role)}</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            style={[styles.button, styles.declineButton]}
            onPress={() => declineMutation.mutate(item.id)}
            disabled={isPending}
          >
            {isThisDeclining ? (
              <ActivityIndicator size="small" color="#ff4444" />
            ) : (
              <>
                <Ionicons name="close" size={18} color="#ff4444" />
                <Text style={styles.declineText}>Ablehnen</Text>
              </>
            )}
          </Pressable>
          <Pressable
            style={[styles.button, styles.acceptButton]}
            onPress={() => acceptMutation.mutate(item.id)}
            disabled={isPending}
          >
            {isThisAccepting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark" size={18} color="#fff" />
                <Text style={styles.acceptText}>Annehmen</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Fehler beim Laden</Text>
        <Pressable style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryText}>Nochmal versuchen</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Einladungen',
          headerLeft: () => (
            <Pressable style={styles.headerButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </Pressable>
          ),
        }}
      />

      <FlatList
        data={invites}
        keyExtractor={(item) => item.id}
        renderItem={renderInvite}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="#fff"
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="mail-outline" size={64} color="#444" />
            <Text style={styles.emptyText}>Keine Einladungen</Text>
            <Text style={styles.emptySubtext}>
              Du hast aktuell keine ausstehenden Einladungen
            </Text>
          </View>
        }
      />
    </View>
  );
};

export default InvitesScreen;
