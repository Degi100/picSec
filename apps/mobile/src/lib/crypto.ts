/**
 * Crypto Utils fuer Mobile
 *
 * Wrapper um TweetNaCl fuer Key Management und Encryption.
 */

import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64 } from 'tweetnacl-util';
import * as ExpoCrypto from 'expo-crypto';

import { setItem, getItem, deleteItem } from './storage';

// ============================================================================
// PRNG Setup fuer React Native
// ============================================================================

// TweetNaCl braucht einen PRNG - wir verwenden expo-crypto
nacl.setPRNG((x: Uint8Array, n: number) => {
  const randomBytes = ExpoCrypto.getRandomBytes(n);
  for (let i = 0; i < n; i++) {
    x[i] = randomBytes[i];
  }
});

// ============================================================================
// Types
// ============================================================================

export interface KeyPair {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
  publicKeyBase64: string;
  secretKeyBase64: string;
}

// ============================================================================
// Key Generation
// ============================================================================

/**
 * Generiert ein neues NaCl Box Keypair
 */
export const generateKeyPair = async (): Promise<KeyPair> => {
  const keyPair = nacl.box.keyPair();

  return {
    publicKey: keyPair.publicKey,
    secretKey: keyPair.secretKey,
    publicKeyBase64: encodeBase64(keyPair.publicKey),
    secretKeyBase64: encodeBase64(keyPair.secretKey),
  };
};

/**
 * Generiert einen zufaelligen Symmetric Key (fuer Galerie)
 */
export const generateSymmetricKey = (): Uint8Array => {
  return nacl.randomBytes(nacl.secretbox.keyLength);
};

// ============================================================================
// Key Storage
// ============================================================================

const KEYPAIR_KEY = 'picsec_keypair';

/**
 * Speichert Keypair sicher
 */
export const saveKeyPair = async (keyPair: KeyPair): Promise<void> => {
  const data = JSON.stringify({
    publicKey: keyPair.publicKeyBase64,
    secretKey: keyPair.secretKeyBase64,
  });

  await setItem(KEYPAIR_KEY, data);
};

/**
 * Laedt Keypair
 */
export const loadKeyPair = async (): Promise<KeyPair | null> => {
  const data = await getItem(KEYPAIR_KEY);

  if (!data) {
    return null;
  }

  try {
    const parsed = JSON.parse(data);
    const publicKey = decodeBase64(parsed.publicKey);
    const secretKey = decodeBase64(parsed.secretKey);

    return {
      publicKey,
      secretKey,
      publicKeyBase64: parsed.publicKey,
      secretKeyBase64: parsed.secretKey,
    };
  } catch {
    return null;
  }
};

/**
 * Loescht Keypair
 */
export const deleteKeyPair = async (): Promise<void> => {
  await deleteItem(KEYPAIR_KEY);
};

// ============================================================================
// Asymmetric Encryption (Box)
// ============================================================================

/**
 * Verschluesselt Daten fuer einen Empfaenger (Box)
 */
export const encryptForRecipient = (
  message: Uint8Array,
  recipientPublicKey: Uint8Array,
  senderSecretKey: Uint8Array
): Uint8Array => {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const encrypted = nacl.box(message, nonce, recipientPublicKey, senderSecretKey);

  // Format: [nonce][ciphertext]
  const result = new Uint8Array(nonce.length + encrypted.length);
  result.set(nonce);
  result.set(encrypted, nonce.length);

  return result;
};

/**
 * Entschluesselt Daten vom Sender (Box)
 */
export const decryptFromSender = (
  ciphertext: Uint8Array,
  senderPublicKey: Uint8Array,
  recipientSecretKey: Uint8Array
): Uint8Array | null => {
  const nonce = ciphertext.slice(0, nacl.box.nonceLength);
  const encrypted = ciphertext.slice(nacl.box.nonceLength);

  return nacl.box.open(encrypted, nonce, senderPublicKey, recipientSecretKey);
};

// ============================================================================
// Symmetric Encryption (SecretBox)
// ============================================================================

/**
 * Verschluesselt Daten mit Symmetric Key (SecretBox)
 */
export const encryptWithKey = (
  message: Uint8Array,
  key: Uint8Array
): Uint8Array => {
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const encrypted = nacl.secretbox(message, nonce, key);

  // Format: [nonce][ciphertext]
  const result = new Uint8Array(nonce.length + encrypted.length);
  result.set(nonce);
  result.set(encrypted, nonce.length);

  return result;
};

/**
 * Entschluesselt Daten mit Symmetric Key (SecretBox)
 */
export const decryptWithKey = (
  ciphertext: Uint8Array,
  key: Uint8Array
): Uint8Array | null => {
  const nonce = ciphertext.slice(0, nacl.secretbox.nonceLength);
  const encrypted = ciphertext.slice(nacl.secretbox.nonceLength);

  return nacl.secretbox.open(encrypted, nonce, key);
};

// ============================================================================
// Helpers
// ============================================================================

/**
 * Konvertiert String zu Uint8Array
 */
export const stringToBytes = (str: string): Uint8Array => {
  return new TextEncoder().encode(str);
};

/**
 * Konvertiert Uint8Array zu String
 */
export const bytesToString = (bytes: Uint8Array): string => {
  return new TextDecoder().decode(bytes);
};

/**
 * Base64 encode
 */
export { encodeBase64, decodeBase64 };
