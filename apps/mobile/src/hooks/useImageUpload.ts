/**
 * useImageUpload Hook
 *
 * Hook zum Hochladen von Bildern in eine Galerie.
 */

import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { getAccessToken } from '@/stores/authStore';

// TODO: In Config auslagern
const API_BASE_URL = __DEV__
  ? 'http://192.168.1.100:3000/api/v1'
  : 'https://api.picsec.de/api/v1';

interface UploadProgress {
  current: number;
  total: number;
}

interface UseImageUploadOptions {
  galleryId: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export const useImageUpload = ({ galleryId, onSuccess, onError }: UseImageUploadOptions) => {
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (assets: ImagePicker.ImagePickerAsset[]) => {
      const token = getAccessToken();
      if (!token) {
        throw new Error('Nicht authentifiziert');
      }

      setProgress({ current: 0, total: assets.length });

      const results = [];

      for (let i = 0; i < assets.length; i++) {
        const asset = assets[i];
        setProgress({ current: i + 1, total: assets.length });

        const formData = new FormData();

        // File zum FormData hinzufuegen
        const filename = asset.uri.split('/').pop() || 'image.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        formData.append('image', {
          uri: asset.uri,
          name: filename,
          type,
        } as unknown as Blob);

        // Metadata hinzufuegen
        formData.append('width', String(asset.width));
        formData.append('height', String(asset.height));

        const response = await fetch(
          `${API_BASE_URL}/galleries/${galleryId}/images`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error?.message || 'Upload fehlgeschlagen');
        }

        const data = await response.json();
        results.push(data);
      }

      return results;
    },
    onSuccess: () => {
      setProgress(null);
      queryClient.invalidateQueries({ queryKey: ['gallery-images', galleryId] });
      queryClient.invalidateQueries({ queryKey: ['gallery', galleryId] });
      queryClient.invalidateQueries({ queryKey: ['galleries'] });
      onSuccess?.();
    },
    onError: (error: Error) => {
      setProgress(null);
      onError?.(error);
    },
  });

  const pickAndUpload = async () => {
    try {
      // Permission pruefen
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        onError?.(new Error('Zugriff auf Fotos wurde verweigert'));
        return;
      }

      // Bilder auswaehlen
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsMultipleSelection: true,
        quality: 0.8,
        exif: false,
      });

      if (result.canceled || result.assets.length === 0) {
        return;
      }

      // Upload starten
      uploadMutation.mutate(result.assets);
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error('Unbekannter Fehler'));
    }
  };

  const takePhotoAndUpload = async () => {
    try {
      // Camera Permission pruefen
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== 'granted') {
        onError?.(new Error('Zugriff auf Kamera wurde verweigert'));
        return;
      }

      // Foto aufnehmen
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
        exif: false,
      });

      if (result.canceled || result.assets.length === 0) {
        return;
      }

      // Upload starten
      uploadMutation.mutate(result.assets);
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error('Unbekannter Fehler'));
    }
  };

  return {
    pickAndUpload,
    takePhotoAndUpload,
    isUploading: uploadMutation.isPending,
    progress,
    error: uploadMutation.error,
  };
};
