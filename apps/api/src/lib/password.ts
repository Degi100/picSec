/**
 * Password Hashing
 *
 * Verwendet Node.js crypto mit scrypt fuer sicheres Password Hashing.
 * Keine externen Dependencies noetig.
 */

import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

// Scrypt Parameter (N=16384, r=8, p=1 - Standard)
const SCRYPT_KEYLEN = 64;
const SALT_LENGTH = 32;

/**
 * Hasht ein Passwort
 *
 * @param password - Das zu hashende Passwort
 * @returns Hash im Format: salt.hash (beides Base64)
 */
export const hashPassword = async (password: string): Promise<string> => {
  const salt = randomBytes(SALT_LENGTH);
  const hash = (await scryptAsync(password, salt, SCRYPT_KEYLEN)) as Buffer;

  return `${salt.toString('base64')}.${hash.toString('base64')}`;
};

/**
 * Verifiziert ein Passwort gegen einen Hash
 *
 * @param password - Das zu pruefende Passwort
 * @param storedHash - Der gespeicherte Hash (salt.hash)
 * @returns true wenn Passwort korrekt
 */
export const verifyPassword = async (password: string, storedHash: string): Promise<boolean> => {
  const [saltB64, hashB64] = storedHash.split('.');

  if (!saltB64 || !hashB64) {
    return false;
  }

  const salt = Buffer.from(saltB64, 'base64');
  const storedHashBuffer = Buffer.from(hashB64, 'base64');

  const hash = (await scryptAsync(password, salt, SCRYPT_KEYLEN)) as Buffer;

  // Timing-safe Vergleich gegen Timing Attacks
  return timingSafeEqual(hash, storedHashBuffer);
};
