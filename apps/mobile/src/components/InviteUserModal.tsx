/**
 * Invite User Modal
 *
 * Modal zum Einladen eines Users per Email in eine Galerie.
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
import { useMutation } from '@tanstack/react-query';

import { api } from '@/api/client';

interface InviteUserModalProps {
  visible: boolean;
  onClose: () => void;
  galleryId: string;
  galleryName: string;
}

export const InviteUserModal = ({
  visible,
  onClose,
  galleryId,
  galleryName,
}: InviteUserModalProps) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'viewer' | 'photoshoter'>('viewer');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const inviteMutation = useMutation({
    mutationFn: () => api.invites.inviteByEmail(galleryId, email.trim().toLowerCase(), role),
    onSuccess: (data) => {
      setSuccess(`${data.data.invite.targetUser.displayName} wurde eingeladen!`);
      setEmail('');
      // Nach 2 Sekunden schliessen
      setTimeout(() => {
        handleClose();
      }, 2000);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleClose = () => {
    setEmail('');
    setRole('viewer');
    setError('');
    setSuccess('');
    onClose();
  };

  const handleInvite = () => {
    setError('');
    setSuccess('');

    if (!email.trim()) {
      setError('Email ist erforderlich');
      return;
    }

    // Einfache Email-Validierung
    if (!email.includes('@') || !email.includes('.')) {
      setError('Ungueltige Email-Adresse');
      return;
    }

    inviteMutation.mutate();
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
          <Text style={styles.title}>User einladen</Text>
          <Pressable
            onPress={handleInvite}
            style={styles.headerButton}
            disabled={inviteMutation.isPending || !email.trim() || !!success}
          >
            {inviteMutation.isPending ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <Text
                style={[
                  styles.sendText,
                  (!email.trim() || !!success) && styles.sendTextDisabled,
                ]}
              >
                Einladen
              </Text>
            )}
          </Pressable>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Galerie Info */}
          <View style={styles.galleryInfo}>
            <Ionicons name="images-outline" size={20} color="#888" />
            <Text style={styles.galleryName}>{galleryName}</Text>
          </View>

          {/* Success Message */}
          {success ? (
            <View style={styles.successContainer}>
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              <Text style={styles.successText}>{success}</Text>
            </View>
          ) : null}

          {/* Error Message */}
          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color="#ff4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email-Adresse *</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="user@example.com"
              placeholderTextColor="#666"
              autoFocus
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Role Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Rolle</Text>
            <View style={styles.roleContainer}>
              <Pressable
                style={[styles.roleButton, role === 'viewer' && styles.roleButtonActive]}
                onPress={() => setRole('viewer')}
              >
                <Ionicons
                  name="eye-outline"
                  size={20}
                  color={role === 'viewer' ? '#fff' : '#888'}
                />
                <Text style={[styles.roleText, role === 'viewer' && styles.roleTextActive]}>
                  Viewer
                </Text>
                <Text style={styles.roleDescription}>Kann Bilder ansehen</Text>
              </Pressable>

              <Pressable
                style={[styles.roleButton, role === 'photoshoter' && styles.roleButtonActive]}
                onPress={() => setRole('photoshoter')}
              >
                <Ionicons
                  name="camera-outline"
                  size={20}
                  color={role === 'photoshoter' ? '#fff' : '#888'}
                />
                <Text style={[styles.roleText, role === 'photoshoter' && styles.roleTextActive]}>
                  Photoshoter
                </Text>
                <Text style={styles.roleDescription}>Kann Bilder hochladen</Text>
              </Pressable>
            </View>
          </View>

          {/* Info */}
          <View style={styles.info}>
            <Ionicons name="information-circle-outline" size={16} color="#888" />
            <Text style={styles.infoText}>
              Der User muss bereits bei PicSec registriert sein.
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
  sendText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    textAlign: 'right',
  },
  sendTextDisabled: {
    color: '#444',
  },
  form: {
    padding: 16,
  },
  galleryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#222',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  galleryName: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '500',
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  successText: {
    color: '#4CAF50',
    fontSize: 14,
    flex: 1,
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
  roleContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  roleButton: {
    flex: 1,
    backgroundColor: '#222',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#333',
  },
  roleButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  roleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    marginTop: 4,
  },
  roleTextActive: {
    color: '#fff',
  },
  roleDescription: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
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
