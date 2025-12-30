/**
 * Crypto Konstanten
 *
 * Zentrale Konfiguration fuer alle Crypto-Operationen.
 * NICHT AENDERN ohne Migration-Strategie!
 */

// Aktuelle Payload Version
// Muss bei Schema-Aenderungen erhoeht werden
export const CURRENT_PAYLOAD_VERSION = 1;

// Payload-Aufbau:
// [Version: 1 Byte][Nonce: 24 Bytes][Ciphertext: Variable][Auth Tag: 16 Bytes]
// Auth Tag ist bei NaCl secretbox bereits im Ciphertext enthalten (Poly1305)
export const PAYLOAD_STRUCTURE = {
  VERSION_BYTES: 1,
  NONCE_BYTES: 24, // crypto_secretbox_NONCEBYTES
  AUTH_TAG_BYTES: 16, // Poly1305 Tag (in Ciphertext enthalten)
} as const;

// Seed Phrase Konfiguration
export const SEED_PHRASE_CONFIG = {
  WORD_COUNT: 12,
  ENTROPY_BITS: 128, // 12 Woerter = 128 bits entropy
} as const;

// Key-Laengen
export const KEY_LENGTHS = {
  SECRET_KEY: 32, // crypto_secretbox_KEYBYTES
  PUBLIC_KEY: 32, // crypto_box_PUBLICKEYBYTES
  PRIVATE_KEY: 32, // crypto_box_SECRETKEYBYTES (seed)
  NONCE: 24,
} as const;
