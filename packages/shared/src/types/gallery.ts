/**
 * Gallery Types
 *
 * Galerien sind Container fuer Bilder mit:
 * - Eigenem Encryption Key (pro Galerie)
 * - Mitgliederliste mit Rollen
 * - Public/Private Visibility
 */

import type { GalleryRole } from './roles';
import type { PublicUser } from './user';

// Galerie-Mitglied
export interface GalleryMember {
  userId: string;
  role: GalleryRole;
  encryptedGalleryKey: string; // Galerie-Key verschluesselt mit User's Public Key
  joinedAt: Date;
}

// Galerie-Mitglied mit User-Details (fuer UI)
export interface GalleryMemberWithUser extends GalleryMember {
  user: PublicUser;
}

// Vollstaendige Galerie (DB)
export interface Gallery {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  isPublic: boolean;
  coverImageId: string | null;
  members: GalleryMember[];
  createdAt: Date;
  updatedAt: Date;
  lastUploadAt: Date | null;
}

// Galerie fuer Listen-Ansicht (weniger Daten)
export interface GalleryListItem {
  id: string;
  name: string;
  isPublic: boolean;
  coverImageId: string | null;
  memberCount: number;
  imageCount: number;
  myRole: GalleryRole;
  lastUploadAt: Date | null;
}

// Galerie-Details (fuer Detail-Ansicht)
export interface GalleryDetails extends Omit<Gallery, 'members'> {
  members: GalleryMemberWithUser[];
  imageCount: number;
  storageUsedBytes: number;
  myRole: GalleryRole;
  encryptedGalleryKey: string; // Mein verschluesselter Key
}

// Galerie fuer Admin (keine Inhalte, nur Metadaten)
export interface GalleryAdminView {
  id: string;
  name: string;
  ownerId: string;
  ownerDisplayName: string;
  isPublic: boolean;
  memberCount: number;
  imageCount: number;
  commentCount: number;
  storageUsedBytes: number;
  reportCount: number;
  createdAt: Date;
  lastUploadAt: Date | null;
}
