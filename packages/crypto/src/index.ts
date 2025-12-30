/**
 * @picsec/crypto
 *
 * E2E Encryption fuer PicSec.
 *
 * Hauptfunktionen:
 * - Seed Phrase Generation und Recovery
 * - Key Derivation aus Seed Phrase
 * - Symmetrische Verschluesselung (Galerie-Inhalte)
 * - Asymmetrische Verschluesselung (Key Sharing)
 *
 * WICHTIG: Keine eigene Crypto erfinden - nur diese Funktionen verwenden!
 */

// Konstanten
export {
  CURRENT_PAYLOAD_VERSION,
  PAYLOAD_STRUCTURE,
  SEED_PHRASE_CONFIG,
  KEY_LENGTHS,
} from './constants';

// Seed Phrase
export {
  generateSeedPhrase,
  validateSeedPhrase,
  normalizeSeedPhrase,
  seedPhraseToEntropy,
  getWordAtPosition,
  generateQuizPositions,
} from './seedPhrase';

// Keys
export {
  deriveKeyPairFromSeedPhrase,
  generateRandomKeyPair,
  generateSymmetricKey,
  generateGalleryKey,
  validateKey,
  validatePublicKey,
  validatePrivateKey,
  validateSymmetricKey,
  publicKeyFromPrivateKey,
  type UserKeyPair,
} from './keys';

// Symmetrische Verschluesselung
export {
  encrypt,
  decrypt,
  encryptString,
  decryptString,
  getPayloadVersion,
} from './encrypt';

// Asymmetrische Verschluesselung (Key Sharing)
export {
  encryptKeyForRecipient,
  decryptKeyFromSender,
  encryptGalleryKeyForMembers,
  encryptGalleryKeyForAdmin,
} from './share';
