/**
 * MinIO Service
 *
 * Object Storage fuer verschluesselte Bilder.
 * Bilder werden clientseitig verschluesselt und als Blob gespeichert.
 */

import { Client } from 'minio';
import { Readable } from 'stream';

import { config } from '../config';

// MinIO Client Instance
let minioClient: Client | null = null;

/**
 * Initialisiert den MinIO Client
 */
export const initMinioClient = (): Client => {
  if (minioClient) {
    return minioClient;
  }

  minioClient = new Client({
    endPoint: config.minioEndpoint,
    port: config.minioPort,
    useSSL: config.minioUseSSL,
    accessKey: config.minioAccessKey,
    secretKey: config.minioSecretKey,
  });

  return minioClient;
};

/**
 * Gibt den MinIO Client zurueck
 */
export const getMinioClient = (): Client => {
  if (!minioClient) {
    throw new Error('MinIO Client nicht initialisiert. Rufe initMinioClient() zuerst auf.');
  }
  return minioClient;
};

/**
 * Stellt sicher dass der Bucket existiert
 */
export const ensureBucket = async (): Promise<void> => {
  const client = getMinioClient();
  const bucketExists = await client.bucketExists(config.minioBucket);

  if (!bucketExists) {
    await client.makeBucket(config.minioBucket);
    console.log(`[MinIO] Bucket '${config.minioBucket}' erstellt`);
  }
};

/**
 * Generiert den Storage-Pfad fuer ein Bild
 * Format: galleries/{galleryId}/images/{imageId}/{variant}.enc
 */
export const getImagePath = (galleryId: string, imageId: string, variant: string): string => {
  return `galleries/${galleryId}/images/${imageId}/${variant}.enc`;
};

/**
 * Laedt eine Datei in MinIO hoch
 */
export const uploadFile = async (
  path: string,
  data: Buffer,
  contentType: string = 'application/octet-stream'
): Promise<void> => {
  const client = getMinioClient();
  await client.putObject(config.minioBucket, path, data, data.length, {
    'Content-Type': contentType,
  });
};

/**
 * Laedt eine Datei aus MinIO herunter
 */
export const downloadFile = async (path: string): Promise<Buffer> => {
  const client = getMinioClient();
  const stream = await client.getObject(config.minioBucket, path);

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    stream.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    stream.on('end', () => {
      resolve(Buffer.concat(chunks));
    });

    stream.on('error', (err: Error) => {
      reject(err);
    });
  });
};

/**
 * Gibt einen Stream fuer eine Datei zurueck (fuer grosse Dateien)
 */
export const getFileStream = async (path: string): Promise<Readable> => {
  const client = getMinioClient();
  return client.getObject(config.minioBucket, path);
};

/**
 * Prueft ob eine Datei existiert
 */
export const fileExists = async (path: string): Promise<boolean> => {
  const client = getMinioClient();
  try {
    await client.statObject(config.minioBucket, path);
    return true;
  } catch {
    return false;
  }
};

/**
 * Loescht eine Datei
 */
export const deleteFile = async (path: string): Promise<void> => {
  const client = getMinioClient();
  await client.removeObject(config.minioBucket, path);
};

/**
 * Loescht mehrere Dateien (fuer Galerie/Bild-Loeschung)
 */
export const deleteFiles = async (paths: string[]): Promise<void> => {
  const client = getMinioClient();
  await client.removeObjects(config.minioBucket, paths);
};

/**
 * Loescht alle Dateien in einem Verzeichnis (Prefix)
 */
export const deleteDirectory = async (prefix: string): Promise<void> => {
  const client = getMinioClient();
  const objects: string[] = [];

  const stream = client.listObjects(config.minioBucket, prefix, true);

  await new Promise<void>((resolve, reject) => {
    stream.on('data', (obj) => {
      if (obj.name) {
        objects.push(obj.name);
      }
    });

    stream.on('end', () => {
      resolve();
    });

    stream.on('error', (err) => {
      reject(err);
    });
  });

  if (objects.length > 0) {
    await deleteFiles(objects);
  }
};

/**
 * Holt Datei-Metadaten (Groesse, etc.)
 */
export const getFileInfo = async (
  path: string
): Promise<{ size: number; lastModified: Date } | null> => {
  const client = getMinioClient();
  try {
    const stat = await client.statObject(config.minioBucket, path);
    return {
      size: stat.size,
      lastModified: stat.lastModified,
    };
  } catch {
    return null;
  }
};
