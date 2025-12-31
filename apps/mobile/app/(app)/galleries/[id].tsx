/**
 * Gallery Detail Screen
 *
 * Zeigt Bilder einer Galerie an.
 */

import { useState } from 'react';
import { View, Text, ActivityIndicator, Pressable, Alert, Platform, ActionSheetIOS } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { api } from '@/api/client';
import { ImageGrid } from '@/components/ImageGrid';
import { InviteUserModal } from '@/components/InviteUserModal';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useAuthStore } from '@/stores/authStore';
import { styles } from '@/styles/gallery';

const GalleryScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const { user } = useAuthStore();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['gallery', id],
    queryFn: () => api.galleries.get(id),
    enabled: !!id,
  });

  const gallery = data?.data.gallery;

  const { pickAndUpload, takePhotoAndUpload, isUploading, progress } = useImageUpload({
    galleryId: id,
    onError: (error) => {
      Alert.alert('Upload Fehler', error.message);
    },
  });

  const handleUploadPress = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Abbrechen', 'Foto aufnehmen', 'Aus Galerie waehlen'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            takePhotoAndUpload();
          } else if (buttonIndex === 2) {
            pickAndUpload();
          }
        }
      );
    } else {
      // Android: Einfaches Alert
      Alert.alert(
        'Bilder hinzufuegen',
        'Wie moechtest du Bilder hinzufuegen?',
        [
          { text: 'Abbrechen', style: 'cancel' },
          { text: 'Foto aufnehmen', onPress: takePhotoAndUpload },
          { text: 'Aus Galerie', onPress: pickAndUpload },
        ]
      );
    }
  };

  // Pruefen ob User der Owner ist
  const isOwner = gallery?.ownerId === user?.id;

  const handleOptionsPress = () => {
    if (Platform.OS === 'ios') {
      const options = ['Abbrechen'];
      if (isOwner) {
        options.push('User einladen');
      }
      options.push('Galerie-Info');

      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (isOwner && buttonIndex === 1) {
            setShowInviteModal(true);
          }
          // Weitere Optionen hier hinzufuegen
        }
      );
    } else {
      // Android: Alert Dialog
      const buttons: { text: string; onPress?: () => void; style?: 'cancel' | 'default' | 'destructive' }[] = [
        { text: 'Abbrechen', style: 'cancel' },
      ];
      if (isOwner) {
        buttons.push({ text: 'User einladen', onPress: () => setShowInviteModal(true) });
      }
      buttons.push({ text: 'Galerie-Info', onPress: () => {} });

      Alert.alert('Optionen', undefined, buttons);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  if (isError || !gallery) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Galerie nicht gefunden</Text>
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
          title: gallery.name,
          headerRight: () => (
            <View style={styles.headerButtons}>
              <Pressable
                style={styles.headerButton}
                onPress={handleUploadPress}
                disabled={isUploading}
              >
                {isUploading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="add-circle-outline" size={24} color="#fff" />
                )}
              </Pressable>
              <Pressable style={styles.headerButton} onPress={handleOptionsPress}>
                <Ionicons name="ellipsis-horizontal" size={24} color="#fff" />
              </Pressable>
            </View>
          ),
        }}
      />

      {/* Upload Progress */}
      {isUploading && progress && (
        <View style={styles.progressBar}>
          <Text style={styles.progressText}>
            Lade hoch... {progress.current}/{progress.total}
          </Text>
        </View>
      )}

      {/* Image Grid */}
      <ImageGrid
        galleryId={id}
        onUploadPress={handleUploadPress}
      />

      {/* Invite Modal */}
      <InviteUserModal
        visible={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        galleryId={id}
        galleryName={gallery.name}
      />
    </View>
  );
};

export default GalleryScreen;
