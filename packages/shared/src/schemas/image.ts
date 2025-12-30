/**
 * Image Zod Schemas
 *
 * Validierung fuer Bild-bezogene API Inputs
 * (Upload selbst ist Multipart, aber Metadaten werden validiert)
 */

import { z } from 'zod';

import { IMAGE_CONFIG } from '../types';

// Upload-Metadaten (wird mit dem Bild mitgesendet)
export const imageUploadMetaSchema = z.object({
  galleryId: z.string().min(1, 'Galerie-ID ist erforderlich'),
  originalFilename: z.string().min(1).max(255),
  mimeType: z.enum(IMAGE_CONFIG.ALLOWED_MIME_TYPES as unknown as [string, ...string[]]),
});

export type ImageUploadMetaInput = z.infer<typeof imageUploadMetaSchema>;

// Bild loeschen
export const deleteImageSchema = z.object({
  imageId: z.string().min(1),
});

export type DeleteImageInput = z.infer<typeof deleteImageSchema>;

// Mehrere Bilder loeschen (Batch)
export const deleteImagesSchema = z.object({
  imageIds: z.array(z.string().min(1)).min(1).max(50), // Max 50 auf einmal
});

export type DeleteImagesInput = z.infer<typeof deleteImagesSchema>;

// Bild-Download anfordern (fuer Original)
export const requestDownloadSchema = z.object({
  imageId: z.string().min(1),
});

export type RequestDownloadInput = z.infer<typeof requestDownloadSchema>;

// Pagination fuer Galerie-Bilder
export const getGalleryImagesSchema = z.object({
  galleryId: z.string().min(1),
  cursor: z.string().optional(), // ID des letzten Bildes
  limit: z.number().min(1).max(100).default(20),
});

export type GetGalleryImagesInput = z.infer<typeof getGalleryImagesSchema>;
