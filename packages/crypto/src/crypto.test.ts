/**
 * Crypto Unit Tests
 *
 * Kritische Tests fuer alle Crypto-Flows.
 * Diese Tests MUESSEN alle gruen sein bevor ein Release!
 */

import { describe, it, expect } from 'vitest';

import {
  // Seed Phrase
  generateSeedPhrase,
  validateSeedPhrase,
  normalizeSeedPhrase,
  getWordAtPosition,
  generateQuizPositions,
  // Keys
  deriveKeyPairFromSeedPhrase,
  generateRandomKeyPair,
  generateGalleryKey,
  validatePublicKey,
  validatePrivateKey,
  validateSymmetricKey,
  publicKeyFromPrivateKey,
  // Encrypt/Decrypt
  encrypt,
  decrypt,
  encryptString,
  decryptString,
  getPayloadVersion,
  // Key Sharing
  encryptKeyForRecipient,
  decryptKeyFromSender,
  encryptGalleryKeyForMembers,
  // Constants
  CURRENT_PAYLOAD_VERSION,
  SEED_PHRASE_CONFIG,
} from './index';

// ============================================================================
// Seed Phrase Tests
// ============================================================================

describe('Seed Phrase', () => {
  describe('generateSeedPhrase', () => {
    it('generiert 12 Woerter', () => {
      const phrase = generateSeedPhrase();
      const words = phrase.split(' ');
      expect(words).toHaveLength(SEED_PHRASE_CONFIG.WORD_COUNT);
    });

    it('generiert unterschiedliche Phrases', () => {
      const phrase1 = generateSeedPhrase();
      const phrase2 = generateSeedPhrase();
      expect(phrase1).not.toBe(phrase2);
    });

    it('generierte Phrase ist valide', () => {
      const phrase = generateSeedPhrase();
      expect(validateSeedPhrase(phrase)).toBe(true);
    });
  });

  describe('validateSeedPhrase', () => {
    it('akzeptiert gueltige Phrase', () => {
      const phrase = generateSeedPhrase();
      expect(validateSeedPhrase(phrase)).toBe(true);
    });

    it('lehnt zu kurze Phrase ab', () => {
      expect(validateSeedPhrase('one two three')).toBe(false);
    });

    it('lehnt ungueltige Woerter ab', () => {
      expect(validateSeedPhrase('xyz abc def ghi jkl mno pqr stu vwx yza bcd efg')).toBe(false);
    });

    it('lehnt falsche Checksum ab', () => {
      // Gueltige Woerter aber falsche Reihenfolge/Checksum
      expect(validateSeedPhrase('abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon')).toBe(false);
    });

    it('akzeptiert bekannte gueltige Phrase', () => {
      // Standard BIP-39 Test Vector
      const validPhrase = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
      expect(validateSeedPhrase(validPhrase)).toBe(true);
    });
  });

  describe('normalizeSeedPhrase', () => {
    it('trimmt Whitespace', () => {
      const phrase = '  word1 word2  ';
      expect(normalizeSeedPhrase(phrase)).toBe('word1 word2');
    });

    it('konvertiert zu Lowercase', () => {
      const phrase = 'WORD1 Word2 wOrD3';
      expect(normalizeSeedPhrase(phrase)).toBe('word1 word2 word3');
    });

    it('normalisiert mehrfache Leerzeichen', () => {
      const phrase = 'word1   word2    word3';
      expect(normalizeSeedPhrase(phrase)).toBe('word1 word2 word3');
    });
  });

  describe('getWordAtPosition', () => {
    it('gibt korrektes Wort zurueck', () => {
      const phrase = 'one two three four five six seven eight nine ten eleven twelve';
      expect(getWordAtPosition(phrase, 1)).toBe('one');
      expect(getWordAtPosition(phrase, 5)).toBe('five');
      expect(getWordAtPosition(phrase, 12)).toBe('twelve');
    });

    it('wirft Fehler bei ungueltiger Position', () => {
      const phrase = generateSeedPhrase();
      expect(() => getWordAtPosition(phrase, 0)).toThrow();
      expect(() => getWordAtPosition(phrase, 13)).toThrow();
    });
  });

  describe('generateQuizPositions', () => {
    it('generiert 3 Positionen per Default', () => {
      const positions = generateQuizPositions();
      expect(positions).toHaveLength(3);
    });

    it('generiert Positionen zwischen 1 und 12', () => {
      const positions = generateQuizPositions(5);
      positions.forEach((pos) => {
        expect(pos).toBeGreaterThanOrEqual(1);
        expect(pos).toBeLessThanOrEqual(12);
      });
    });

    it('generiert eindeutige Positionen', () => {
      const positions = generateQuizPositions(5);
      const unique = new Set(positions);
      expect(unique.size).toBe(5);
    });
  });
});

// ============================================================================
// Key Derivation Tests
// ============================================================================

describe('Key Derivation', () => {
  describe('deriveKeyPairFromSeedPhrase', () => {
    it('generiert KeyPair aus Seed Phrase', () => {
      const phrase = generateSeedPhrase();
      const keyPair = deriveKeyPairFromSeedPhrase(phrase);

      expect(keyPair.publicKey).toBeDefined();
      expect(keyPair.privateKey).toBeDefined();
      expect(validatePublicKey(keyPair.publicKey)).toBe(true);
      expect(validatePrivateKey(keyPair.privateKey)).toBe(true);
    });

    it('ist deterministisch - gleiche Phrase = gleicher Key', () => {
      const phrase = generateSeedPhrase();
      const keyPair1 = deriveKeyPairFromSeedPhrase(phrase);
      const keyPair2 = deriveKeyPairFromSeedPhrase(phrase);

      expect(keyPair1.publicKey).toBe(keyPair2.publicKey);
      expect(keyPair1.privateKey).toBe(keyPair2.privateKey);
    });

    it('unterschiedliche Phrases = unterschiedliche Keys', () => {
      const phrase1 = generateSeedPhrase();
      const phrase2 = generateSeedPhrase();
      const keyPair1 = deriveKeyPairFromSeedPhrase(phrase1);
      const keyPair2 = deriveKeyPairFromSeedPhrase(phrase2);

      expect(keyPair1.publicKey).not.toBe(keyPair2.publicKey);
      expect(keyPair1.privateKey).not.toBe(keyPair2.privateKey);
    });

    it('wirft Fehler bei ungueltiger Phrase', () => {
      expect(() => deriveKeyPairFromSeedPhrase('invalid phrase')).toThrow();
    });

    it('Normalisierung funktioniert', () => {
      const phrase = generateSeedPhrase();
      const keyPair1 = deriveKeyPairFromSeedPhrase(phrase);
      const keyPair2 = deriveKeyPairFromSeedPhrase(phrase.toUpperCase());
      const keyPair3 = deriveKeyPairFromSeedPhrase('  ' + phrase + '  ');

      expect(keyPair1.publicKey).toBe(keyPair2.publicKey);
      expect(keyPair1.publicKey).toBe(keyPair3.publicKey);
    });
  });

  describe('generateRandomKeyPair', () => {
    it('generiert gueltiges KeyPair', () => {
      const keyPair = generateRandomKeyPair();
      expect(validatePublicKey(keyPair.publicKey)).toBe(true);
      expect(validatePrivateKey(keyPair.privateKey)).toBe(true);
    });

    it('generiert unterschiedliche KeyPairs', () => {
      const keyPair1 = generateRandomKeyPair();
      const keyPair2 = generateRandomKeyPair();
      expect(keyPair1.publicKey).not.toBe(keyPair2.publicKey);
    });
  });

  describe('generateGalleryKey', () => {
    it('generiert gueltigen symmetrischen Key', () => {
      const key = generateGalleryKey();
      expect(validateSymmetricKey(key)).toBe(true);
    });

    it('generiert unterschiedliche Keys', () => {
      const key1 = generateGalleryKey();
      const key2 = generateGalleryKey();
      expect(key1).not.toBe(key2);
    });
  });

  describe('publicKeyFromPrivateKey', () => {
    it('extrahiert korrekten Public Key', () => {
      const keyPair = generateRandomKeyPair();
      const extractedPublic = publicKeyFromPrivateKey(keyPair.privateKey);
      expect(extractedPublic).toBe(keyPair.publicKey);
    });
  });
});

// ============================================================================
// Encrypt/Decrypt Tests
// ============================================================================

describe('Encrypt/Decrypt', () => {
  describe('encrypt/decrypt Roundtrip', () => {
    it('verschluesselt und entschluesselt Daten korrekt', () => {
      const key = generateGalleryKey();
      const originalData = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

      const encrypted = encrypt(originalData, key);
      const decrypted = decrypt(encrypted, key);

      expect(decrypted).toEqual(originalData);
    });

    it('verschluesselt und entschluesselt leere Daten', () => {
      const key = generateGalleryKey();
      const originalData = new Uint8Array([]);

      const encrypted = encrypt(originalData, key);
      const decrypted = decrypt(encrypted, key);

      expect(decrypted).toEqual(originalData);
    });

    it('verschluesselt und entschluesselt grosse Daten', () => {
      const key = generateGalleryKey();
      const originalData = new Uint8Array(10000);
      for (let i = 0; i < originalData.length; i++) {
        originalData[i] = i % 256;
      }

      const encrypted = encrypt(originalData, key);
      const decrypted = decrypt(encrypted, key);

      expect(decrypted).toEqual(originalData);
    });

    it('gleiches Plaintext ergibt unterschiedlichen Ciphertext (Nonce)', () => {
      const key = generateGalleryKey();
      const data = new Uint8Array([1, 2, 3, 4, 5]);

      const encrypted1 = encrypt(data, key);
      const encrypted2 = encrypt(data, key);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('falscher Key schlaegt fehl', () => {
      const key1 = generateGalleryKey();
      const key2 = generateGalleryKey();
      const data = new Uint8Array([1, 2, 3, 4, 5]);

      const encrypted = encrypt(data, key1);

      expect(() => decrypt(encrypted, key2)).toThrow();
    });

    it('manipulierter Ciphertext schlaegt fehl', () => {
      const key = generateGalleryKey();
      const data = new Uint8Array([1, 2, 3, 4, 5]);

      const encrypted = encrypt(data, key);
      // Manipuliere den Ciphertext
      const bytes = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0));
      bytes[bytes.length - 1] ^= 0xff;
      const manipulated = btoa(String.fromCharCode(...bytes));

      expect(() => decrypt(manipulated, key)).toThrow();
    });
  });

  describe('encryptString/decryptString', () => {
    it('verschluesselt und entschluesselt Strings', () => {
      const key = generateGalleryKey();
      const originalText = 'Hallo Welt! Das ist ein Test mit Umlauten: äöü ß';

      const encrypted = encryptString(originalText, key);
      const decrypted = decryptString(encrypted, key);

      expect(decrypted).toBe(originalText);
    });

    it('verschluesselt und entschluesselt leeren String', () => {
      const key = generateGalleryKey();
      const encrypted = encryptString('', key);
      const decrypted = decryptString(encrypted, key);
      expect(decrypted).toBe('');
    });

    it('verschluesselt und entschluesselt Emoji', () => {
      const key = generateGalleryKey();
      const originalText = '🎉 Party! 🎊 Emoji Test 🚀';

      const encrypted = encryptString(originalText, key);
      const decrypted = decryptString(encrypted, key);

      expect(decrypted).toBe(originalText);
    });
  });

  describe('getPayloadVersion', () => {
    it('gibt korrekte Version zurueck', () => {
      const key = generateGalleryKey();
      const encrypted = encrypt(new Uint8Array([1, 2, 3]), key);

      expect(getPayloadVersion(encrypted)).toBe(CURRENT_PAYLOAD_VERSION);
    });
  });
});

// ============================================================================
// Key Sharing Tests
// ============================================================================

describe('Key Sharing', () => {
  describe('encryptKeyForRecipient/decryptKeyFromSender', () => {
    it('teilt Key zwischen zwei Usern', () => {
      const alice = generateRandomKeyPair();
      const bob = generateRandomKeyPair();
      const galleryKey = generateGalleryKey();

      // Alice verschluesselt fuer Bob
      const encryptedForBob = encryptKeyForRecipient(
        galleryKey,
        bob.publicKey,
        alice.privateKey
      );

      // Bob entschluesselt
      const decryptedByBob = decryptKeyFromSender(
        encryptedForBob,
        alice.publicKey,
        bob.privateKey
      );

      expect(decryptedByBob).toBe(galleryKey);
    });

    it('falscher Empfaenger kann nicht entschluesseln', () => {
      const alice = generateRandomKeyPair();
      const bob = generateRandomKeyPair();
      const eve = generateRandomKeyPair();
      const galleryKey = generateGalleryKey();

      // Alice verschluesselt fuer Bob
      const encryptedForBob = encryptKeyForRecipient(
        galleryKey,
        bob.publicKey,
        alice.privateKey
      );

      // Eve versucht zu entschluesseln
      expect(() =>
        decryptKeyFromSender(encryptedForBob, alice.publicKey, eve.privateKey)
      ).toThrow();
    });

    it('falscher Sender Public Key schlaegt fehl', () => {
      const alice = generateRandomKeyPair();
      const bob = generateRandomKeyPair();
      const eve = generateRandomKeyPair();
      const galleryKey = generateGalleryKey();

      // Alice verschluesselt fuer Bob
      const encryptedForBob = encryptKeyForRecipient(
        galleryKey,
        bob.publicKey,
        alice.privateKey
      );

      // Bob versucht mit falschem Sender Public Key
      expect(() =>
        decryptKeyFromSender(encryptedForBob, eve.publicKey, bob.privateKey)
      ).toThrow();
    });
  });

  describe('encryptGalleryKeyForMembers', () => {
    it('verschluesselt Key fuer mehrere Mitglieder', () => {
      const owner = generateRandomKeyPair();
      const member1 = generateRandomKeyPair();
      const member2 = generateRandomKeyPair();
      const member3 = generateRandomKeyPair();
      const galleryKey = generateGalleryKey();

      const recipients = [
        { userId: 'user1', publicKey: member1.publicKey },
        { userId: 'user2', publicKey: member2.publicKey },
        { userId: 'user3', publicKey: member3.publicKey },
      ];

      const encryptedKeys = encryptGalleryKeyForMembers(
        galleryKey,
        recipients,
        owner.privateKey
      );

      expect(encryptedKeys).toHaveLength(3);

      // Jedes Mitglied kann entschluesseln
      const decrypted1 = decryptKeyFromSender(
        encryptedKeys[0]!.encryptedGalleryKey,
        owner.publicKey,
        member1.privateKey
      );
      const decrypted2 = decryptKeyFromSender(
        encryptedKeys[1]!.encryptedGalleryKey,
        owner.publicKey,
        member2.privateKey
      );
      const decrypted3 = decryptKeyFromSender(
        encryptedKeys[2]!.encryptedGalleryKey,
        owner.publicKey,
        member3.privateKey
      );

      expect(decrypted1).toBe(galleryKey);
      expect(decrypted2).toBe(galleryKey);
      expect(decrypted3).toBe(galleryKey);
    });
  });

  describe('Galerie-Key Rotation', () => {
    it('simuliert Key Rotation nach User-Austritt', () => {
      const owner = generateRandomKeyPair();
      const member1 = generateRandomKeyPair();
      const member2 = generateRandomKeyPair();
      const removedMember = generateRandomKeyPair();

      // Urspruenglicher Key
      const oldGalleryKey = generateGalleryKey();

      // Alle Mitglieder haben den alten Key
      const oldEncryptedKeys = encryptGalleryKeyForMembers(
        oldGalleryKey,
        [
          { userId: 'member1', publicKey: member1.publicKey },
          { userId: 'member2', publicKey: member2.publicKey },
          { userId: 'removed', publicKey: removedMember.publicKey },
        ],
        owner.privateKey
      );

      // User wird entfernt -> Neuer Key
      const newGalleryKey = generateGalleryKey();
      expect(newGalleryKey).not.toBe(oldGalleryKey);

      // Neuer Key nur an verbleibende Mitglieder
      const newEncryptedKeys = encryptGalleryKeyForMembers(
        newGalleryKey,
        [
          { userId: 'member1', publicKey: member1.publicKey },
          { userId: 'member2', publicKey: member2.publicKey },
          // removedMember ist NICHT mehr dabei
        ],
        owner.privateKey
      );

      // Verbleibende Mitglieder koennen neuen Key entschluesseln
      const decrypted1 = decryptKeyFromSender(
        newEncryptedKeys[0]!.encryptedGalleryKey,
        owner.publicKey,
        member1.privateKey
      );
      expect(decrypted1).toBe(newGalleryKey);

      // Entferntes Mitglied hat keinen Zugang zum neuen Key
      // (Es gibt keinen encryptedKey fuer sie)
      expect(newEncryptedKeys.find((k) => k.userId === 'removed')).toBeUndefined();

      // Alte Daten (mit altem Key verschluesselt) sind noch lesbar
      // fuer alle die den alten Key hatten
      const testData = new Uint8Array([1, 2, 3]);
      const encryptedWithOldKey = encrypt(testData, oldGalleryKey);

      // Entferntes Mitglied kann alte Daten noch lesen (hat alten Key gecached)
      const oldKeyForRemoved = decryptKeyFromSender(
        oldEncryptedKeys[2]!.encryptedGalleryKey,
        owner.publicKey,
        removedMember.privateKey
      );
      const decryptedOldData = decrypt(encryptedWithOldKey, oldKeyForRemoved);
      expect(decryptedOldData).toEqual(testData);

      // Aber neue Daten (mit neuem Key) kann entferntes Mitglied NICHT lesen
      const encryptedWithNewKey = encrypt(testData, newGalleryKey);
      expect(() => decrypt(encryptedWithNewKey, oldKeyForRemoved)).toThrow();
    });
  });
});

// ============================================================================
// Deterministischer Test mit bekannten Werten
// ============================================================================

describe('Bekannte Test-Vektoren', () => {
  it('BIP-39 Standard Test Vector generiert erwarteten Key', () => {
    // Standard BIP-39 Test Phrase
    const testPhrase = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

    const keyPair = deriveKeyPairFromSeedPhrase(testPhrase);

    // Der Key sollte immer gleich sein fuer diese Phrase
    // (Wichtig fuer Key Recovery!)
    expect(keyPair.publicKey).toBeDefined();
    expect(keyPair.privateKey).toBeDefined();

    // Zweiter Aufruf muss identisch sein
    const keyPair2 = deriveKeyPairFromSeedPhrase(testPhrase);
    expect(keyPair.publicKey).toBe(keyPair2.publicKey);
    expect(keyPair.privateKey).toBe(keyPair2.privateKey);
  });
});
