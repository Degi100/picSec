/**
 * Create Gallery Modal
 *
 * Modal zum Erstellen einer neuen Galerie.
 */

import { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { api } from '@/api/client';
import { useAuthStore } from '@/stores/authStore';
import {
  generateSymmetricKey,
  encryptForRecipient,
  encodeBase64,
  decodeBase64,
} from '@/lib/crypto';

interface CreateGalleryModalProps {
  visible: boolean;
  onClose: () => void;
}

export const CreateGalleryModal = ({ visible, onClose }: CreateGalleryModalProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const queryClient = useQueryClient();
  const { keyPair } = useAuthStore();

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!keyPair) {
        throw new Error('Kein Keypair vorhanden');
      }

      // Galerie-Key generieren
      const galleryKey = generateSymmetricKey();

      // Key fuer sich selbst verschluesseln
      const encryptedKey = encryptForRecipient(
        galleryKey,
        keyPair.publicKey,
        keyPair.secretKey
      );

      return api.galleries.create({
        name: name.trim(),
        description: description.trim() || undefined,
        encryptedGalleryKey: encodeBase64(encryptedKey),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['galleries'] });
      handleClose();
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleClose = () => {
    setName('');
    setDescription('');
    setError('');
    onClose();
  };

  const handleCreate = () => {
    setError('');

    if (!name.trim()) {
      setError('Name ist erforderlich');
      return;
    }

    createMutation.mutate();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleClose} style={styles.headerButton}>
            <Text style={styles.cancelText}>Abbrechen</Text>
          </Pressable>
          <Text style={styles.title}>Neue Galerie</Text>
          <Pressable
            onPress={handleCreate}
            style={styles.headerButton}
            disabled={createMutation.isPending || !name.trim()}
          >
            {createMutation.isPending ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <Text
                style={[
                  styles.createText,
                  !name.trim() && styles.createTextDisabled,
                ]}
              >
                Erstellen
              </Text>
            )}
          </Pressable>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color="#ff4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="z.B. Urlaub 2024"
              placeholderTextColor="#666"
              autoFocus
              maxLength={100}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Beschreibung</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Optional"
              placeholderTextColor="#666"
              multiline
              numberOfLines={3}
              maxLength={500}
            />
          </View>

          <View style={styles.info}>
            <Ionicons name="lock-closed" size={16} color="#888" />
            <Text style={styles.infoText}>
              Die Galerie wird Ende-zu-Ende verschluesselt erstellt.
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerButton: {
    minWidth: 80,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  cancelText: {
    fontSize: 16,
    color: '#007AFF',
  },
  createText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    textAlign: 'right',
  },
  createTextDisabled: {
    color: '#444',
  },
  form: {
    padding: 16,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 14,
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#888',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#222',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#333',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#888',
    flex: 1,
  },
});
