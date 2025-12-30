/**
 * Auth Middleware
 *
 * JWT-basierte Authentifizierung und Autorisierung.
 */

import type { Context, Next } from 'hono';
import * as jose from 'jose';

import { APP_ROLES, type AppRole } from '@picsec/shared';
import { collections, toObjectId } from '@picsec/db';

import { config } from '../config';
import { Errors } from './errorHandler';
import type { AppVariables } from '../app';

// JWT Payload
export interface JwtPayload {
  sub: string; // User ID
  role: AppRole;
  type: 'access' | 'refresh';
}

// Secret als Uint8Array fuer jose
const getJwtSecret = (): Uint8Array => {
  return new TextEncoder().encode(config.jwtSecret);
};

/**
 * Generiert ein Access Token
 */
export const generateAccessToken = async (userId: string, role: AppRole): Promise<string> => {
  return new jose.SignJWT({ role, type: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(config.jwtAccessExpiresIn)
    .sign(getJwtSecret());
};

/**
 * Generiert ein Refresh Token
 */
export const generateRefreshToken = async (userId: string, role: AppRole): Promise<string> => {
  return new jose.SignJWT({ role, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(config.jwtRefreshExpiresIn)
    .sign(getJwtSecret());
};

/**
 * Verifiziert ein JWT Token
 */
export const verifyToken = async (token: string): Promise<JwtPayload> => {
  try {
    const { payload } = await jose.jwtVerify(token, getJwtSecret());

    if (!payload.sub) {
      throw Errors.UNAUTHORIZED('Ungueltiges Token');
    }

    return {
      sub: payload.sub,
      role: (payload.role as AppRole) || APP_ROLES.USER,
      type: (payload.type as 'access' | 'refresh') || 'access',
    };
  } catch (error) {
    if (error instanceof jose.errors.JWTExpired) {
      throw Errors.TOKEN_EXPIRED();
    }
    throw Errors.UNAUTHORIZED('Ungueltiges Token');
  }
};

/**
 * Auth Middleware - Prueft ob User eingeloggt ist
 */
export const authMiddleware = async (
  c: Context<{ Variables: AppVariables }>,
  next: Next
): Promise<Response | void> => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw Errors.UNAUTHORIZED('Kein Token vorhanden');
  }

  const token = authHeader.slice(7);
  const payload = await verifyToken(token);

  if (payload.type !== 'access') {
    throw Errors.UNAUTHORIZED('Ungueltiger Token-Typ');
  }

  // User aus DB laden um Status zu pruefen
  const user = await collections.users().findOne({
    _id: toObjectId(payload.sub),
  });

  if (!user) {
    throw Errors.UNAUTHORIZED('User nicht gefunden');
  }

  if (user.status !== 'active') {
    throw Errors.FORBIDDEN('Account ist deaktiviert');
  }

  // User-Info in Context speichern
  c.set('userId', payload.sub);
  c.set('userRole', user.appRole);

  await next();
};

/**
 * Admin Middleware - Prueft ob User Admin ist
 */
export const adminMiddleware = async (
  c: Context<{ Variables: AppVariables }>,
  next: Next
): Promise<Response | void> => {
  // Erst Auth pruefen
  await authMiddleware(c, async () => {});

  const userRole = c.get('userRole');

  if (userRole !== APP_ROLES.ADMIN) {
    throw Errors.FORBIDDEN('Admin-Berechtigung erforderlich');
  }

  await next();
};

/**
 * Optional Auth Middleware - Laedt User wenn vorhanden, aber kein Fehler wenn nicht
 */
export const optionalAuthMiddleware = async (
  c: Context<{ Variables: AppVariables }>,
  next: Next
): Promise<Response | void> => {
  const authHeader = c.req.header('Authorization');

  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.slice(7);
      const payload = await verifyToken(token);

      if (payload.type === 'access') {
        c.set('userId', payload.sub);
        c.set('userRole', payload.role);
      }
    } catch {
      // Ignorieren - User ist einfach nicht eingeloggt
    }
  }

  await next();
};
