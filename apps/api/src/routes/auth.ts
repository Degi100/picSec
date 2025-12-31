/**
 * Auth Routes
 *
 * Registrierung, Login, Token Refresh, Logout.
 */

import { Hono } from 'hono';

import {
  registerUserSchema,
  loginUserSchema,
  googleLoginSchema,
  APP_ROLES,
  USER_STATUS,
} from '@picsec/shared';
import { collections, toId, toObjectId, ObjectId } from '@picsec/db';
import { validatePublicKey } from '@picsec/crypto';

import { hashPassword, verifyPassword } from '../lib/password';
import { generateAccessToken, generateRefreshToken, verifyToken } from '../middleware/auth';
import { Errors } from '../middleware/errorHandler';
import { config } from '../config';
import type { AppVariables } from '../app';
import type { GlobalInviteCodeDocument } from '@picsec/db';

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

  // Invite Code validieren (wenn erforderlich)
  let inviteCode: GlobalInviteCodeDocument | null = null;

  if (config.requireInviteCode) {
    if (!data.inviteCode) {
      throw Errors.VALIDATION_ERROR({ inviteCode: 'Einladungscode ist erforderlich' });
    }

    inviteCode = await collections.globalInviteCodes().findOne({
      code: data.inviteCode,
      isActive: true,
    });

    if (!inviteCode) {
      throw Errors.VALIDATION_ERROR({ inviteCode: 'Ungueltiger Einladungscode' });
    }

    // Pruefen ob abgelaufen
    if (inviteCode.expiresAt && inviteCode.expiresAt < new Date()) {
      throw Errors.VALIDATION_ERROR({ inviteCode: 'Einladungscode ist abgelaufen' });
    }

    // Pruefen ob max uses erreicht
    if (inviteCode.maxUses && inviteCode.usedCount >= inviteCode.maxUses) {
      throw Errors.VALIDATION_ERROR({ inviteCode: 'Einladungscode wurde bereits zu oft verwendet' });
    }
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

  // Invite Code als benutzt markieren
  if (inviteCode) {
    await collections.globalInviteCodes().updateOne(
      { _id: inviteCode._id },
      {
        $inc: { usedCount: 1 },
        $push: { usedByIds: userId },
      }
    );
  }

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
// POST /google - Google OAuth Login
// ============================================================================

authRoutes.post('/google', async (c) => {
  const body = await c.req.json();
  const data = googleLoginSchema.parse(body);

  // Public Key validieren
  if (!validatePublicKey(data.publicKey)) {
    throw Errors.VALIDATION_ERROR({ publicKey: 'Ungueltiger Public Key' });
  }

  // Google Access Token verifizieren via userinfo endpoint
  // (Supabase gibt uns einen Access Token, keinen ID Token)
  const googleResponse = await fetch(
    'https://www.googleapis.com/oauth2/v3/userinfo',
    {
      headers: {
        Authorization: `Bearer ${data.idToken}`,
      },
    }
  );

  if (!googleResponse.ok) {
    throw Errors.UNAUTHORIZED('Ungueltiger Google Token');
  }

  const googleData = (await googleResponse.json()) as {
    email: string;
    email_verified: boolean;
    name: string;
    picture?: string;
    sub: string; // Google User ID
  };

  // Email muss vorhanden und verifiziert sein
  if (!googleData.email || !googleData.email_verified) {
    throw Errors.FORBIDDEN('Google Email ist nicht verifiziert');
  }

  // User suchen oder erstellen
  let user = await collections.users().findOne({
    email: googleData.email,
  });

  const now = new Date();

  if (!user) {
    // Neuen User erstellen (ohne Passwort - nur Google Login)
    const userObjectId = new ObjectId();

    await collections.users().insertOne({
      _id: userObjectId,
      email: googleData.email,
      displayName: googleData.name || googleData.email.split('@')[0] || 'User',
      passwordHash: '', // Kein Passwort fuer Google-only Users
      publicKey: data.publicKey,
      appRole: APP_ROLES.USER,
      status: USER_STATUS.ACTIVE,
      pushToken: null,
      createdAt: now,
      updatedAt: now,
      lastActiveAt: now,
    });

    user = await collections.users().findOne({ _id: userObjectId });
  } else {
    // Existierenden User aktualisieren
    await collections.users().updateOne(
      { _id: user._id },
      {
        $set: {
          lastActiveAt: now,
          publicKey: data.publicKey, // Public Key aktualisieren
        },
      }
    );
  }

  if (!user) {
    throw Errors.INTERNAL_ERROR('User konnte nicht erstellt werden');
  }

  // Status pruefen
  if (user.status !== USER_STATUS.ACTIVE) {
    throw Errors.FORBIDDEN('Account ist deaktiviert');
  }

  const userId = toId(user._id);

  // Tokens generieren
  const accessToken = await generateAccessToken(userId, user.appRole);
  const refreshToken = await generateRefreshToken(userId, user.appRole);

  // Refresh Token speichern
  await collections.refreshTokens().insertOne({
    _id: new ObjectId(),
    userId: user._id,
    token: refreshToken,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdAt: now,
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

// ============================================================================
// POST /validate-invite-code - Invite Code pruefen (oeffentlich)
// ============================================================================

authRoutes.post('/validate-invite-code', async (c) => {
  const body = await c.req.json();
  const { code } = body as { code?: string };

  if (!code) {
    throw Errors.VALIDATION_ERROR({ code: 'Code ist erforderlich' });
  }

  const inviteCode = await collections.globalInviteCodes().findOne({
    code: code.toUpperCase(),
    isActive: true,
  });

  if (!inviteCode) {
    return c.json({
      success: true,
      data: {
        valid: false,
        reason: 'Code nicht gefunden',
      },
    });
  }

  // Pruefen ob abgelaufen
  if (inviteCode.expiresAt && inviteCode.expiresAt < new Date()) {
    return c.json({
      success: true,
      data: {
        valid: false,
        reason: 'Code ist abgelaufen',
      },
    });
  }

  // Pruefen ob max uses erreicht
  if (inviteCode.maxUses && inviteCode.usedCount >= inviteCode.maxUses) {
    return c.json({
      success: true,
      data: {
        valid: false,
        reason: 'Code wurde bereits zu oft verwendet',
      },
    });
  }

  return c.json({
    success: true,
    data: {
      valid: true,
      description: inviteCode.description,
    },
  });
});
