/**
 * Invite Routes
 *
 * Galerie-Einladungen erstellen, verwalten und einloesen.
 * Zwei Typen: Magic Link (einmal-Token) oder Code (manuell eingeben).
 */

import { Hono } from 'hono';
import { randomBytes } from 'crypto';

import {
  createGalleryInviteSchema,
  redeemGalleryInviteSchema,
  redeemGalleryInviteByCodeSchema,
  inviteByEmailSchema,
  acceptPendingInviteSchema,
  GALLERY_INVITE_TYPES,
  INVITE_CONFIG,
} from '@picsec/shared';
import { collections, toId, toObjectId, ObjectId, isValidObjectId } from '@picsec/db';

import { authMiddleware } from '../middleware/auth';
import { Errors } from '../middleware/errorHandler';
import type { AppVariables } from '../app';

export const inviteRoutes = new Hono<{ Variables: AppVariables }>();

// ============================================================================
// Hilfsfunktionen
// ============================================================================

/**
 * Generiert einen sicheren Token fuer Magic Links
 */
const generateMagicLinkToken = (): string => {
  return randomBytes(INVITE_CONFIG.MAGIC_LINK_TOKEN_LENGTH).toString('hex');
};

/**
 * Generiert einen zufaelligen Einladungscode
 */
const generateRandomCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Ohne I,O,0,1 wegen Verwechslungsgefahr
  let code = '';
  for (let i = 0; i < INVITE_CONFIG.CODE_LENGTH; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// ============================================================================
// POST /galleries/:galleryId/invites - Einladung erstellen (Owner only)
// ============================================================================

inviteRoutes.post('/galleries/:galleryId/invites', authMiddleware, async (c) => {
  const userId = c.get('userId')!;
  const galleryId = c.req.param('galleryId');

  if (!isValidObjectId(galleryId)) {
    throw Errors.NOT_FOUND('Galerie');
  }

  const gallery = await collections.galleries().findOne({
    _id: toObjectId(galleryId),
  });

  if (!gallery) {
    throw Errors.NOT_FOUND('Galerie');
  }

  // Nur Owner darf Einladungen erstellen
  if (gallery.ownerId !== userId) {
    throw Errors.FORBIDDEN('Nur der Owner kann Einladungen erstellen');
  }

  const body = await c.req.json();
  const data = createGalleryInviteSchema.parse(body);

  // Token oder Code generieren
  let token: string;
  if (data.type === GALLERY_INVITE_TYPES.CODE) {
    // Wenn customCode angegeben, verwenden wir den
    token = data.customCode || generateRandomCode();

    // Pruefen ob Code schon existiert (fuer diese Galerie)
    const existingCode = await collections.galleryInvites().findOne({
      galleryId,
      token: token.toUpperCase(),
      type: GALLERY_INVITE_TYPES.CODE,
      usedById: null,
      expiresAt: { $gt: new Date() },
    });

    if (existingCode) {
      throw Errors.ALREADY_EXISTS('Einladungscode');
    }

    token = token.toUpperCase();
  } else {
    token = generateMagicLinkToken();
  }

  // Ablaufdatum berechnen
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + data.expiryHours);

  const now = new Date();
  const inviteId = new ObjectId();

  await collections.galleryInvites().insertOne({
    _id: inviteId,
    galleryId,
    inviterId: userId,
    role: data.role,
    type: data.type,
    token,
    targetUserId: null,
    targetEmail: null,
    usedById: null,
    expiresAt,
    createdAt: now,
    usedAt: null,
    status: 'pending',
  });

  return c.json(
    {
      success: true,
      data: {
        invite: {
          id: toId(inviteId),
          galleryId,
          role: data.role,
          type: data.type,
          token,
          expiresAt,
          createdAt: now,
        },
      },
    },
    201
  );
});

// ============================================================================
// GET /galleries/:galleryId/invites - Einladungen einer Galerie (Owner only)
// ============================================================================

inviteRoutes.get('/galleries/:galleryId/invites', authMiddleware, async (c) => {
  const userId = c.get('userId')!;
  const galleryId = c.req.param('galleryId');

  if (!isValidObjectId(galleryId)) {
    throw Errors.NOT_FOUND('Galerie');
  }

  const gallery = await collections.galleries().findOne({
    _id: toObjectId(galleryId),
  });

  if (!gallery) {
    throw Errors.NOT_FOUND('Galerie');
  }

  // Nur Owner darf Einladungen sehen
  if (gallery.ownerId !== userId) {
    throw Errors.FORBIDDEN('Nur der Owner kann Einladungen verwalten');
  }

  // Alle Einladungen der Galerie (aktive und benutzte)
  const invites = await collections
    .galleryInvites()
    .find({ galleryId })
    .sort({ createdAt: -1 })
    .toArray();

  // Benutzer-Details fuer usedBy laden
  const usedByIds = invites.filter((i) => i.usedById).map((i) => toObjectId(i.usedById!));
  const usedByUsers = usedByIds.length > 0
    ? await collections.users().find({ _id: { $in: usedByIds } }).toArray()
    : [];

  const usedByMap = new Map(usedByUsers.map((u) => [toId(u._id), u]));

  const inviteList = invites.map((invite) => {
    const usedByUser = invite.usedById ? usedByMap.get(invite.usedById) : null;
    return {
      id: toId(invite._id),
      role: invite.role,
      type: invite.type,
      token: invite.token,
      isExpired: invite.expiresAt < new Date(),
      isUsed: !!invite.usedById,
      expiresAt: invite.expiresAt,
      createdAt: invite.createdAt,
      usedAt: invite.usedAt,
      usedBy: usedByUser
        ? {
            id: toId(usedByUser._id),
            displayName: usedByUser.displayName,
          }
        : null,
    };
  });

  return c.json({
    success: true,
    data: {
      invites: inviteList,
    },
  });
});

// ============================================================================
// DELETE /invites/:id - Einladung loeschen/widerrufen (Owner only)
// ============================================================================

inviteRoutes.delete('/invites/:id', authMiddleware, async (c) => {
  const userId = c.get('userId')!;
  const inviteId = c.req.param('id');

  if (!isValidObjectId(inviteId)) {
    throw Errors.NOT_FOUND('Einladung');
  }

  const invite = await collections.galleryInvites().findOne({
    _id: toObjectId(inviteId),
  });

  if (!invite) {
    throw Errors.NOT_FOUND('Einladung');
  }

  // Galerie laden um Owner zu pruefen
  const gallery = await collections.galleries().findOne({
    _id: toObjectId(invite.galleryId),
  });

  if (!gallery || gallery.ownerId !== userId) {
    throw Errors.FORBIDDEN('Nur der Owner kann Einladungen loeschen');
  }

  await collections.galleryInvites().deleteOne({ _id: invite._id });

  return c.json({
    success: true,
    data: {
      message: 'Einladung geloescht',
    },
  });
});

// ============================================================================
// GET /invites/preview/:token - Einladungs-Preview (vor Annahme)
// ============================================================================

inviteRoutes.get('/invites/preview/:token', authMiddleware, async (c) => {
  const token = c.req.param('token');

  // Token kann Magic Link Token oder Code sein
  const invite = await collections.galleryInvites().findOne({
    token,
    usedById: null,
    expiresAt: { $gt: new Date() },
  });

  if (!invite) {
    throw Errors.NOT_FOUND('Einladung nicht gefunden oder abgelaufen');
  }

  // Galerie laden
  const gallery = await collections.galleries().findOne({
    _id: toObjectId(invite.galleryId),
  });

  if (!gallery) {
    throw Errors.NOT_FOUND('Galerie');
  }

  // Inviter laden
  const inviter = await collections.users().findOne({
    _id: toObjectId(invite.inviterId),
  });

  // Image Count
  const imageCount = await collections.images().countDocuments({
    galleryId: invite.galleryId,
  });

  return c.json({
    success: true,
    data: {
      preview: {
        galleryName: gallery.name,
        galleryDescription: gallery.description,
        imageCount,
        inviterName: inviter?.displayName || 'Unbekannt',
        role: invite.role,
        expiresAt: invite.expiresAt,
      },
    },
  });
});

// ============================================================================
// POST /invites/redeem - Einladung einloesen (Magic Link)
// ============================================================================

inviteRoutes.post('/invites/redeem', authMiddleware, async (c) => {
  const userId = c.get('userId')!;

  const body = await c.req.json();
  const data = redeemGalleryInviteSchema.parse(body);

  // Invite finden
  const invite = await collections.galleryInvites().findOne({
    token: data.token,
    type: GALLERY_INVITE_TYPES.MAGIC_LINK,
    usedById: null,
    expiresAt: { $gt: new Date() },
  });

  if (!invite) {
    throw Errors.NOT_FOUND('Einladung nicht gefunden, bereits verwendet oder abgelaufen');
  }

  // Galerie laden
  const gallery = await collections.galleries().findOne({
    _id: toObjectId(invite.galleryId),
  });

  if (!gallery) {
    throw Errors.NOT_FOUND('Galerie');
  }

  // Pruefen ob User schon Mitglied ist
  const existingMember = gallery.members.find((m) => m.userId === userId);

  if (existingMember) {
    throw Errors.ALREADY_EXISTS('Du bist bereits Mitglied dieser Galerie');
  }

  const now = new Date();

  // Invite als benutzt markieren
  await collections.galleryInvites().updateOne(
    { _id: invite._id },
    {
      $set: {
        usedById: userId,
        usedAt: now,
      },
    }
  );

  // User zur Galerie hinzufuegen
  await collections.galleries().updateOne(
    { _id: gallery._id },
    {
      $push: {
        members: {
          userId,
          role: invite.role,
          encryptedGalleryKey: data.encryptedGalleryKey,
          joinedAt: now,
        },
      },
      $set: { updatedAt: now },
    }
  );

  return c.json({
    success: true,
    data: {
      message: 'Einladung eingeloest',
      gallery: {
        id: toId(gallery._id),
        name: gallery.name,
        myRole: invite.role,
      },
    },
  });
});

// ============================================================================
// POST /invites/redeem-code - Einladung via Code einloesen
// ============================================================================

inviteRoutes.post('/invites/redeem-code', authMiddleware, async (c) => {
  const userId = c.get('userId')!;

  const body = await c.req.json();
  const data = redeemGalleryInviteByCodeSchema.parse(body);

  // Invite finden (Code ist case-insensitive dank .toUpperCase() im Schema)
  const invite = await collections.galleryInvites().findOne({
    token: data.code,
    type: GALLERY_INVITE_TYPES.CODE,
    status: 'pending',
    usedById: null,
    expiresAt: { $gt: new Date() },
  });

  if (!invite) {
    throw Errors.NOT_FOUND('Code ungueltig, bereits verwendet oder abgelaufen');
  }

  // Galerie laden
  const gallery = await collections.galleries().findOne({
    _id: toObjectId(invite.galleryId),
  });

  if (!gallery) {
    throw Errors.NOT_FOUND('Galerie');
  }

  // Pruefen ob User schon Mitglied ist
  const existingMember = gallery.members.find((m) => m.userId === userId);

  if (existingMember) {
    throw Errors.ALREADY_EXISTS('Du bist bereits Mitglied dieser Galerie');
  }

  const now = new Date();

  // Invite als benutzt markieren
  await collections.galleryInvites().updateOne(
    { _id: invite._id },
    {
      $set: {
        status: 'accepted',
        usedById: userId,
        usedAt: now,
      },
    }
  );

  // User zur Galerie hinzufuegen
  await collections.galleries().updateOne(
    { _id: gallery._id },
    {
      $push: {
        members: {
          userId,
          role: invite.role,
          encryptedGalleryKey: data.encryptedGalleryKey,
          joinedAt: now,
        },
      },
      $set: { updatedAt: now },
    }
  );

  return c.json({
    success: true,
    data: {
      message: 'Einladung eingeloest',
      gallery: {
        id: toId(gallery._id),
        name: gallery.name,
        myRole: invite.role,
      },
    },
  });
});

// ============================================================================
// POST /galleries/:galleryId/invite-by-email - User per Email einladen
// ============================================================================

inviteRoutes.post('/galleries/:galleryId/invite-by-email', authMiddleware, async (c) => {
  const userId = c.get('userId')!;
  const galleryId = c.req.param('galleryId');

  if (!isValidObjectId(galleryId)) {
    throw Errors.NOT_FOUND('Galerie');
  }

  const gallery = await collections.galleries().findOne({
    _id: toObjectId(galleryId),
  });

  if (!gallery) {
    throw Errors.NOT_FOUND('Galerie');
  }

  if (gallery.ownerId !== userId) {
    throw Errors.FORBIDDEN('Nur der Owner kann Einladungen erstellen');
  }

  const body = await c.req.json();
  const data = inviteByEmailSchema.parse(body);

  const targetUser = await collections.users().findOne({
    email: data.email,
  });

  if (!targetUser) {
    throw Errors.NOT_FOUND('Kein User mit dieser Email gefunden');
  }

  const targetUserId = toId(targetUser._id);

  if (targetUserId === userId) {
    throw Errors.VALIDATION_ERROR({ email: 'Du kannst dich nicht selbst einladen' });
  }

  const existingMember = gallery.members.find((m) => m.userId === targetUserId);
  if (existingMember) {
    throw Errors.ALREADY_EXISTS('User ist bereits Mitglied dieser Galerie');
  }

  const existingInvite = await collections.galleryInvites().findOne({
    galleryId,
    targetUserId,
    status: 'pending',
  });

  if (existingInvite) {
    throw Errors.ALREADY_EXISTS('User hat bereits eine offene Einladung');
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const now = new Date();
  const inviteId = new ObjectId();

  await collections.galleryInvites().insertOne({
    _id: inviteId,
    galleryId,
    inviterId: userId,
    role: data.role,
    type: GALLERY_INVITE_TYPES.DIRECT,
    token: '',
    targetUserId,
    targetEmail: data.email,
    usedById: null,
    expiresAt,
    createdAt: now,
    usedAt: null,
    status: 'pending',
  });

  return c.json(
    {
      success: true,
      data: {
        invite: {
          id: toId(inviteId),
          galleryId,
          targetUser: {
            id: targetUserId,
            displayName: targetUser.displayName,
            email: targetUser.email,
          },
          role: data.role,
          expiresAt,
          createdAt: now,
        },
      },
    },
    201
  );
});

// ============================================================================
// GET /invites/pending - Eigene offene Einladungen abrufen
// ============================================================================

inviteRoutes.get('/invites/pending', authMiddleware, async (c) => {
  const userId = c.get('userId')!;

  const invites = await collections
    .galleryInvites()
    .find({
      targetUserId: userId,
      status: 'pending',
      expiresAt: { $gt: new Date() },
    })
    .sort({ createdAt: -1 })
    .toArray();

  const galleryIds = [...new Set(invites.map((i) => toObjectId(i.galleryId)))];
  const inviterIds = [...new Set(invites.map((i) => toObjectId(i.inviterId)))];

  const [galleries, inviters] = await Promise.all([
    collections.galleries().find({ _id: { $in: galleryIds } }).toArray(),
    collections.users().find({ _id: { $in: inviterIds } }).toArray(),
  ]);

  const galleryMap = new Map(galleries.map((g) => [toId(g._id), g]));
  const inviterMap = new Map(inviters.map((u) => [toId(u._id), u]));

  const inviteList = invites.map((invite) => {
    const gallery = galleryMap.get(invite.galleryId);
    const inviter = inviterMap.get(invite.inviterId);

    return {
      id: toId(invite._id),
      gallery: gallery
        ? { id: toId(gallery._id), name: gallery.name, description: gallery.description }
        : null,
      inviter: inviter
        ? { id: toId(inviter._id), displayName: inviter.displayName }
        : null,
      role: invite.role,
      expiresAt: invite.expiresAt,
      createdAt: invite.createdAt,
    };
  });

  return c.json({
    success: true,
    data: { invites: inviteList },
  });
});

// ============================================================================
// POST /invites/:id/accept - Einladung annehmen
// ============================================================================

inviteRoutes.post('/invites/:id/accept', authMiddleware, async (c) => {
  const userId = c.get('userId')!;
  const inviteId = c.req.param('id');

  if (!isValidObjectId(inviteId)) {
    throw Errors.NOT_FOUND('Einladung');
  }

  const body = await c.req.json();
  const data = acceptPendingInviteSchema.parse({ inviteId, ...body });

  const invite = await collections.galleryInvites().findOne({
    _id: toObjectId(inviteId),
    targetUserId: userId,
    status: 'pending',
  });

  if (!invite) {
    throw Errors.NOT_FOUND('Einladung nicht gefunden oder nicht fuer dich');
  }

  if (invite.expiresAt < new Date()) {
    await collections.galleryInvites().updateOne(
      { _id: invite._id },
      { $set: { status: 'expired' } }
    );
    throw Errors.VALIDATION_ERROR({ invite: 'Einladung ist abgelaufen' });
  }

  const gallery = await collections.galleries().findOne({
    _id: toObjectId(invite.galleryId),
  });

  if (!gallery) {
    throw Errors.NOT_FOUND('Galerie');
  }

  const existingMember = gallery.members.find((m) => m.userId === userId);
  if (existingMember) {
    throw Errors.ALREADY_EXISTS('Du bist bereits Mitglied dieser Galerie');
  }

  const now = new Date();

  await collections.galleryInvites().updateOne(
    { _id: invite._id },
    { $set: { status: 'accepted', usedById: userId, usedAt: now } }
  );

  await collections.galleries().updateOne(
    { _id: gallery._id },
    {
      $push: {
        members: {
          userId,
          role: invite.role,
          encryptedGalleryKey: data.encryptedGalleryKey,
          joinedAt: now,
        },
      },
      $set: { updatedAt: now },
    }
  );

  return c.json({
    success: true,
    data: {
      message: 'Einladung angenommen',
      gallery: { id: toId(gallery._id), name: gallery.name, myRole: invite.role },
    },
  });
});

// ============================================================================
// POST /invites/:id/decline - Einladung ablehnen
// ============================================================================

inviteRoutes.post('/invites/:id/decline', authMiddleware, async (c) => {
  const userId = c.get('userId')!;
  const inviteId = c.req.param('id');

  if (!isValidObjectId(inviteId)) {
    throw Errors.NOT_FOUND('Einladung');
  }

  const invite = await collections.galleryInvites().findOne({
    _id: toObjectId(inviteId),
    targetUserId: userId,
    status: 'pending',
  });

  if (!invite) {
    throw Errors.NOT_FOUND('Einladung nicht gefunden oder nicht fuer dich');
  }

  await collections.galleryInvites().updateOne(
    { _id: invite._id },
    { $set: { status: 'declined' } }
  );

  return c.json({
    success: true,
    data: { message: 'Einladung abgelehnt' },
  });
});
