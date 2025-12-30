/**
 * MongoDB Indexes
 *
 * Erstellt alle notwendigen Indizes fuer Performance und Constraints.
 * Sollte beim Server-Start aufgerufen werden.
 */

import { getDb } from './client';

/**
 * Erstellt alle Datenbank-Indizes
 *
 * Idempotent - kann mehrfach aufgerufen werden.
 */
export const createIndexes = async (): Promise<void> => {
  const db = getDb();

  console.log('[DB] Erstelle Indizes...');

  // Users
  await db.collection('users').createIndexes([
    { key: { email: 1 }, unique: true },
    { key: { status: 1 } },
    { key: { appRole: 1 } },
    { key: { createdAt: -1 } },
    { key: { lastActiveAt: -1 } },
  ]);

  // Galleries
  await db.collection('galleries').createIndexes([
    { key: { ownerId: 1 } },
    { key: { isPublic: 1 } },
    { key: { 'members.userId': 1 } },
    { key: { createdAt: -1 } },
    { key: { lastUploadAt: -1 } },
  ]);

  // Images
  await db.collection('images').createIndexes([
    { key: { galleryId: 1, createdAt: -1 } },
    { key: { uploaderId: 1 } },
    { key: { createdAt: -1 } },
  ]);

  // Comments
  await db.collection('comments').createIndexes([
    { key: { imageId: 1, createdAt: 1 } },
    { key: { galleryId: 1 } },
    { key: { authorId: 1 } },
    { key: { parentId: 1 } },
  ]);

  // Reports
  await db.collection('reports').createIndexes([
    { key: { status: 1, createdAt: -1 } },
    { key: { reporterId: 1 } },
    { key: { targetType: 1, targetId: 1 } },
    { key: { galleryId: 1 } },
  ]);

  // Gallery Invites
  await db.collection('gallery_invites').createIndexes([
    { key: { token: 1 }, unique: true },
    { key: { galleryId: 1 } },
    { key: { expiresAt: 1 }, expireAfterSeconds: 0 }, // TTL Index
  ]);

  // Global Invite Codes
  await db.collection('global_invite_codes').createIndexes([
    { key: { code: 1 }, unique: true },
    { key: { isActive: 1 } },
  ]);

  // Audit Log
  await db.collection('audit_log').createIndexes([
    { key: { createdAt: -1 } },
    { key: { adminId: 1, createdAt: -1 } },
    { key: { action: 1 } },
    { key: { targetType: 1, targetId: 1 } },
  ]);

  // Refresh Tokens
  await db.collection('refresh_tokens').createIndexes([
    { key: { token: 1 }, unique: true },
    { key: { userId: 1 } },
    { key: { expiresAt: 1 }, expireAfterSeconds: 0 }, // TTL Index
  ]);

  console.log('[DB] Indizes erstellt');
};
