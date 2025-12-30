/**
 * PicSec API Server
 *
 * Startet den Hono Server mit MongoDB Connection.
 */

// dotenv MUSS vor allen anderen Imports geladen werden!
import 'dotenv/config';

import { serve } from '@hono/node-server';

import { connectToDatabase, createIndexes } from '@picsec/db';

import { config, validateConfig } from './config';
import { createApp } from './app';
import { initMinioClient, ensureBucket } from './services/minio';

const main = async (): Promise<void> => {
  console.log('========================================');
  console.log(`  ${config.appName} v${config.apiVersion}`);
  console.log(`  Environment: ${config.nodeEnv}`);
  console.log('========================================');

  // Config validieren
  validateConfig();

  // Mit MongoDB verbinden
  await connectToDatabase({
    uri: config.mongoUri,
    dbName: config.mongoDbName,
  });

  // Indizes erstellen
  await createIndexes();

  // MinIO initialisieren
  initMinioClient();
  await ensureBucket();
  console.log('[MinIO] Verbunden');

  // App erstellen
  const app = createApp();

  // Server starten
  console.log(`[Server] Starte auf http://${config.host}:${config.port}`);

  serve({
    fetch: app.fetch,
    port: config.port,
    hostname: config.host,
  });

  console.log('[Server] Bereit fuer Anfragen');
};

// Error Handler fuer unhandled Promise Rejections
process.on('unhandledRejection', (reason) => {
  console.error('[Fatal] Unhandled Rejection:', reason);
  process.exit(1);
});

// Graceful Shutdown
process.on('SIGTERM', async () => {
  console.log('[Server] SIGTERM empfangen, fahre herunter...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[Server] SIGINT empfangen, fahre herunter...');
  process.exit(0);
});

// Start
main().catch((error) => {
  console.error('[Fatal] Startfehler:', error);
  process.exit(1);
});
