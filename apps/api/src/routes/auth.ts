/**
 * Auth Routes
 *
 * Registrierung, Login, Token Refresh, Logout.
 */

import { Hono } from 'hono';

import {
  registerUserSchema,
  loginUserSchema,
  APP_ROLES,
  USER_STATUS,
} from '@picsec/shared';
import { collections, toId, toObjectId, ObjectId } from '@picsec/db';
import { validatePublicKey } from '@picsec/crypto';

import { hashPassword, verifyPassword } from '../lib/password';
import { generateAccessToken, generateRefreshToken, verifyToken } from '../middleware/auth';
import { Errors } from '../middleware/errorHandler';
import type { AppVariables } from '../app';

export const authRoutes = new Hono<{ Variables: AppVariables }>();

// ============================================================================
// POST /register - Registrierung
// ============================================================================

authRoutes.post('/register', async (c) => {
  const body = await c.req.json();
  const data = registerUserSchema.parse(body);

  // Public Key validieren
  if (!validatePublicKey(data.publicKey)) {
    throw Errors.VALIDATION_ERROR({ publicKey: 'Ungueltiger Public Key' });
  }

  // Pruefen ob Email schon existiert
  const existingUser = await collections.users().findOne({
    email: data.email,
  });

  if (existingUser) {
    throw Errors.ALREADY_EXISTS('Email');
  }

  // Passwort hashen
  const passwordHash = await hashPassword(data.password);

  // User erstellen
  const now = new Date();
  const userObjectId = new ObjectId();
  await collections.users().insertOne({
    _id: userObjectId,
    email: data.email,
    displayName: data.displayName,
    passwordHash,
    publicKey: data.publicKey,
    appRole: APP_ROLES.USER,
    status: USER_STATUS.ACTIVE,
    pushToken: null,
    createdAt: now,
    updatedAt: now,
    lastActiveAt: now,
  });

  const userId = toId(userObjectId);

  // Tokens generieren
  const accessToken = await generateAccessToken(userId, APP_ROLES.USER);
  const refreshToken = await generateRefreshToken(userId, APP_ROLES.USER);

  // Refresh Token speichern
  await collections.refreshTokens().insertOne({
    _id: new ObjectId(),
    userId: userObjectId,
    token: refreshToken,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 Tage
    createdAt: now,
    deviceInfo: c.req.header('User-Agent') || null,
  });

  return c.json(
    {
      success: true,
      data: {
        user: {
          id: userId,
          email: data.email,
          displayName: data.displayName,
          publicKey: data.publicKey,
          appRole: APP_ROLES.USER,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      },
    },
    201
  );
});

// ============================================================================
// POST /login - Login
// ============================================================================

authRoutes.post('/login', async (c) => {
  const body = await c.req.json();
  const data = loginUserSchema.parse(body);

  // User suchen
  const user = await collections.users().findOne({
    email: data.email,
  });

  if (!user) {
    throw Errors.INVALID_CREDENTIALS();
  }

  // Status pruefen
  if (user.status !== USER_STATUS.ACTIVE) {
    throw Errors.FORBIDDEN('Account ist deaktiviert');
  }

  // Passwort pruefen
  const isValid = await verifyPassword(data.password, user.passwordHash);

  if (!isValid) {
    throw Errors.INVALID_CREDENTIALS();
  }

  const userId = toId(user._id);

  // Last Active aktualisieren
  await collections.users().updateOne(
    { _id: user._id },
    { $set: { lastActiveAt: new Date() } }
  );

  // Tokens generieren
  const accessToken = await generateAccessToken(userId, user.appRole);
  const refreshToken = await generateRefreshToken(userId, user.appRole);

  // Refresh Token speichern
  await collections.refreshTokens().insertOne({
    _id: new ObjectId(),
    userId: user._id,
    token: refreshToken,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    deviceInfo: c.req.header('User-Agent') || null,
  });

  return c.json({
    success: true,
    data: {
      user: {
        id: userId,
        email: user.email,
        displayName: user.displayName,
        publicKey: user.publicKey,
        appRole: user.appRole,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    },
  });
});

// ============================================================================
// POST /refresh - Token erneuern
// ============================================================================

authRoutes.post('/refresh', async (c) => {
  const body = await c.req.json();
  const { refreshToken } = body as { refreshToken?: string };

  if (!refreshToken) {
    throw Errors.VALIDATION_ERROR({ refreshToken: 'Refresh Token erforderlich' });
  }

  // Token verifizieren
  const payload = await verifyToken(refreshToken);

  if (payload.type !== 'refresh') {
    throw Errors.UNAUTHORIZED('Ungueltiger Token-Typ');
  }

  // Token in DB pruefen
  const storedToken = await collections.refreshTokens().findOne({
    token: refreshToken,
  });

  if (!storedToken) {
    throw Errors.UNAUTHORIZED('Token nicht gefunden oder bereits verwendet');
  }

  // User laden
  const user = await collections.users().findOne({
    _id: storedToken.userId,
  });

  if (!user || user.status !== USER_STATUS.ACTIVE) {
    // Token loeschen
    await collections.refreshTokens().deleteOne({ _id: storedToken._id });
    throw Errors.UNAUTHORIZED('User nicht gefunden oder deaktiviert');
  }

  const userId = toId(user._id);

  // Altes Token loeschen
  await collections.refreshTokens().deleteOne({ _id: storedToken._id });

  // Neue Tokens generieren
  const newAccessToken = await generateAccessToken(userId, user.appRole);
  const newRefreshToken = await generateRefreshToken(userId, user.appRole);

  // Neues Refresh Token speichern
  await collections.refreshTokens().insertOne({
    _id: new ObjectId(),
    userId: user._id,
    token: newRefreshToken,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    deviceInfo: c.req.header('User-Agent') || null,
  });

  return c.json({
    success: true,
    data: {
      tokens: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    },
  });
});

// ============================================================================
// POST /logout - Logout
// ============================================================================

authRoutes.post('/logout', async (c) => {
  const body = await c.req.json();
  const { refreshToken } = body as { refreshToken?: string };

  if (refreshToken) {
    // Token loeschen wenn vorhanden
    await collections.refreshTokens().deleteOne({
      token: refreshToken,
    });
  }

  return c.json({
    success: true,
    data: {
      message: 'Erfolgreich ausgeloggt',
    },
  });
});

// ============================================================================
// POST /logout-all - Alle Sessions beenden
// ============================================================================

authRoutes.post('/logout-all', async (c) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw Errors.UNAUTHORIZED('Kein Token vorhanden');
  }

  const token = authHeader.slice(7);
  const payload = await verifyToken(token);

  // Alle Refresh Tokens des Users loeschen
  const result = await collections.refreshTokens().deleteMany({
    userId: toObjectId(payload.sub),
  });

  return c.json({
    success: true,
    data: {
      message: `${result.deletedCount} Session(s) beendet`,
    },
  });
});
