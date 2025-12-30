/**
 * Key Generation und Derivation
 *
 * Leitet deterministische KeyPairs aus Seed Phrases ab.
 * Generiert auch zufaellige symmetrische Keys fuer Galerien.
 */

import nacl from 'tweetnacl';
import util from 'tweetnacl-util';

const { encodeBase64, decodeBase64 } = util;

import { KEY_LENGTHS } from './constants';
import { seedPhraseToEntropy, normalizeSeedPhrase, validateSeedPhrase } from './seedPhrase';

/**
 * User KeyPair (asymmetrisch, fuer Box/Key Sharing)
 */
export interface UserKeyPair {
  publicKey: string; // Base64-encoded
  privateKey: string; // Base64-encoded - NIEMALS an Server senden!
}

/**
 * Leitet ein deterministisches KeyPair aus einer Seed Phrase ab
 *
 * Ableitungs-Prozess:
 * 1. Seed Phrase → 16 Bytes Entropy (BIP-39)
 * 2. Entropy → SHA-512 Hash (64 Bytes)
 * 3. Erste 32 Bytes → Box KeyPair Seed
 *
 * @param seedPhrase - Die 12-Wort Seed Phrase
 * @returns KeyPair mit Base64-encoded Keys
 * @throws Error wenn Seed Phrase ungueltig
 */
export const deriveKeyPairFromSeedPhrase = (seedPhrase: string): UserKeyPair => {
  const normalized = normalizeSeedPhrase(seedPhrase);

  if (!validateSeedPhrase(normalized)) {
    throw new Error('Ungueltige Seed Phrase');
  }

  // Entropy aus Seed Phrase (16 Bytes)
  const entropy = seedPhraseToEntropy(normalized);

  // SHA-512 Hash fuer mehr Bytes (64 Bytes)
  const hash = nacl.hash(entropy);

  // Erste 32 Bytes als Seed fuer KeyPair
  const seed = hash.slice(0, KEY_LENGTHS.PRIVATE_KEY);

  // Box KeyPair generieren (X25519)
  const keyPair = nacl.box.keyPair.fromSecretKey(seed);

  return {
    publicKey: encodeBase64(keyPair.publicKey),
    privateKey: encodeBase64(keyPair.secretKey),
  };
};

/**
 * Generiert ein zufaelliges KeyPair
 *
 * Fuer Faelle wo keine Seed Phrase verwendet wird (z.B. Tests).
 *
 * @returns Zufaelliges KeyPair
 */
export const generateRandomKeyPair = (): UserKeyPair => {
  const keyPair = nacl.box.keyPair();

  return {
    publicKey: encodeBase64(keyPair.publicKey),
    privateKey: encodeBase64(keyPair.secretKey),
  };
};

/**
 * Generiert einen zufaelligen symmetrischen Key
 *
 * Fuer Galerie-Verschluesselung (SecretBox).
 *
 * @returns Base64-encoded symmetrischer Key (32 Bytes)
 */
export const generateSymmetricKey = (): string => {
  const key = nacl.randomBytes(KEY_LENGTHS.SECRET_KEY);
  return encodeBase64(key);
};

/**
 * Generiert einen zufaelligen Galerie-Key
 *
 * Alias fuer generateSymmetricKey mit klarerem Namen.
 *
 * @returns Base64-encoded Galerie-Key
 */
export const generateGalleryKey = (): string => {
  return generateSymmetricKey();
};

/**
 * Validiert einen Base64-encoded Key
 *
 * @param key - Der zu validierende Key
 * @param expectedLength - Erwartete Laenge in Bytes
 * @returns true wenn gueltig
 */
export const validateKey = (key: string, expectedLength: number): boolean => {
  try {
    const decoded = decodeBase64(key);
    return decoded.length === expectedLength;
  } catch {
    return false;
  }
};

/**
 * Validiert einen Public Key
 */
export const validatePublicKey = (key: string): boolean => {
  return validateKey(key, KEY_LENGTHS.PUBLIC_KEY);
};

/**
 * Validiert einen Private Key
 */
export const validatePrivateKey = (key: string): boolean => {
  return validateKey(key, KEY_LENGTHS.PRIVATE_KEY);
};

/**
 * Validiert einen symmetrischen Key (Galerie-Key)
 */
export const validateSymmetricKey = (key: string): boolean => {
  return validateKey(key, KEY_LENGTHS.SECRET_KEY);
};

/**
 * Extrahiert den Public Key aus einem Private Key
 *
 * Nuetzlich wenn nur der Private Key bekannt ist.
 *
 * @param privateKey - Base64-encoded Private Key
 * @returns Base64-encoded Public Key
 */
export const publicKeyFromPrivateKey = (privateKey: string): string => {
  const secretKey = decodeBase64(privateKey);

  if (secretKey.length !== KEY_LENGTHS.PRIVATE_KEY) {
    throw new Error('Ungueltiger Private Key');
  }

  const keyPair = nacl.box.keyPair.fromSecretKey(secretKey);
  return encodeBase64(keyPair.publicKey);
};
