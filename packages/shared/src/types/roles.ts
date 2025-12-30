/**
 * Rollen-Definitionen fuer PicSec
 *
 * Zwei Ebenen:
 * 1. AppRole - Globale Rolle in der App (User vs Admin)
 * 2. GalleryRole - Rolle innerhalb einer Galerie (Owner > Photoshoter > Viewer)
 */

// App-weite Rollen
export const APP_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
} as const;

export type AppRole = (typeof APP_ROLES)[keyof typeof APP_ROLES];

// Galerie-spezifische Rollen
export const GALLERY_ROLES = {
  OWNER: 'owner',
  PHOTOSHOTER: 'photoshoter',
  VIEWER: 'viewer',
} as const;

export type GalleryRole = (typeof GALLERY_ROLES)[keyof typeof GALLERY_ROLES];

// Berechtigungen pro Galerie-Rolle
export interface GalleryPermissions {
  canUpload: boolean;
  canDeleteOwn: boolean;
  canDeleteAll: boolean;
  canDownloadOwn: boolean;
  canDownloadAll: boolean;
  canInvite: boolean;
  canRemoveMembers: boolean;
  canEditGallery: boolean;
  canDeleteGallery: boolean;
  canComment: boolean;
}

export const GALLERY_ROLE_PERMISSIONS: Record<GalleryRole, GalleryPermissions> = {
  owner: {
    canUpload: true,
    canDeleteOwn: true,
    canDeleteAll: true,
    canDownloadOwn: true,
    canDownloadAll: true,
    canInvite: true,
    canRemoveMembers: true,
    canEditGallery: true,
    canDeleteGallery: true,
    canComment: true,
  },
  photoshoter: {
    canUpload: true,
    canDeleteOwn: true,
    canDeleteAll: false,
    canDownloadOwn: true,
    canDownloadAll: false,
    canInvite: false,
    canRemoveMembers: false,
    canEditGallery: false,
    canDeleteGallery: false,
    canComment: true,
  },
  viewer: {
    canUpload: false,
    canDeleteOwn: false,
    canDeleteAll: false,
    canDownloadOwn: false,
    canDownloadAll: false,
    canInvite: false,
    canRemoveMembers: false,
    canEditGallery: false,
    canDeleteGallery: false,
    canComment: true,
  },
};

// Helper: Prueft ob eine Rolle eine bestimmte Berechtigung hat
export const hasPermission = (
  role: GalleryRole,
  permission: keyof GalleryPermissions
): boolean => {
  return GALLERY_ROLE_PERMISSIONS[role][permission];
};
