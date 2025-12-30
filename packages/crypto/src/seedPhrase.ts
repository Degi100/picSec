/**
 * Seed Phrase Generation und Validierung
 *
 * Verwendet BIP-39 Standard fuer 12-Wort Mnemonics.
 * Die Seed Phrase ist die einzige Moeglichkeit, den Private Key wiederherzustellen.
 */

import * as bip39 from 'bip39';

import { SEED_PHRASE_CONFIG } from './constants';

/**
 * Generiert eine neue 12-Wort Seed Phrase
 *
 * @returns Die generierte Seed Phrase (12 Woerter, Leerzeichen-getrennt)
 */
export const generateSeedPhrase = (): string => {
  // 128 bits entropy = 12 Woerter
  return bip39.generateMnemonic(SEED_PHRASE_CONFIG.ENTROPY_BITS);
};

/**
 * Validiert eine Seed Phrase
 *
 * Prueft:
 * - Korrekte Anzahl Woerter (12)
 * - Alle Woerter sind in der BIP-39 Wortliste
 * - Checksum ist korrekt
 *
 * @param phrase - Die zu validierende Seed Phrase
 * @returns true wenn gueltig, false wenn ungueltig
 */
export const validateSeedPhrase = (phrase: string): boolean => {
  const words = phrase.trim().toLowerCase().split(/\s+/);

  // Muss genau 12 Woerter haben
  if (words.length !== SEED_PHRASE_CONFIG.WORD_COUNT) {
    return false;
  }

  // BIP-39 Validierung (inkl. Checksum)
  return bip39.validateMnemonic(phrase.trim().toLowerCase());
};

/**
 * Normalisiert eine Seed Phrase
 *
 * - Trimmt Whitespace
 * - Konvertiert zu Lowercase
 * - Normalisiert Leerzeichen
 *
 * @param phrase - Die zu normalisierende Seed Phrase
 * @returns Die normalisierte Seed Phrase
 */
export const normalizeSeedPhrase = (phrase: string): string => {
  return phrase.trim().toLowerCase().split(/\s+/).join(' ');
};

/**
 * Extrahiert die Entropy aus einer Seed Phrase
 *
 * Wird fuer Key Derivation verwendet.
 *
 * @param phrase - Die Seed Phrase
 * @returns 16 Bytes Entropy als Uint8Array
 * @throws Error wenn die Phrase ungueltig ist
 */
export const seedPhraseToEntropy = (phrase: string): Uint8Array => {
  const normalized = normalizeSeedPhrase(phrase);

  if (!validateSeedPhrase(normalized)) {
    throw new Error('Ungueltige Seed Phrase');
  }

  const entropyHex = bip39.mnemonicToEntropy(normalized);
  return Uint8Array.from(Buffer.from(entropyHex, 'hex'));
};

/**
 * Holt ein bestimmtes Wort aus der Seed Phrase
 *
 * Fuer das Verifikations-Quiz bei der Registrierung.
 *
 * @param phrase - Die Seed Phrase
 * @param position - Position des Wortes (1-basiert, 1-12)
 * @returns Das Wort an der Position
 * @throws Error wenn Position ungueltig
 */
export const getWordAtPosition = (phrase: string, position: number): string => {
  if (position < 1 || position > SEED_PHRASE_CONFIG.WORD_COUNT) {
    throw new Error(`Position muss zwischen 1 und ${SEED_PHRASE_CONFIG.WORD_COUNT} sein`);
  }

  const words = normalizeSeedPhrase(phrase).split(' ');
  const word = words[position - 1];

  if (!word) {
    throw new Error('Ungueltige Seed Phrase');
  }

  return word;
};

/**
 * Generiert zufaellige Quiz-Positionen fuer die Seed Phrase Verifikation
 *
 * @param count - Anzahl der Positionen (default: 3)
 * @returns Array von zufaelligen Positionen (1-basiert)
 */
export const generateQuizPositions = (count: number = 3): number[] => {
  const positions = new Set<number>();

  while (positions.size < count) {
    // Zufaellige Position zwischen 1 und 12
    const pos = Math.floor(Math.random() * SEED_PHRASE_CONFIG.WORD_COUNT) + 1;
    positions.add(pos);
  }

  return Array.from(positions).sort((a, b) => a - b);
};
