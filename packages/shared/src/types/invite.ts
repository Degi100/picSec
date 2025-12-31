/**
 * Invite Types
 *
 * Zwei Arten von Einladungen:
 * 1. GalleryInvite - Einladung zu einer spezifischen Galerie
 * 2. GlobalInviteCode - Registrierungs-Code (Admin erstellt)
 */

import type { GalleryRole } from './roles';
import type { PublicUser } from './user';

// Galerie-Einladung Methode
export const GALLERY_INVITE_TYPES = {
  MAGIC_LINK: 'magic_link',
  CODE: 'code',
  DIRECT: 'direct', // Direkte Einladung an registrierten User per Email
} as const;

export type GalleryInviteType = (typeof GALLERY_INVITE_TYPES)[keyof typeof GALLERY_INVITE_TYPES];

// Galerie-Einladung (DB)
export interface GalleryInvite {
  id: string;
  galleryId: string;
  inviterId: string;
  role: Exclude<GalleryRole, 'owner'>; // Kann nur Photoshoter oder Viewer einladen
  type: GalleryInviteType;
  token: string; // Magic Link Token oder Code (leer bei DIRECT)
  targetUserId: string | null; // Nur bei DIRECT - der eingeladene User
  targetEmail: string | null; // Nur bei DIRECT - Email des eingeladenen Users
  usedById: string | null;
  expiresAt: Date;
  createdAt: Date;
  usedAt: Date | null;
  status: 'pending' | 'accepted' | 'declined' | 'expired'; // Nur bei DIRECT
}

// Galerie-Einladung fuer UI (Preview vor Annahme)
export interface GalleryInvitePreview {
  galleryName: string;
  galleryDescription: string | null;
  imageCount: number;
  inviterName: string;
  role: Exclude<GalleryRole, 'owner'>;
  expiresAt: Date;
}

// Galerie-Einladung mit Details (fuer Owner-Ansicht)
export interface GalleryInviteWithDetails extends GalleryInvite {
  usedBy: PublicUser | null;
}

// Globaler Invite-Code (fuer Registrierung)
export interface GlobalInviteCode {
  id: string;
  code: string;
  createdById: string; // Admin
  description: string | null; // z.B. "Silvester Launch"
  maxUses: number | null; // null = unlimited
  usedCount: number;
  usedByIds: string[];
  expiresAt: Date | null; // null = kein Ablauf
  isActive: boolean;
  createdAt: Date;
}

// Globaler Invite-Code fuer Admin-Liste
export interface GlobalInviteCodeWithDetails extends GlobalInviteCode {
  createdBy: PublicUser;
  usedBy: PublicUser[];
}

// Invite Konstanten
export const INVITE_CONFIG = {
  GALLERY_INVITE_EXPIRY_HOURS: 72, // 3 Tage
  CODE_LENGTH: 8, // z.B. "SILV2024"
  MAGIC_LINK_TOKEN_LENGTH: 32,
} as const;
