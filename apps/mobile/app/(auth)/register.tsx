/**
 * Register Screen
 */

import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Link, router } from 'expo-router';

import { useAuthStore } from '@/stores/authStore';
import { api } from '@/api/client';
import { generateKeyPair } from '@/lib/crypto';
import { styles } from '@/styles/auth';

const RegisterScreen = () => {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { setAuth, setKeyPair } = useAuthStore();

  const handleRegister = async () => {
    // Validierung
    if (!email.trim() || !displayName.trim() || !password || !confirmPassword) {
      Alert.alert('Fehler', 'Bitte alle Felder ausfuellen');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Fehler', 'Passwoerter stimmen nicht ueberein');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Fehler', 'Passwort muss mindestens 8 Zeichen haben');
      return;
    }

    setIsLoading(true);

    try {
      // Keypair generieren
      const keyPair = await generateKeyPair();

      const response = await api.auth.register({
        email: email.trim().toLowerCase(),
        displayName: displayName.trim(),
        password,
        publicKey: keyPair.publicKeyBase64,
        inviteCode: inviteCode.trim() || undefined,
      });

      // Keypair sicher speichern
      await setKeyPair(keyPair);

      // Auth setzen
      await setAuth(response.data.user, response.data.tokens);

      router.replace('/(app)/galleries');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registrierung fehlgeschlagen';
      Alert.alert('Fehler', message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <Text style={styles.title}>Registrieren</Text>
          <Text style={styles.subtitle}>Erstelle deinen Account</Text>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Einladungscode (optional)"
              placeholderTextColor="#666"
              value={inviteCode}
              onChangeText={setInviteCode}
              autoCapitalize="characters"
            />

            <TextInput
              style={styles.input}
              placeholder="E-Mail"
              placeholderTextColor="#666"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />

            <TextInput
              style={styles.input}
              placeholder="Anzeigename"
              placeholderTextColor="#666"
              value={displayName}
              onChangeText={setDisplayName}
              autoComplete="name"
            />

            <TextInput
              style={styles.input}
              placeholder="Passwort"
              placeholderTextColor="#666"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
            />

            <TextInput
              style={styles.input}
              placeholder="Passwort bestaetigen"
              placeholderTextColor="#666"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoComplete="new-password"
            />

            <Pressable
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.buttonText}>Registrieren</Text>
              )}
            </Pressable>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Bereits registriert? </Text>
            <Link href="/(auth)/login" asChild>
              <Pressable>
                <Text style={styles.footerLink}>Anmelden</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default RegisterScreen;
