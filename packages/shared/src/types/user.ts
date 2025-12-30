/**
 * User Types
 *
 * Unterscheidung zwischen:
 * - User: Vollstaendiges User-Objekt (Backend)
 * - PublicUser: Oeffentliche Felder (fuer andere User sichtbar)
 * - AuthUser: User mit Auth-relevanten Feldern (fuer Auth-Kontext)
 */

import type { AppRole } from './roles';

// User Status
export const USER_STATUS = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  DELETED: 'deleted',
} as const;

export type UserStatus = (typeof USER_STATUS)[keyof typeof USER_STATUS];

// Vollstaendiger User (nur Backend/DB)
export interface User {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  publicKey: string; // Base64-encoded Public Key fuer E2E
  appRole: AppRole;
  status: UserStatus;
  pushToken: string | null; // Expo Push Token
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt: Date;
}

// Oeffentliche User-Daten (fuer andere User sichtbar)
export interface PublicUser {
  id: string;
  displayName: string;
  publicKey: string;
}

// User fuer Auth-Kontext (nach Login)
export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  publicKey: string;
  appRole: AppRole;
  status: UserStatus;
}

// User mit Statistiken (fuer Admin Dashboard)
export interface UserWithStats extends Omit<User, 'passwordHash'> {
  galleriesOwned: number;
  galleriesMember: number;
  imagesUploaded: number;
  commentsCount: number;
  storageUsedBytes: number;
  reportsAgainst: number;
}
