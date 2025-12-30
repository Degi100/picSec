/**
 * Image Types
 *
 * Bilder werden in 3 Groessen gespeichert:
 * - Thumbnail (~50KB) - Galerie-Uebersicht
 * - Preview (~200KB) - Vollbild-Ansicht in App
 * - Original (3-5MB) - Download
 *
 * Alle verschluesselt mit Galerie-Key in MinIO
 */

import type { PublicUser } from './user';

// Bild-Varianten
export const IMAGE_VARIANTS = {
  THUMBNAIL: 'thumbnail',
  PREVIEW: 'preview',
  ORIGINAL: 'original',
} as const;

export type ImageVariant = (typeof IMAGE_VARIANTS)[keyof typeof IMAGE_VARIANTS];

// Storage-Pfad Info fuer eine Bild-Variante
export interface ImageVariantInfo {
  variant: ImageVariant;
  storagePath: string; // Pfad in MinIO
  sizeBytes: number;
  width: number;
  height: number;
}

// Vollstaendiges Bild (DB)
export interface Image {
  id: string;
  galleryId: string;
  uploaderId: string;
  mimeType: string;
  originalFilename: string;
  variants: ImageVariantInfo[];
  totalSizeBytes: number; // Summe aller Varianten
  encryptionVersion: number; // Fuer Payload Versioning
  createdAt: Date;
}

// Bild fuer Galerie-Grid (nur Thumbnail-Info)
export interface ImageGridItem {
  id: string;
  thumbnailPath: string;
  thumbnailSizeBytes: number;
  width: number; // Thumbnail Dimensionen
  height: number;
  uploaderId: string;
  createdAt: Date;
}

// Bild-Details (fuer Vollbild-Ansicht)
export interface ImageDetails extends Image {
  uploader: PublicUser;
  commentCount: number;
}

// Upload-Antwort (nach erfolgreichem Upload)
export interface ImageUploadResult {
  id: string;
  galleryId: string;
  variants: ImageVariantInfo[];
  totalSizeBytes: number;
}

// Konstanten fuer Bild-Verarbeitung
export const IMAGE_CONFIG = {
  THUMBNAIL: {
    maxWidth: 300,
    maxHeight: 300,
    quality: 80,
  },
  PREVIEW: {
    maxWidth: 1200,
    maxHeight: 1200,
    quality: 85,
  },
  ORIGINAL: {
    // Keine Resize, aber Re-encode fuer Metadaten-Strip
    quality: 95,
  },
  MAX_FILE_SIZE_BYTES: 20 * 1024 * 1024, // 20MB
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
} as const;
