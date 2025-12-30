/**
 * Hono App Setup
 *
 * Konfiguriert die Hono App mit Middleware und Routes.
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { timing } from 'hono/timing';

import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import { authRoutes } from './routes/auth';
import { galleryRoutes } from './routes/galleries';
import { imageRoutes } from './routes/images';
import { healthRoutes } from './routes/health';

// App Type mit Variables fuer Auth Context
export interface AppVariables {
  userId?: string;
  userRole?: string;
}

export const createApp = (): Hono<{ Variables: AppVariables }> => {
  const app = new Hono<{ Variables: AppVariables }>();

  // ============================================================================
  // Global Middleware
  // ============================================================================

  // Logging
  if (config.nodeEnv !== 'test') {
    app.use('*', logger());
  }

  // Timing Header (X-Response-Time)
  app.use('*', timing());

  // Security Headers
  app.use('*', secureHeaders());

  // CORS
  app.use(
    '*',
    cors({
      origin: config.nodeEnv === 'production' ? ['https://picsec.de'] : '*',
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
      exposeHeaders: ['X-Response-Time'],
      maxAge: 86400,
      credentials: true,
    })
  );

  // Error Handler
  app.onError(errorHandler);

  // ============================================================================
  // Routes
  // ============================================================================

  // Health Check
  app.route('/health', healthRoutes);

  // API v1
  const v1 = new Hono<{ Variables: AppVariables }>();

  // Auth Routes (oeffentlich)
  v1.route('/auth', authRoutes);

  // Gallery Routes (geschuetzt)
  v1.route('/galleries', galleryRoutes);

  // Image Routes (geschuetzt) - mounten auf root weil /galleries/:id/images und /images/:id
  v1.route('/', imageRoutes);

  // Mount v1
  app.route('/api/v1', v1);

  // ============================================================================
  // 404 Handler
  // ============================================================================

  app.notFound((c) => {
    return c.json(
      {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Route ${c.req.method} ${c.req.path} nicht gefunden`,
        },
      },
      404
    );
  });

  return app;
};
