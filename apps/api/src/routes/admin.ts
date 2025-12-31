/**
 * Admin Routes
 *
 * Nur fuer Admins zugaenglich.
 * - Globale Invite Codes verwalten
 * - User verwalten
 * - Stats abrufen
 */

import { Hono } from 'hono';

import {
  createGlobalInviteCodeSchema,
  APP_ROLES,
  USER_STATUS,
} from '@picsec/shared';
import { collections, toId, toObjectId, ObjectId, isValidObjectId } from '@picsec/db';

import { adminMiddleware } from '../middleware/auth';
import { Errors } from '../middleware/errorHandler';
import type { AppVariables } from '../app';

export const adminRoutes = new Hono<{ Variables: AppVariables }>();

// Alle Admin Routes brauchen Admin-Berechtigung
adminRoutes.use('*', adminMiddleware);

// ============================================================================
// GLOBAL INVITE CODES
// ============================================================================

// POST /admin/invite-codes - Globalen Invite Code erstellen
adminRoutes.post('/invite-codes', async (c) => {
  const userId = c.get('userId')!;

  const body = await c.req.json();
  const data = createGlobalInviteCodeSchema.parse(body);

  // Pruefen ob Code schon existiert
  const existingCode = await collections.globalInviteCodes().findOne({
    code: data.code,
  });

  if (existingCode) {
    throw Errors.ALREADY_EXISTS('Invite Code');
  }

  // Ablaufdatum berechnen
  let expiresAt: Date | null = null;
  if (data.expiresInDays) {
    expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + data.expiresInDays);
  }

  const now = new Date();
  const codeId = new ObjectId();

  await collections.globalInviteCodes().insertOne({
    _id: codeId,
    code: data.code,
    createdById: userId,
    description: data.description ?? null,
    maxUses: data.maxUses ?? null,
    usedCount: 0,
    usedByIds: [],
    expiresAt,
    isActive: true,
    createdAt: now,
  });

  return c.json(
    {
      success: true,
      data: {
        inviteCode: {
          id: toId(codeId),
          code: data.code,
          description: data.description ?? null,
          maxUses: data.maxUses ?? null,
          usedCount: 0,
          expiresAt,
          isActive: true,
          createdAt: now,
        },
      },
    },
    201
  );
});

// GET /admin/invite-codes - Alle Invite Codes auflisten
adminRoutes.get('/invite-codes', async (c) => {
  const codes = await collections
    .globalInviteCodes()
    .find()
    .sort({ createdAt: -1 })
    .toArray();

  // Creator und usedBy User laden
  const creatorIds = [...new Set(codes.map((code) => code.createdById))];
  const usedByIds = [...new Set(codes.flatMap((code) => code.usedByIds))];
  const allUserIds = [...new Set([...creatorIds, ...usedByIds])];

  const users = await collections
    .users()
    .find({ _id: { $in: allUserIds.map(toObjectId) } })
    .toArray();

  const userMap = new Map(users.map((u) => [toId(u._id), u]));

  const codeList = codes.map((code) => {
    const creator = userMap.get(code.createdById);
    const usedByUsers = code.usedByIds
      .map((id) => userMap.get(id))
      .filter(Boolean)
      .map((u) => ({
        id: toId(u!._id),
        displayName: u!.displayName,
      }));

    return {
      id: toId(code._id),
      code: code.code,
      description: code.description,
      maxUses: code.maxUses,
      usedCount: code.usedCount,
      expiresAt: code.expiresAt,
      isActive: code.isActive,
      isExpired: code.expiresAt ? code.expiresAt < new Date() : false,
      isExhausted: code.maxUses ? code.usedCount >= code.maxUses : false,
      createdAt: code.createdAt,
      createdBy: creator
        ? {
            id: toId(creator._id),
            displayName: creator.displayName,
          }
        : null,
      usedBy: usedByUsers,
    };
  });

  return c.json({
    success: true,
    data: {
      inviteCodes: codeList,
    },
  });
});

// PATCH /admin/invite-codes/:id - Invite Code aktualisieren
adminRoutes.patch('/invite-codes/:id', async (c) => {
  const codeId = c.req.param('id');

  if (!isValidObjectId(codeId)) {
    throw Errors.NOT_FOUND('Invite Code');
  }

  const code = await collections.globalInviteCodes().findOne({
    _id: toObjectId(codeId),
  });

  if (!code) {
    throw Errors.NOT_FOUND('Invite Code');
  }

  const body = await c.req.json();
  const { isActive, description, maxUses } = body as {
    isActive?: boolean;
    description?: string | null;
    maxUses?: number | null;
  };

  const updateFields: Record<string, unknown> = {};

  if (isActive !== undefined) updateFields.isActive = isActive;
  if (description !== undefined) updateFields.description = description;
  if (maxUses !== undefined) updateFields.maxUses = maxUses;

  if (Object.keys(updateFields).length === 0) {
    throw Errors.VALIDATION_ERROR({ body: 'Keine Aenderungen angegeben' });
  }

  await collections.globalInviteCodes().updateOne(
    { _id: code._id },
    { $set: updateFields }
  );

  return c.json({
    success: true,
    data: {
      message: 'Invite Code aktualisiert',
    },
  });
});

// DELETE /admin/invite-codes/:id - Invite Code loeschen
adminRoutes.delete('/invite-codes/:id', async (c) => {
  const codeId = c.req.param('id');

  if (!isValidObjectId(codeId)) {
    throw Errors.NOT_FOUND('Invite Code');
  }

  const result = await collections.globalInviteCodes().deleteOne({
    _id: toObjectId(codeId),
  });

  if (result.deletedCount === 0) {
    throw Errors.NOT_FOUND('Invite Code');
  }

  return c.json({
    success: true,
    data: {
      message: 'Invite Code geloescht',
    },
  });
});

// ============================================================================
// USER MANAGEMENT
// ============================================================================

// GET /admin/users - Alle User auflisten
adminRoutes.get('/users', async (c) => {
  const cursor = c.req.query('cursor');
  const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 100);
  const search = c.req.query('search');
  const status = c.req.query('status');

  const query: Record<string, unknown> = {};

  if (search) {
    query.$or = [
      { email: { $regex: search, $options: 'i' } },
      { displayName: { $regex: search, $options: 'i' } },
    ];
  }

  if (status && Object.values(USER_STATUS).includes(status as typeof USER_STATUS[keyof typeof USER_STATUS])) {
    query.status = status;
  }

  if (cursor && isValidObjectId(cursor)) {
    query._id = { $lt: toObjectId(cursor) };
  }

  const users = await collections
    .users()
    .find(query)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .toArray();

  const hasMore = users.length > limit;
  if (hasMore) {
    users.pop();
  }

  const userList = users.map((user) => ({
    id: toId(user._id),
    email: user.email,
    displayName: user.displayName,
    appRole: user.appRole,
    status: user.status,
    createdAt: user.createdAt,
    lastActiveAt: user.lastActiveAt,
  }));

  const nextCursor = hasMore && users.length > 0 ? toId(users[users.length - 1]!._id) : null;

  return c.json({
    success: true,
    data: {
      users: userList,
      nextCursor,
      hasMore,
    },
  });
});

// GET /admin/users/:id - User Details
adminRoutes.get('/users/:id', async (c) => {
  const userId = c.req.param('id');

  if (!isValidObjectId(userId)) {
    throw Errors.NOT_FOUND('User');
  }

  const user = await collections.users().findOne({
    _id: toObjectId(userId),
  });

  if (!user) {
    throw Errors.NOT_FOUND('User');
  }

  // Galerie-Mitgliedschaften zaehlen
  const galleryCount = await collections.galleries().countDocuments({
    'members.userId': userId,
  });

  // Owned Galleries zaehlen
  const ownedGalleryCount = await collections.galleries().countDocuments({
    ownerId: userId,
  });

  // Upload Count
  const uploadCount = await collections.images().countDocuments({
    uploaderId: userId,
  });

  return c.json({
    success: true,
    data: {
      user: {
        id: toId(user._id),
        email: user.email,
        displayName: user.displayName,
        publicKey: user.publicKey,
        appRole: user.appRole,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastActiveAt: user.lastActiveAt,
        stats: {
          galleryCount,
          ownedGalleryCount,
          uploadCount,
        },
      },
    },
  });
});

// PATCH /admin/users/:id - User aktualisieren (Status, Rolle)
adminRoutes.patch('/users/:id', async (c) => {
  const adminUserId = c.get('userId')!;
  const targetUserId = c.req.param('id');

  if (!isValidObjectId(targetUserId)) {
    throw Errors.NOT_FOUND('User');
  }

  // Kann sich nicht selbst aendern
  if (adminUserId === targetUserId) {
    throw Errors.FORBIDDEN('Du kannst dich nicht selbst aendern');
  }

  const user = await collections.users().findOne({
    _id: toObjectId(targetUserId),
  });

  if (!user) {
    throw Errors.NOT_FOUND('User');
  }

  const body = await c.req.json();
  const { status, appRole } = body as {
    status?: typeof USER_STATUS[keyof typeof USER_STATUS];
    appRole?: typeof APP_ROLES[keyof typeof APP_ROLES];
  };

  const updateFields: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (status !== undefined) {
    if (!Object.values(USER_STATUS).includes(status)) {
      throw Errors.VALIDATION_ERROR({ status: 'Ungueltiger Status' });
    }
    updateFields.status = status;
  }

  if (appRole !== undefined) {
    if (!Object.values(APP_ROLES).includes(appRole)) {
      throw Errors.VALIDATION_ERROR({ appRole: 'Ungueltige Rolle' });
    }
    updateFields.appRole = appRole;
  }

  await collections.users().updateOne(
    { _id: user._id },
    { $set: updateFields }
  );

  return c.json({
    success: true,
    data: {
      message: 'User aktualisiert',
    },
  });
});

// ============================================================================
// STATS / DASHBOARD
// ============================================================================

// GET /admin/stats - Dashboard Stats
adminRoutes.get('/stats', async (c) => {
  const [
    totalUsers,
    activeUsers,
    totalGalleries,
    totalImages,
    totalComments,
    activeInviteCodes,
  ] = await Promise.all([
    collections.users().countDocuments(),
    collections.users().countDocuments({ status: USER_STATUS.ACTIVE }),
    collections.galleries().countDocuments(),
    collections.images().countDocuments(),
    collections.comments().countDocuments(),
    collections.globalInviteCodes().countDocuments({
      isActive: true,
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } },
      ],
    }),
  ]);

  // Letzte 7 Tage Registrierungen
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentRegistrations = await collections.users().countDocuments({
    createdAt: { $gte: sevenDaysAgo },
  });

  // Storage Stats (aus Images)
  const storageResult = await collections.images().aggregate([
    { $group: { _id: null, totalBytes: { $sum: '$totalSizeBytes' } } },
  ]).toArray();

  const totalStorageBytes = storageResult[0]?.totalBytes || 0;

  return c.json({
    success: true,
    data: {
      stats: {
        users: {
          total: totalUsers,
          active: activeUsers,
          recentRegistrations,
        },
        content: {
          galleries: totalGalleries,
          images: totalImages,
          comments: totalComments,
        },
        storage: {
          totalBytes: totalStorageBytes,
          totalMB: Math.round(totalStorageBytes / 1024 / 1024 * 100) / 100,
          totalGB: Math.round(totalStorageBytes / 1024 / 1024 / 1024 * 1000) / 1000,
        },
        inviteCodes: {
          active: activeInviteCodes,
        },
      },
    },
  });
});
