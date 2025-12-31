/**
 * Login Screen
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
} from 'react-native';
import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAuthStore } from '@/stores/authStore';
import { api } from '@/api/client';
import { loadKeyPair, generateKeyPair } from '@/lib/crypto';
import { signInWithGoogle } from '@/lib/supabase';
import { styles } from '@/styles/auth';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const { setAuth, setKeyPair } = useAuthStore();

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);

    try {
      // Google OAuth via Supabase starten
      const googleToken = await signInWithGoogle();

      if (!googleToken) {
        // User hat abgebrochen oder Fehler
        return;
      }

      // KeyPair generieren oder laden
      let keyPair = await loadKeyPair();
      if (!keyPair) {
        keyPair = await generateKeyPair();
      }

      // Google Login an unser Backend senden
      const response = await api.auth.google({
        idToken: googleToken,
        publicKey: keyPair.publicKeyBase64,
      });

      await setAuth(response.data.user, response.data.tokens);
      await setKeyPair(keyPair);

      router.replace('/(app)/galleries');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Google Login fehlgeschlagen';
      Alert.alert('Fehler', message);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Fehler', 'Bitte alle Felder ausfuellen');
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.auth.login({
        email: email.trim().toLowerCase(),
        password,
      });

      await setAuth(response.data.user, response.data.tokens);

      // KeyPair aus Storage laden oder neu generieren
      let keyPair = await loadKeyPair();
      if (!keyPair) {
        // Kein KeyPair vorhanden - neues generieren
        // (passiert bei neuem Geraet oder nach Browser-Clear)
        keyPair = await generateKeyPair();
      }
      await setKeyPair(keyPair);

      router.replace('/(app)/galleries');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login fehlgeschlagen';
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
      <View style={styles.content}>
        <Text style={styles.title}>PicSec</Text>
        <Text style={styles.subtitle}>Private Foto-Sharing</Text>

        <View style={styles.form}>
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
            placeholder="Passwort"
            placeholderTextColor="#666"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
          />

          <Pressable
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.buttonText}>Anmelden</Text>
            )}
          </Pressable>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>oder</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable
            style={[styles.googleButton, isGoogleLoading && styles.buttonDisabled]}
            onPress={handleGoogleLogin}
            disabled={isGoogleLoading}
          >
            {isGoogleLoading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <Ionicons name="logo-google" size={20} color="#000" />
                <Text style={styles.googleButtonText}>Mit Google anmelden</Text>
              </>
            )}
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Noch kein Account? </Text>
          <Link href="/(auth)/register" asChild>
            <Pressable>
              <Text style={styles.footerLink}>Registrieren</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;
