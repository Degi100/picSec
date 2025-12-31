/**
 * Image Grid
 *
 * Grid-Anzeige der Bilder einer Galerie.
 */

import { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery } from '@tanstack/react-query';

import { api } from '@/api/client';
import { getAccessToken } from '@/stores/authStore';

// TODO: In Config auslagern
const API_BASE_URL = __DEV__
  ? 'http://192.168.1.100:3000/api/v1'
  : 'https://api.picsec.de/api/v1';

interface ImageGridProps {
  galleryId: string;
  onImagePress?: (imageId: string) => void;
  onUploadPress?: () => void;
}

interface GalleryImage {
  id: string;
  thumbnailPath: string;
  width: number;
  height: number;
}

/**
 * Baut die URL zum Laden eines Bild-Thumbnails
 */
const getImageUrl = (imageId: string): string => {
  return `${API_BASE_URL}/images/${imageId}/thumbnail`;
};

const COLUMNS = 3;
const GAP = 2;
const screenWidth = Dimensions.get('window').width;
const imageSize = (screenWidth - GAP * (COLUMNS + 1)) / COLUMNS;

export const ImageGrid = ({ galleryId, onImagePress, onUploadPress }: ImageGridProps) => {
  const {
    data,
    isLoading,
    isError,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['gallery-images', galleryId],
    queryFn: ({ pageParam }) => api.images.list(galleryId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.data.hasMore ? lastPage.data.nextCursor : undefined,
    enabled: !!galleryId,
  });

  const images = data?.pages.flatMap((page) => page.data.images) ?? [];

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderImage = ({ item }: { item: GalleryImage }) => {
    const token = getAccessToken();
    const imageUrl = getImageUrl(item.id);

    return (
      <Pressable
        style={styles.imageContainer}
        onPress={() => onImagePress?.(item.id)}
      >
        <Image
          source={{
            uri: imageUrl,
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          }}
          style={styles.image}
          contentFit="cover"
          transition={200}
        />
      </Pressable>
    );
  };

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#fff" />
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

  if (images.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="images-outline" size={64} color="#444" />
        <Text style={styles.emptyText}>Noch keine Bilder</Text>
        {onUploadPress && (
          <Pressable style={styles.uploadButton} onPress={onUploadPress}>
            <Ionicons name="cloud-upload-outline" size={20} color="#000" />
            <Text style={styles.uploadText}>Bilder hochladen</Text>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <FlatList
      data={images}
      keyExtractor={(item) => item.id}
      renderItem={renderImage}
      numColumns={COLUMNS}
      contentContainerStyle={styles.list}
      columnWrapperStyle={styles.row}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor="#fff"
        />
      }
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.5}
      ListFooterComponent={renderFooter}
    />
  );
};

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#888',
    fontSize: 16,
    marginBottom: 12,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#333',
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 14,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    color: '#666',
    fontSize: 18,
    marginTop: 16,
    marginBottom: 24,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  uploadText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  list: {
    padding: GAP,
  },
  row: {
    gap: GAP,
    marginBottom: GAP,
  },
  imageContainer: {
    width: imageSize,
    height: imageSize,
    backgroundColor: '#222',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  footer: {
    padding: 16,
    alignItems: 'center',
  },
});
