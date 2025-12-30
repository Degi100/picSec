/**
 * Gallery Routes
 *
 * CRUD Operationen fuer Galerien und Mitgliederverwaltung.
 */

import { Hono } from 'hono';

import {
  createGallerySchema,
  updateGallerySchema,
  addGalleryMemberSchema,
  updateMemberRoleSchema,
  GALLERY_ROLES,
} from '@picsec/shared';
import { collections, toId, toObjectId, ObjectId, isValidObjectId } from '@picsec/db';

import { authMiddleware } from '../middleware/auth';
import { Errors } from '../middleware/errorHandler';
import type { AppVariables } from '../app';

export const galleryRoutes = new Hono<{ Variables: AppVariables }>();

// Alle Gallery-Routes brauchen Auth
galleryRoutes.use('*', authMiddleware);

// ============================================================================
// GET /galleries - Meine Galerien auflisten
// ============================================================================

galleryRoutes.get('/', async (c) => {
  const userId = c.get('userId')!;

  // Galerien wo ich Mitglied bin
  const galleries = await collections
    .galleries()
    .find({
      'members.userId': userId,
    })
    .toArray();

  // Fuer jede Galerie: Image Count holen
  const galleriesWithCounts = await Promise.all(
    galleries.map(async (gallery) => {
      const imageCount = await collections.images().countDocuments({
        galleryId: gallery._id.toHexString(),
      });

      const myMember = gallery.members.find((m) => m.userId === userId);

      return {
        id: toId(gallery._id),
        name: gallery.name,
        description: gallery.description,
        isPublic: gallery.isPublic,
        coverImageId: gallery.coverImageId,
        memberCount: gallery.members.length,
        imageCount,
        myRole: myMember?.role || GALLERY_ROLES.VIEWER,
        ownerId: gallery.ownerId,
        lastUploadAt: gallery.lastUploadAt,
        createdAt: gallery.createdAt,
      };
    })
  );

  return c.json({
    success: true,
    data: {
      galleries: galleriesWithCounts,
    },
  });
});

// ============================================================================
// POST /galleries - Galerie erstellen
// ============================================================================

galleryRoutes.post('/', async (c) => {
  const userId = c.get('userId')!;
  const body = await c.req.json();
  const data = createGallerySchema.parse(body);

  // encryptedGalleryKey muss mitgeschickt werden (Client generiert den Key)
  const { encryptedGalleryKey } = body as { encryptedGalleryKey?: string };

  if (!encryptedGalleryKey) {
    throw Errors.VALIDATION_ERROR({
      encryptedGalleryKey: 'Verschluesselter Galerie-Key ist erforderlich',
    });
  }

  const now = new Date();
  const galleryId = new ObjectId();

  await collections.galleries().insertOne({
    _id: galleryId,
    name: data.name,
    description: data.description ?? null,
    ownerId: userId,
    isPublic: data.isPublic,
    coverImageId: null,
    members: [
      {
        userId,
        role: GALLERY_ROLES.OWNER,
        encryptedGalleryKey,
        joinedAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
    lastUploadAt: null,
  });

  return c.json(
    {
      success: true,
      data: {
        gallery: {
          id: toId(galleryId),
          name: data.name,
          description: data.description ?? null,
          isPublic: data.isPublic,
          ownerId: userId,
          myRole: GALLERY_ROLES.OWNER,
          memberCount: 1,
          imageCount: 0,
          createdAt: now,
        },
      },
    },
    201
  );
});

// ============================================================================
// GET /galleries/:id - Galerie Details
// ============================================================================

galleryRoutes.get('/:id', async (c) => {
  const userId = c.get('userId')!;
  const galleryId = c.req.param('id');

  if (!isValidObjectId(galleryId)) {
    throw Errors.NOT_FOUND('Galerie');
  }

  const gallery = await collections.galleries().findOne({
    _id: toObjectId(galleryId),
  });

  if (!gallery) {
    throw Errors.NOT_FOUND('Galerie');
  }

  // Bin ich Mitglied?
  const myMember = gallery.members.find((m) => m.userId === userId);

  if (!myMember && !gallery.isPublic) {
    throw Errors.FORBIDDEN('Kein Zugriff auf diese Galerie');
  }

  // Member mit User-Details laden
  const memberUserIds = gallery.members.map((m) => toObjectId(m.userId));
  const memberUsers = await collections
    .users()
    .find({ _id: { $in: memberUserIds } })
    .toArray();

  const membersWithUsers = gallery.members.map((member) => {
    const user = memberUsers.find((u) => toId(u._id) === member.userId);
    return {
      userId: member.userId,
      role: member.role,
      joinedAt: member.joinedAt,
      user: user
        ? {
            id: toId(user._id),
            displayName: user.displayName,
            publicKey: user.publicKey,
          }
        : null,
    };
  });

  // Image Count
  const imageCount = await collections.images().countDocuments({
    galleryId,
  });

  return c.json({
    success: true,
    data: {
      gallery: {
        id: toId(gallery._id),
        name: gallery.name,
        description: gallery.description,
        isPublic: gallery.isPublic,
        coverImageId: gallery.coverImageId,
        ownerId: gallery.ownerId,
        members: membersWithUsers,
        imageCount,
        myRole: myMember?.role || null,
        encryptedGalleryKey: myMember?.encryptedGalleryKey || null,
        createdAt: gallery.createdAt,
        updatedAt: gallery.updatedAt,
        lastUploadAt: gallery.lastUploadAt,
      },
    },
  });
});

// ============================================================================
// PATCH /galleries/:id - Galerie bearbeiten
// ============================================================================

galleryRoutes.patch('/:id', async (c) => {
  const userId = c.get('userId')!;
  const galleryId = c.req.param('id');

  if (!isValidObjectId(galleryId)) {
    throw Errors.NOT_FOUND('Galerie');
  }

  const gallery = await collections.galleries().findOne({
    _id: toObjectId(galleryId),
  });

  if (!gallery) {
    throw Errors.NOT_FOUND('Galerie');
  }

  // Nur Owner darf bearbeiten
  if (gallery.ownerId !== userId) {
    throw Errors.FORBIDDEN('Nur der Owner kann die Galerie bearbeiten');
  }

  const body = await c.req.json();
  const data = updateGallerySchema.parse(body);

  // Update bauen
  const updateFields: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (data.name !== undefined) updateFields.name = data.name;
  if (data.description !== undefined) updateFields.description = data.description;
  if (data.isPublic !== undefined) updateFields.isPublic = data.isPublic;
  if (data.coverImageId !== undefined) updateFields.coverImageId = data.coverImageId;

  await collections.galleries().updateOne(
    { _id: gallery._id },
    { $set: updateFields }
  );

  return c.json({
    success: true,
    data: {
      message: 'Galerie aktualisiert',
    },
  });
});

// ============================================================================
// DELETE /galleries/:id - Galerie loeschen
// ============================================================================

galleryRoutes.delete('/:id', async (c) => {
  const userId = c.get('userId')!;
  const galleryId = c.req.param('id');

  if (!isValidObjectId(galleryId)) {
    throw Errors.NOT_FOUND('Galerie');
  }

  const gallery = await collections.galleries().findOne({
    _id: toObjectId(galleryId),
  });

  if (!gallery) {
    throw Errors.NOT_FOUND('Galerie');
  }

  // Nur Owner darf loeschen
  if (gallery.ownerId !== userId) {
    throw Errors.FORBIDDEN('Nur der Owner kann die Galerie loeschen');
  }

  // Galerie und zugehoerige Daten loeschen
  await Promise.all([
    collections.galleries().deleteOne({ _id: gallery._id }),
    collections.images().deleteMany({ galleryId }),
    collections.comments().deleteMany({ galleryId }),
  ]);

  // TODO: Bilder aus MinIO loeschen

  return c.json({
    success: true,
    data: {
      message: 'Galerie geloescht',
    },
  });
});

// ============================================================================
// POST /galleries/:id/members - Mitglied hinzufuegen
// ============================================================================

galleryRoutes.post('/:id/members', async (c) => {
  const userId = c.get('userId')!;
  const galleryId = c.req.param('id');

  if (!isValidObjectId(galleryId)) {
    throw Errors.NOT_FOUND('Galerie');
  }

  const gallery = await collections.galleries().findOne({
    _id: toObjectId(galleryId),
  });

  if (!gallery) {
    throw Errors.NOT_FOUND('Galerie');
  }

  // Nur Owner darf Mitglieder hinzufuegen
  if (gallery.ownerId !== userId) {
    throw Errors.FORBIDDEN('Nur der Owner kann Mitglieder hinzufuegen');
  }

  const body = await c.req.json();
  const data = addGalleryMemberSchema.parse(body);

  // Pruefen ob User existiert
  if (!isValidObjectId(data.userId)) {
    throw Errors.NOT_FOUND('User');
  }

  const targetUser = await collections.users().findOne({
    _id: toObjectId(data.userId),
  });

  if (!targetUser) {
    throw Errors.NOT_FOUND('User');
  }

  // Pruefen ob schon Mitglied
  const existingMember = gallery.members.find((m) => m.userId === data.userId);

  if (existingMember) {
    throw Errors.ALREADY_EXISTS('Mitglied');
  }

  // Mitglied hinzufuegen
  await collections.galleries().updateOne(
    { _id: gallery._id },
    {
      $push: {
        members: {
          userId: data.userId,
          role: data.role,
          encryptedGalleryKey: data.encryptedGalleryKey,
          joinedAt: new Date(),
        },
      },
      $set: { updatedAt: new Date() },
    }
  );

  return c.json(
    {
      success: true,
      data: {
        message: 'Mitglied hinzugefuegt',
        member: {
          userId: data.userId,
          displayName: targetUser.displayName,
          role: data.role,
        },
      },
    },
    201
  );
});

// ============================================================================
// DELETE /galleries/:id/members/:memberId - Mitglied entfernen
// ============================================================================

galleryRoutes.delete('/:id/members/:memberId', async (c) => {
  const userId = c.get('userId')!;
  const galleryId = c.req.param('id');
  const memberId = c.req.param('memberId');

  if (!isValidObjectId(galleryId)) {
    throw Errors.NOT_FOUND('Galerie');
  }

  const gallery = await collections.galleries().findOne({
    _id: toObjectId(galleryId),
  });

  if (!gallery) {
    throw Errors.NOT_FOUND('Galerie');
  }

  // Owner kann jeden entfernen, User kann sich selbst entfernen
  const isOwner = gallery.ownerId === userId;
  const isSelf = memberId === userId;

  if (!isOwner && !isSelf) {
    throw Errors.FORBIDDEN('Keine Berechtigung');
  }

  // Owner kann nicht entfernt werden
  if (memberId === gallery.ownerId) {
    throw Errors.FORBIDDEN('Owner kann nicht entfernt werden');
  }

  // Pruefen ob Mitglied existiert
  const member = gallery.members.find((m) => m.userId === memberId);

  if (!member) {
    throw Errors.NOT_FOUND('Mitglied');
  }

  // Mitglied entfernen
  await collections.galleries().updateOne(
    { _id: gallery._id },
    {
      $pull: { members: { userId: memberId } },
      $set: { updatedAt: new Date() },
    }
  );

  // TODO: Key Rotation nach Entfernung triggern

  return c.json({
    success: true,
    data: {
      message: 'Mitglied entfernt',
      requiresKeyRotation: true,
    },
  });
});

// ============================================================================
// PATCH /galleries/:id/members/:memberId - Mitglieder-Rolle aendern
// ============================================================================

galleryRoutes.patch('/:id/members/:memberId', async (c) => {
  const userId = c.get('userId')!;
  const galleryId = c.req.param('id');
  const memberId = c.req.param('memberId');

  if (!isValidObjectId(galleryId)) {
    throw Errors.NOT_FOUND('Galerie');
  }

  const gallery = await collections.galleries().findOne({
    _id: toObjectId(galleryId),
  });

  if (!gallery) {
    throw Errors.NOT_FOUND('Galerie');
  }

  // Nur Owner darf Rollen aendern
  if (gallery.ownerId !== userId) {
    throw Errors.FORBIDDEN('Nur der Owner kann Rollen aendern');
  }

  // Kann nicht eigene Rolle oder Owner-Rolle aendern
  if (memberId === gallery.ownerId) {
    throw Errors.FORBIDDEN('Owner-Rolle kann nicht geaendert werden');
  }

  const body = await c.req.json();
  const data = updateMemberRoleSchema.parse(body);

  // Pruefen ob Mitglied existiert
  const member = gallery.members.find((m) => m.userId === memberId);

  if (!member) {
    throw Errors.NOT_FOUND('Mitglied');
  }

  // Rolle aktualisieren
  await collections.galleries().updateOne(
    { _id: gallery._id, 'members.userId': memberId },
    {
      $set: {
        'members.$.role': data.role,
        updatedAt: new Date(),
      },
    }
  );

  return c.json({
    success: true,
    data: {
      message: 'Rolle aktualisiert',
    },
  });
});
