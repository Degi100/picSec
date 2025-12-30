/**
 * Image Routes
 *
 * Upload, Download und Verwaltung von verschluesselten Bildern.
 * Bilder werden clientseitig verschluesselt - API speichert nur Blobs.
 */

import { Hono } from 'hono';

import {
  IMAGE_VARIANTS,
  IMAGE_CONFIG,
  type ImageVariant,
  type ImageVariantInfo,
} from '@picsec/shared';
import { collections, toId, toObjectId, ObjectId, isValidObjectId, GalleryDocument } from '@picsec/db';

import { authMiddleware } from '../middleware/auth';
import { Errors } from '../middleware/errorHandler';
import type { AppVariables } from '../app';
import {
  uploadFile,
  deleteDirectory,
  getImagePath,
  getFileStream,
} from '../services/minio';

export const imageRoutes = new Hono<{ Variables: AppVariables }>();

// Alle Image-Routes brauchen Auth
imageRoutes.use('*', authMiddleware);

// ============================================================================
// Hilfsfunktionen
// ============================================================================

/**
 * Prueft ob User Zugriff auf Galerie hat (Mitglied)
 */
const checkGalleryAccess = async (
  galleryId: string,
  userId: string,
  requiredRoles?: string[]
): Promise<{ gallery: GalleryDocument; memberRole: string }> => {
  if (!isValidObjectId(galleryId)) {
    throw Errors.NOT_FOUND('Galerie');
  }

  const gallery = await collections.galleries().findOne({
    _id: toObjectId(galleryId),
  });

  if (!gallery) {
    throw Errors.NOT_FOUND('Galerie');
  }

  const member = gallery.members.find((m) => m.userId === userId);

  if (!member) {
    throw Errors.FORBIDDEN('Kein Zugriff auf diese Galerie');
  }

  if (requiredRoles && !requiredRoles.includes(member.role)) {
    throw Errors.FORBIDDEN('Keine Berechtigung fuer diese Aktion');
  }

  return { gallery, memberRole: member.role };
};

// ============================================================================
// POST /galleries/:galleryId/images - Bild hochladen
// ============================================================================

imageRoutes.post('/galleries/:galleryId/images', async (c) => {
  const userId = c.get('userId')!;
  const galleryId = c.req.param('galleryId');

  // Galerie-Zugriff pruefen (Owner oder Photoshoter duerfen uploaden)
  await checkGalleryAccess(galleryId, userId, ['owner', 'photoshoter']);

  // Multipart Form Data parsen
  const formData = await c.req.formData();

  // Metadaten
  const originalFilename = formData.get('originalFilename') as string;
  const mimeType = formData.get('mimeType') as string;

  if (!originalFilename || !mimeType) {
    throw Errors.VALIDATION_ERROR({
      metadata: 'originalFilename und mimeType sind erforderlich',
    });
  }

  // Mime-Type validieren
  if (!IMAGE_CONFIG.ALLOWED_MIME_TYPES.includes(mimeType as typeof IMAGE_CONFIG.ALLOWED_MIME_TYPES[number])) {
    throw Errors.VALIDATION_ERROR({
      mimeType: `Ungueltiger Dateityp. Erlaubt: ${IMAGE_CONFIG.ALLOWED_MIME_TYPES.join(', ')}`,
    });
  }

  // Verschluesselte Varianten
  const thumbnail = formData.get('thumbnail') as File | null;
  const preview = formData.get('preview') as File | null;
  const original = formData.get('original') as File | null;

  if (!thumbnail || !preview || !original) {
    throw Errors.VALIDATION_ERROR({
      variants: 'Alle drei Varianten (thumbnail, preview, original) sind erforderlich',
    });
  }

  // Groessen-Check
  const totalSize = thumbnail.size + preview.size + original.size;
  if (totalSize > IMAGE_CONFIG.MAX_FILE_SIZE_BYTES * 3) {
    throw Errors.VALIDATION_ERROR({
      size: `Maximale Gesamtgroesse ueberschritten (${IMAGE_CONFIG.MAX_FILE_SIZE_BYTES * 3 / 1024 / 1024}MB)`,
    });
  }

  // Dimensionen aus Metadaten (Client sendet diese mit)
  const thumbnailWidth = parseInt(formData.get('thumbnailWidth') as string, 10) || 0;
  const thumbnailHeight = parseInt(formData.get('thumbnailHeight') as string, 10) || 0;
  const previewWidth = parseInt(formData.get('previewWidth') as string, 10) || 0;
  const previewHeight = parseInt(formData.get('previewHeight') as string, 10) || 0;
  const originalWidth = parseInt(formData.get('originalWidth') as string, 10) || 0;
  const originalHeight = parseInt(formData.get('originalHeight') as string, 10) || 0;

  // Image-ID generieren
  const imageId = new ObjectId();
  const imageIdStr = toId(imageId);

  // Varianten-Info erstellen
  const variants: ImageVariantInfo[] = [
    {
      variant: IMAGE_VARIANTS.THUMBNAIL,
      storagePath: getImagePath(galleryId, imageIdStr, IMAGE_VARIANTS.THUMBNAIL),
      sizeBytes: thumbnail.size,
      width: thumbnailWidth,
      height: thumbnailHeight,
    },
    {
      variant: IMAGE_VARIANTS.PREVIEW,
      storagePath: getImagePath(galleryId, imageIdStr, IMAGE_VARIANTS.PREVIEW),
      sizeBytes: preview.size,
      width: previewWidth,
      height: previewHeight,
    },
    {
      variant: IMAGE_VARIANTS.ORIGINAL,
      storagePath: getImagePath(galleryId, imageIdStr, IMAGE_VARIANTS.ORIGINAL),
      sizeBytes: original.size,
      width: originalWidth,
      height: originalHeight,
    },
  ];

  // In MinIO hochladen
  const thumbnailBuffer = Buffer.from(await thumbnail.arrayBuffer());
  const previewBuffer = Buffer.from(await preview.arrayBuffer());
  const originalBuffer = Buffer.from(await original.arrayBuffer());

  await Promise.all([
    uploadFile(variants[0]!.storagePath, thumbnailBuffer),
    uploadFile(variants[1]!.storagePath, previewBuffer),
    uploadFile(variants[2]!.storagePath, originalBuffer),
  ]);

  // In MongoDB speichern
  const now = new Date();
  await collections.images().insertOne({
    _id: imageId,
    galleryId,
    uploaderId: userId,
    mimeType,
    originalFilename,
    variants,
    totalSizeBytes: totalSize,
    encryptionVersion: 1,
    createdAt: now,
  });

  // Gallery lastUploadAt aktualisieren
  await collections.galleries().updateOne(
    { _id: toObjectId(galleryId) },
    { $set: { lastUploadAt: now, updatedAt: now } }
  );

  return c.json(
    {
      success: true,
      data: {
        image: {
          id: imageIdStr,
          galleryId,
          variants,
          totalSizeBytes: totalSize,
          createdAt: now,
        },
      },
    },
    201
  );
});

// ============================================================================
// GET /galleries/:galleryId/images - Bilder einer Galerie auflisten
// ============================================================================

imageRoutes.get('/galleries/:galleryId/images', async (c) => {
  const userId = c.get('userId')!;
  const galleryId = c.req.param('galleryId');

  // Galerie-Zugriff pruefen (alle Mitglieder duerfen sehen)
  await checkGalleryAccess(galleryId, userId);

  // Query Parameter
  const cursor = c.req.query('cursor');
  const limit = Math.min(parseInt(c.req.query('limit') || '20', 10), 100);

  // Query bauen
  const query: Record<string, unknown> = { galleryId };

  if (cursor && isValidObjectId(cursor)) {
    query._id = { $lt: toObjectId(cursor) };
  }

  // Bilder laden (neueste zuerst)
  const images = await collections
    .images()
    .find(query)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .toArray();

  // Pruefen ob es mehr gibt
  const hasMore = images.length > limit;
  if (hasMore) {
    images.pop();
  }

  // Response formatieren
  const imageList = images.map((img) => {
    const thumbnail = img.variants.find((v) => v.variant === IMAGE_VARIANTS.THUMBNAIL);
    return {
      id: toId(img._id),
      thumbnailPath: thumbnail?.storagePath || '',
      thumbnailSizeBytes: thumbnail?.sizeBytes || 0,
      width: thumbnail?.width || 0,
      height: thumbnail?.height || 0,
      uploaderId: img.uploaderId,
      createdAt: img.createdAt,
    };
  });

  const nextCursor = hasMore && images.length > 0 ? toId(images[images.length - 1]!._id) : null;

  return c.json({
    success: true,
    data: {
      images: imageList,
      nextCursor,
      hasMore,
    },
  });
});

// ============================================================================
// GET /images/:id - Bild-Details
// ============================================================================

imageRoutes.get('/images/:id', async (c) => {
  const userId = c.get('userId')!;
  const imageId = c.req.param('id');

  if (!isValidObjectId(imageId)) {
    throw Errors.NOT_FOUND('Bild');
  }

  const image = await collections.images().findOne({
    _id: toObjectId(imageId),
  });

  if (!image) {
    throw Errors.NOT_FOUND('Bild');
  }

  // Galerie-Zugriff pruefen
  await checkGalleryAccess(image.galleryId, userId);

  // Uploader-Info laden
  const uploader = await collections.users().findOne({
    _id: toObjectId(image.uploaderId),
  });

  // Comment Count
  const commentCount = await collections.comments().countDocuments({
    imageId: toId(image._id),
  });

  return c.json({
    success: true,
    data: {
      image: {
        id: toId(image._id),
        galleryId: image.galleryId,
        uploaderId: image.uploaderId,
        mimeType: image.mimeType,
        originalFilename: image.originalFilename,
        variants: image.variants,
        totalSizeBytes: image.totalSizeBytes,
        encryptionVersion: image.encryptionVersion,
        createdAt: image.createdAt,
        uploader: uploader
          ? {
              id: toId(uploader._id),
              displayName: uploader.displayName,
              publicKey: uploader.publicKey,
            }
          : null,
        commentCount,
      },
    },
  });
});

// ============================================================================
// GET /images/:id/:variant - Bild-Variante herunterladen
// ============================================================================

imageRoutes.get('/images/:id/:variant', async (c) => {
  const userId = c.get('userId')!;
  const imageId = c.req.param('id');
  const variantParam = c.req.param('variant') as ImageVariant;

  // Variante validieren
  const validVariants = Object.values(IMAGE_VARIANTS);
  if (!validVariants.includes(variantParam)) {
    throw Errors.VALIDATION_ERROR({
      variant: `Ungueltige Variante. Erlaubt: ${validVariants.join(', ')}`,
    });
  }

  if (!isValidObjectId(imageId)) {
    throw Errors.NOT_FOUND('Bild');
  }

  const image = await collections.images().findOne({
    _id: toObjectId(imageId),
  });

  if (!image) {
    throw Errors.NOT_FOUND('Bild');
  }

  // Galerie-Zugriff pruefen
  await checkGalleryAccess(image.galleryId, userId);

  // Variante finden
  const variant = image.variants.find((v) => v.variant === variantParam);

  if (!variant) {
    throw Errors.NOT_FOUND('Bild-Variante');
  }

  // Stream aus MinIO
  const stream = await getFileStream(variant.storagePath);

  // Als Blob zurueckgeben
  return new Response(stream as unknown as ReadableStream, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Length': variant.sizeBytes.toString(),
      'X-Encryption-Version': image.encryptionVersion.toString(),
    },
  });
});

// ============================================================================
// DELETE /images/:id - Bild loeschen
// ============================================================================

imageRoutes.delete('/images/:id', async (c) => {
  const userId = c.get('userId')!;
  const imageId = c.req.param('id');

  if (!isValidObjectId(imageId)) {
    throw Errors.NOT_FOUND('Bild');
  }

  const image = await collections.images().findOne({
    _id: toObjectId(imageId),
  });

  if (!image) {
    throw Errors.NOT_FOUND('Bild');
  }

  // Zugriff pruefen: Owner der Galerie oder Uploader
  const { gallery } = await checkGalleryAccess(image.galleryId, userId);

  const isGalleryOwner = gallery.ownerId === userId;
  const isUploader = image.uploaderId === userId;

  if (!isGalleryOwner && !isUploader) {
    throw Errors.FORBIDDEN('Nur der Galerie-Owner oder Uploader kann das Bild loeschen');
  }

  // Aus MinIO loeschen
  await deleteDirectory(`galleries/${image.galleryId}/images/${toId(image._id)}`);

  // Aus MongoDB loeschen
  await collections.images().deleteOne({ _id: image._id });

  // Kommentare zum Bild loeschen
  await collections.comments().deleteMany({ imageId: toId(image._id) });

  return c.json({
    success: true,
    data: {
      message: 'Bild geloescht',
    },
  });
});
