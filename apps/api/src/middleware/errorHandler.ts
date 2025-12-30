/**
 * Error Handler Middleware
 *
 * Zentrale Fehlerbehandlung fuer die API.
 */

import type { ErrorHandler } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { ZodError } from 'zod';

import { config } from '../config';

// API Error Response Format
interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// Custom API Error
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Vordefinierte Errors
export const Errors = {
  // Auth
  UNAUTHORIZED: (message = 'Nicht autorisiert') => new ApiError(401, 'UNAUTHORIZED', message),
  FORBIDDEN: (message = 'Zugriff verweigert') => new ApiError(403, 'FORBIDDEN', message),
  INVALID_CREDENTIALS: () => new ApiError(401, 'INVALID_CREDENTIALS', 'Ungueltige Anmeldedaten'),
  TOKEN_EXPIRED: () => new ApiError(401, 'TOKEN_EXPIRED', 'Token abgelaufen'),

  // Validation
  VALIDATION_ERROR: (details: unknown) =>
    new ApiError(400, 'VALIDATION_ERROR', 'Validierungsfehler', details),

  // Resources
  NOT_FOUND: (resource: string) =>
    new ApiError(404, 'NOT_FOUND', `${resource} nicht gefunden`),
  ALREADY_EXISTS: (resource: string) =>
    new ApiError(409, 'ALREADY_EXISTS', `${resource} existiert bereits`),

  // Rate Limiting
  TOO_MANY_REQUESTS: () =>
    new ApiError(429, 'TOO_MANY_REQUESTS', 'Zu viele Anfragen, bitte warten'),

  // Server
  INTERNAL_ERROR: (message = 'Interner Serverfehler') =>
    new ApiError(500, 'INTERNAL_ERROR', message),
};

/**
 * Zentrale Error Handler Middleware
 */
export const errorHandler: ErrorHandler = (err, c) => {
  console.error('[Error]', err);

  // Zod Validation Error
  if (err instanceof ZodError) {
    const response: ApiErrorResponse = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validierungsfehler',
        details: err.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      },
    };
    return c.json(response, 400);
  }

  // Custom API Error
  if (err instanceof ApiError) {
    const response: ApiErrorResponse = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    };
    return c.json(response, err.statusCode as ContentfulStatusCode);
  }

  // Unbekannter Error
  const response: ApiErrorResponse = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: config.nodeEnv === 'production' ? 'Interner Serverfehler' : err.message,
      details: config.nodeEnv === 'production' ? undefined : err.stack,
    },
  };
  return c.json(response, 500);
};
