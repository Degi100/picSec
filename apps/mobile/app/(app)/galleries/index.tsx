/**
 * Galleries Screen
 *
 * Liste aller Galerien des Users.
 */

import { useState } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { Link, Stack, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { api } from '@/api/client';
import { useAuthStore } from '@/stores/authStore';
import { CreateGalleryModal } from '@/components/CreateGalleryModal';
import { styles } from '@/styles/galleries';

interface Gallery {
  id: string;
  name: string;
  description: string | null;
  imageCount: number;
  memberCount: number;
  myRole: string;
}

const GalleriesScreen = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { logout } = useAuthStore();

  const {
    data,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['galleries'],
    queryFn: () => api.galleries.list(),
  });

  const galleries = data?.data.galleries ?? [];

  const renderGallery = ({ item }: { item: Gallery }) => (
    <Link href={`/(app)/galleries/${item.id}`} asChild>
      <Pressable style={styles.galleryCard}>
        <View style={styles.galleryInfo}>
          <Text style={styles.galleryName}>{item.name}</Text>
          {item.description && (
            <Text style={styles.galleryDescription} numberOfLines={1}>
              {item.description}
            </Text>
          )}
          <View style={styles.galleryMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="images-outline" size={14} color="#888" />
              <Text style={styles.metaText}>{item.imageCount}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="people-outline" size={14} color="#888" />
              <Text style={styles.metaText}>{item.memberCount}</Text>
            </View>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </Pressable>
    </Link>
  );

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
          headerLeft: () => (
            <Pressable style={styles.headerButton} onPress={logout}>
              <Ionicons name="log-out-outline" size={22} color="#fff" />
            </Pressable>
          ),
          headerRight: () => (
            <View style={styles.headerRight}>
              <Pressable
                style={styles.headerButton}
                onPress={() => router.push('/(app)/invites')}
              >
                <Ionicons name="mail-outline" size={22} color="#fff" />
              </Pressable>
              <Pressable
                style={styles.headerButton}
                onPress={() => setShowCreateModal(true)}
              >
                <Ionicons name="add" size={24} color="#fff" />
              </Pressable>
            </View>
          ),
        }}
      />

      <CreateGalleryModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />

      <FlatList
        data={galleries}
        keyExtractor={(item) => item.id}
        renderItem={renderGallery}
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
            <Ionicons name="images-outline" size={64} color="#444" />
            <Text style={styles.emptyText}>Keine Galerien</Text>
            <Text style={styles.emptySubtext}>
              Erstelle eine neue Galerie oder warte auf eine Einladung
            </Text>
          </View>
        }
      />
    </View>
  );
};

export default GalleriesScreen;
