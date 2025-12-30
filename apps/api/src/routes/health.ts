/**
 * Health Check Routes
 *
 * Fuer Monitoring und Load Balancer.
 */

import { Hono } from 'hono';

import { isConnected } from '@picsec/db';

import { config } from '../config';

export const healthRoutes = new Hono();

// Einfacher Health Check
healthRoutes.get('/', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// Detaillierter Health Check
healthRoutes.get('/detailed', (c) => {
  const dbConnected = isConnected();

  return c.json({
    status: dbConnected ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    version: config.apiVersion,
    environment: config.nodeEnv,
    services: {
      database: {
        status: dbConnected ? 'connected' : 'disconnected',
      },
    },
  });
});
