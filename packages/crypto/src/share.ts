/**
 * Key Sharing (Asymmetrische Verschluesselung)
 *
 * Fuer den sicheren Austausch von symmetrischen Keys zwischen Usern.
 * Verwendet NaCl Box (X25519 + XSalsa20 + Poly1305).
 *
 * Anwendungsfaelle:
 * - Galerie-Key an neue Mitglieder senden
 * - Key Rotation: Neuer Key an alle verbleibenden Mitglieder
 * - Report: Galerie-Key fuer Admin verschluesseln
 */

import nacl from 'tweetnacl';
import util from 'tweetnacl-util';

const { decodeBase64, encodeBase64 } = util;

import { CURRENT_PAYLOAD_VERSION, PAYLOAD_STRUCTURE, KEY_LENGTHS } from './constants';

/**
 * Verschluesselt einen symmetrischen Key fuer einen Empfaenger
 *
 * Der Sender verwendet seinen Private Key und den Public Key des Empfaengers.
 * Nur der Empfaenger kann mit seinem Private Key entschluesseln.
 *
 * @param symmetricKey - Base64-encoded symmetrischer Key (z.B. Galerie-Key)
 * @param recipientPublicKey - Base64-encoded Public Key des Empfaengers
 * @param senderPrivateKey - Base64-encoded Private Key des Senders
 * @returns Base64-encoded verschluesselter Key
 */
export const encryptKeyForRecipient = (
  symmetricKey: string,
  recipientPublicKey: string,
  senderPrivateKey: string
): string => {
  const keyBytes = decodeBase64(symmetricKey);
  const recipientPub = decodeBase64(recipientPublicKey);
  const senderPriv = decodeBase64(senderPrivateKey);

  // Validierung
  if (keyBytes.length !== KEY_LENGTHS.SECRET_KEY) {
    throw new Error('Ungueltiger symmetrischer Key');
  }
  if (recipientPub.length !== KEY_LENGTHS.PUBLIC_KEY) {
    throw new Error('Ungueltiger Empfaenger Public Key');
  }
  if (senderPriv.length !== KEY_LENGTHS.PRIVATE_KEY) {
    throw new Error('Ungueltiger Sender Private Key');
  }

  // Zufaellige Nonce
  const nonce = nacl.randomBytes(PAYLOAD_STRUCTURE.NONCE_BYTES);

  // Asymmetrisch verschluesseln
  const ciphertext = nacl.box(keyBytes, nonce, recipientPub, senderPriv);

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
 * Entschluesselt einen empfangenen symmetrischen Key
 *
 * @param encryptedKey - Base64-encoded verschluesselter Key
 * @param senderPublicKey - Base64-encoded Public Key des Senders
 * @param recipientPrivateKey - Base64-encoded Private Key des Empfaengers
 * @returns Base64-encoded entschluesselter symmetrischer Key
 */
export const decryptKeyFromSender = (
  encryptedKey: string,
  senderPublicKey: string,
  recipientPrivateKey: string
): string => {
  const payloadBytes = decodeBase64(encryptedKey);
  const senderPub = decodeBase64(senderPublicKey);
  const recipientPriv = decodeBase64(recipientPrivateKey);

  // Validierung
  if (senderPub.length !== KEY_LENGTHS.PUBLIC_KEY) {
    throw new Error('Ungueltiger Sender Public Key');
  }
  if (recipientPriv.length !== KEY_LENGTHS.PRIVATE_KEY) {
    throw new Error('Ungueltiger Empfaenger Private Key');
  }

  // Minimale Payload-Laenge
  const minLength =
    PAYLOAD_STRUCTURE.VERSION_BYTES +
    PAYLOAD_STRUCTURE.NONCE_BYTES +
    KEY_LENGTHS.SECRET_KEY +
    PAYLOAD_STRUCTURE.AUTH_TAG_BYTES;

  if (payloadBytes.length < minLength) {
    throw new Error('Payload zu kurz');
  }

  // Version pruefen
  const version = payloadBytes[0];

  if (version === undefined || version > CURRENT_PAYLOAD_VERSION) {
    throw new Error(`Unbekannte Payload-Version: ${version}`);
  }

  // Nonce und Ciphertext extrahieren
  const nonce = payloadBytes.slice(
    PAYLOAD_STRUCTURE.VERSION_BYTES,
    PAYLOAD_STRUCTURE.VERSION_BYTES + PAYLOAD_STRUCTURE.NONCE_BYTES
  );

  const ciphertext = payloadBytes.slice(
    PAYLOAD_STRUCTURE.VERSION_BYTES + PAYLOAD_STRUCTURE.NONCE_BYTES
  );

  // Entschluesseln
  const decrypted = nacl.box.open(ciphertext, nonce, senderPub, recipientPriv);

  if (!decrypted) {
    throw new Error('Entschluesselung fehlgeschlagen: Ungueltige Daten oder Keys');
  }

  if (decrypted.length !== KEY_LENGTHS.SECRET_KEY) {
    throw new Error('Entschluesselter Key hat falsche Laenge');
  }

  return encodeBase64(decrypted);
};

/**
 * Verschluesselt einen Galerie-Key fuer mehrere Empfaenger
 *
 * Convenience-Funktion fuer Batch-Verschluesselung.
 *
 * @param galleryKey - Base64-encoded Galerie-Key
 * @param recipients - Array von {userId, publicKey}
 * @param senderPrivateKey - Base64-encoded Private Key des Senders (Owner)
 * @returns Array von {userId, encryptedGalleryKey}
 */
export const encryptGalleryKeyForMembers = (
  galleryKey: string,
  recipients: Array<{ userId: string; publicKey: string }>,
  senderPrivateKey: string
): Array<{ userId: string; encryptedGalleryKey: string }> => {
  return recipients.map((recipient) => ({
    userId: recipient.userId,
    encryptedGalleryKey: encryptKeyForRecipient(
      galleryKey,
      recipient.publicKey,
      senderPrivateKey
    ),
  }));
};

/**
 * Verschluesselt einen Galerie-Key fuer den Admin (Report)
 *
 * Wird beim Erstellen eines Reports verwendet.
 * Der Admin kann den Key nur entschluesseln wenn er den Report bearbeitet.
 *
 * @param galleryKey - Base64-encoded Galerie-Key
 * @param adminPublicKey - Base64-encoded Public Key des Admins
 * @param reporterPrivateKey - Base64-encoded Private Key des Reporters
 * @returns Base64-encoded verschluesselter Key fuer Admin
 */
export const encryptGalleryKeyForAdmin = (
  galleryKey: string,
  adminPublicKey: string,
  reporterPrivateKey: string
): string => {
  return encryptKeyForRecipient(galleryKey, adminPublicKey, reporterPrivateKey);
};
