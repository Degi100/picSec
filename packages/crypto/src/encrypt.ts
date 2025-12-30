/**
 * Symmetrische Verschluesselung (SecretBox)
 *
 * Fuer Galerie-Inhalte: Bilder, Kommentare.
 * Verwendet NaCl SecretBox (XSalsa20 + Poly1305).
 *
 * Payload Format:
 * [Version: 1 Byte][Nonce: 24 Bytes][Ciphertext: Variable]
 */

import nacl from 'tweetnacl';
import { decodeBase64, encodeBase64, decodeUTF8, encodeUTF8 } from 'tweetnacl-util';

import { CURRENT_PAYLOAD_VERSION, PAYLOAD_STRUCTURE, KEY_LENGTHS } from './constants';

/**
 * Verschluesselt Daten mit einem symmetrischen Key
 *
 * @param data - Die zu verschluesselnden Daten (Uint8Array)
 * @param key - Base64-encoded symmetrischer Key
 * @returns Base64-encoded Payload mit Version und Nonce
 */
export const encrypt = (data: Uint8Array, key: string): string => {
  const keyBytes = decodeBase64(key);

  if (keyBytes.length !== KEY_LENGTHS.SECRET_KEY) {
    throw new Error('Ungueltiger Key: Muss 32 Bytes sein');
  }

  // Zufaellige Nonce generieren
  const nonce = nacl.randomBytes(PAYLOAD_STRUCTURE.NONCE_BYTES);

  // Verschluesseln
  const ciphertext = nacl.secretbox(data, nonce, keyBytes);

  // Payload zusammenbauen: [Version][Nonce][Ciphertext]
  const payload = new Uint8Array(
    PAYLOAD_STRUCTURE.VERSION_BYTES + PAYLOAD_STRUCTURE.NONCE_BYTES + ciphertext.length
  );

  payload[0] = CURRENT_PAYLOAD_VERSION;
  payload.set(nonce, PAYLOAD_STRUCTURE.VERSION_BYTES);
  payload.set(ciphertext, PAYLOAD_STRUCTURE.VERSION_BYTES + PAYLOAD_STRUCTURE.NONCE_BYTES);

  return encodeBase64(payload);
};

/**
 * Entschluesselt einen Payload mit einem symmetrischen Key
 *
 * @param payload - Base64-encoded Payload
 * @param key - Base64-encoded symmetrischer Key
 * @returns Die entschluesselten Daten
 * @throws Error wenn Entschluesselung fehlschlaegt
 */
export const decrypt = (payload: string, key: string): Uint8Array => {
  const payloadBytes = decodeBase64(payload);
  const keyBytes = decodeBase64(key);

  if (keyBytes.length !== KEY_LENGTHS.SECRET_KEY) {
    throw new Error('Ungueltiger Key: Muss 32 Bytes sein');
  }

  // Minimale Payload-Laenge pruefen
  const minLength =
    PAYLOAD_STRUCTURE.VERSION_BYTES +
    PAYLOAD_STRUCTURE.NONCE_BYTES +
    PAYLOAD_STRUCTURE.AUTH_TAG_BYTES;

  if (payloadBytes.length < minLength) {
    throw new Error('Payload zu kurz');
  }

  // Version extrahieren und pruefen
  const version = payloadBytes[0];

  if (version === undefined || version > CURRENT_PAYLOAD_VERSION) {
    throw new Error(`Unbekannte Payload-Version: ${version}`);
  }

  // Version-spezifische Entschluesselung
  // Aktuell nur Version 1, aber vorbereitet fuer zukuenftige Versionen
  if (version === 1) {
    return decryptV1(payloadBytes, keyBytes);
  }

  throw new Error(`Nicht unterstuetzte Payload-Version: ${version}`);
};

/**
 * Version 1 Entschluesselung
 */
const decryptV1 = (payloadBytes: Uint8Array, keyBytes: Uint8Array): Uint8Array => {
  // Nonce extrahieren
  const nonce = payloadBytes.slice(
    PAYLOAD_STRUCTURE.VERSION_BYTES,
    PAYLOAD_STRUCTURE.VERSION_BYTES + PAYLOAD_STRUCTURE.NONCE_BYTES
  );

  // Ciphertext extrahieren
  const ciphertext = payloadBytes.slice(
    PAYLOAD_STRUCTURE.VERSION_BYTES + PAYLOAD_STRUCTURE.NONCE_BYTES
  );

  // Entschluesseln
  const decrypted = nacl.secretbox.open(ciphertext, nonce, keyBytes);

  if (!decrypted) {
    throw new Error('Entschluesselung fehlgeschlagen: Ungueltige Daten oder Key');
  }

  return decrypted;
};

/**
 * Verschluesselt einen String
 *
 * Convenience-Funktion fuer Text (z.B. Kommentare).
 *
 * @param text - Der zu verschluesselnde Text
 * @param key - Base64-encoded symmetrischer Key
 * @returns Base64-encoded Payload
 */
export const encryptString = (text: string, key: string): string => {
  const data = decodeUTF8(text);
  return encrypt(data, key);
};

/**
 * Entschluesselt einen String
 *
 * @param payload - Base64-encoded Payload
 * @param key - Base64-encoded symmetrischer Key
 * @returns Der entschluesselte Text
 */
export const decryptString = (payload: string, key: string): string => {
  const data = decrypt(payload, key);
  return encodeUTF8(data);
};

/**
 * Extrahiert die Version aus einem Payload ohne zu entschluesseln
 *
 * Nuetzlich um zu pruefen ob ein Payload unterstuetzt wird.
 *
 * @param payload - Base64-encoded Payload
 * @returns Die Payload-Version
 */
export const getPayloadVersion = (payload: string): number => {
  const payloadBytes = decodeBase64(payload);

  if (payloadBytes.length < PAYLOAD_STRUCTURE.VERSION_BYTES) {
    throw new Error('Payload zu kurz');
  }

  const version = payloadBytes[0];

  if (version === undefined) {
    throw new Error('Keine Version im Payload');
  }

  return version;
};
