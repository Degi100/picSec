/**
 * MongoDB Collections
 *
 * Typisierte Collection-Accessors fuer alle Entitaeten.
 * Verwendet die Types aus @picsec/shared.
 */

import { Collection, ObjectId, WithoutId } from 'mongodb';

import type {
  User,
  Gallery,
  GalleryMember,
  Image,
  Comment,
  Report,
  GalleryInvite,
  GlobalInviteCode,
  AuditLogEntry,
} from '@picsec/shared';

import { getDb } from './client';

// ============================================================================
// MongoDB Document Types (mit _id statt id)
// ============================================================================

export interface UserDocument extends Omit<User, 'id'> {
  _id: ObjectId;
}

export interface GalleryDocument extends Omit<Gallery, 'id' | 'members'> {
  _id: ObjectId;
  members: Array<Omit<GalleryMember, 'joinedAt'> & { joinedAt: Date }>;
}

export interface ImageDocument extends Omit<Image, 'id'> {
  _id: ObjectId;
}

export interface CommentDocument extends Omit<Comment, 'id'> {
  _id: ObjectId;
}

export interface ReportDocument extends Omit<Report, 'id'> {
  _id: ObjectId;
}

export interface GalleryInviteDocument extends Omit<GalleryInvite, 'id'> {
  _id: ObjectId;
}

export interface GlobalInviteCodeDocument extends Omit<GlobalInviteCode, 'id'> {
  _id: ObjectId;
}

export interface AuditLogDocument extends Omit<AuditLogEntry, 'id'> {
  _id: ObjectId;
}

// Refresh Token fuer Auth
export interface RefreshTokenDocument {
  _id: ObjectId;
  userId: ObjectId;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  deviceInfo: string | null;
}

// ============================================================================
// Insert Types (ohne _id, MongoDB generiert sie automatisch)
// ============================================================================

export type UserInsert = WithoutId<UserDocument>;
export type GalleryInsert = WithoutId<GalleryDocument>;
export type ImageInsert = WithoutId<ImageDocument>;
export type CommentInsert = WithoutId<CommentDocument>;
export type ReportInsert = WithoutId<ReportDocument>;
export type GalleryInviteInsert = WithoutId<GalleryInviteDocument>;
export type GlobalInviteCodeInsert = WithoutId<GlobalInviteCodeDocument>;
export type AuditLogInsert = WithoutId<AuditLogDocument>;
export type RefreshTokenInsert = WithoutId<RefreshTokenDocument>;

// ============================================================================
// Collection Accessors
// ============================================================================

export const collections = {
  users: (): Collection<UserDocument> => getDb().collection('users'),

  galleries: (): Collection<GalleryDocument> => getDb().collection('galleries'),

  images: (): Collection<ImageDocument> => getDb().collection('images'),

  comments: (): Collection<CommentDocument> => getDb().collection('comments'),

  reports: (): Collection<ReportDocument> => getDb().collection('reports'),

  galleryInvites: (): Collection<GalleryInviteDocument> => getDb().collection('gallery_invites'),

  globalInviteCodes: (): Collection<GlobalInviteCodeDocument> =>
    getDb().collection('global_invite_codes'),

  auditLog: (): Collection<AuditLogDocument> => getDb().collection('audit_log'),

  refreshTokens: (): Collection<RefreshTokenDocument> => getDb().collection('refresh_tokens'),
};

// ============================================================================
// Hilfsfunktionen
// ============================================================================

/**
 * Konvertiert ObjectId zu String ID
 */
export const toId = (objectId: ObjectId): string => objectId.toHexString();

/**
 * Konvertiert String ID zu ObjectId
 */
export const toObjectId = (id: string): ObjectId => new ObjectId(id);

/**
 * Prueft ob ein String eine gueltige ObjectId ist
 */
export const isValidObjectId = (id: string): boolean => {
  try {
    new ObjectId(id);
    return true;
  } catch {
    return false;
  }
};
