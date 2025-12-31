/**
 * Comment Routes
 *
 * CRUD fuer Kommentare auf Bilder.
 * Comments sind verschluesselt mit Galerie-Key.
 */

import { Hono } from 'hono';

import { createCommentSchema, updateCommentSchema } from '@picsec/shared';
import { collections, toId, toObjectId, ObjectId, isValidObjectId } from '@picsec/db';

import { authMiddleware } from '../middleware/auth';
import { Errors } from '../middleware/errorHandler';
import type { AppVariables } from '../app';

export const commentRoutes = new Hono<{ Variables: AppVariables }>();

// Alle Comment-Routes brauchen Auth
commentRoutes.use('*', authMiddleware);

// ============================================================================
// Hilfsfunktionen
// ============================================================================

/**
 * Prueft ob User Zugriff auf Galerie hat
 */
const checkGalleryAccess = async (galleryId: string, userId: string): Promise<void> => {
  if (!isValidObjectId(galleryId)) {
    throw Errors.NOT_FOUND('Galerie');
  }

  const gallery = await collections.galleries().findOne({
    _id: toObjectId(galleryId),
  });

  if (!gallery) {
    throw Errors.NOT_FOUND('Galerie');
  }

  const isMember = gallery.members.some((m) => m.userId === userId);

  if (!isMember && !gallery.isPublic) {
    throw Errors.FORBIDDEN('Kein Zugriff auf diese Galerie');
  }
};

// ============================================================================
// POST /images/:imageId/comments - Kommentar erstellen
// ============================================================================

commentRoutes.post('/images/:imageId/comments', async (c) => {
  const userId = c.get('userId')!;
  const imageId = c.req.param('imageId');

  if (!isValidObjectId(imageId)) {
    throw Errors.NOT_FOUND('Bild');
  }

  // Bild laden um galleryId zu bekommen
  const image = await collections.images().findOne({
    _id: toObjectId(imageId),
  });

  if (!image) {
    throw Errors.NOT_FOUND('Bild');
  }

  // Galerie-Zugriff pruefen
  await checkGalleryAccess(image.galleryId, userId);

  const body = await c.req.json();
  const data = createCommentSchema.parse({ ...body, imageId });

  // Wenn parentId angegeben, pruefen ob Parent existiert
  if (data.parentId) {
    if (!isValidObjectId(data.parentId)) {
      throw Errors.NOT_FOUND('Parent-Kommentar');
    }

    const parentComment = await collections.comments().findOne({
      _id: toObjectId(data.parentId),
      imageId,
    });

    if (!parentComment) {
      throw Errors.NOT_FOUND('Parent-Kommentar');
    }

    // Keine verschachtelten Antworten erlaubt
    if (parentComment.parentId) {
      throw Errors.VALIDATION_ERROR({
        parentId: 'Antworten auf Antworten sind nicht erlaubt',
      });
    }
  }

  const now = new Date();
  const commentId = new ObjectId();

  await collections.comments().insertOne({
    _id: commentId,
    imageId,
    galleryId: image.galleryId,
    authorId: userId,
    encryptedContent: data.encryptedContent,
    parentId: data.parentId || null,
    createdAt: now,
    updatedAt: now,
  });

  return c.json(
    {
      success: true,
      data: {
        comment: {
          id: toId(commentId),
          imageId,
          authorId: userId,
          parentId: data.parentId || null,
          createdAt: now,
        },
      },
    },
    201
  );
});

// ============================================================================
// GET /images/:imageId/comments - Kommentare eines Bildes
// ============================================================================

commentRoutes.get('/images/:imageId/comments', async (c) => {
  const userId = c.get('userId')!;
  const imageId = c.req.param('imageId');

  if (!isValidObjectId(imageId)) {
    throw Errors.NOT_FOUND('Bild');
  }

  // Bild laden
  const image = await collections.images().findOne({
    _id: toObjectId(imageId),
  });

  if (!image) {
    throw Errors.NOT_FOUND('Bild');
  }

  // Galerie-Zugriff pruefen
  await checkGalleryAccess(image.galleryId, userId);

  // Query Parameter
  const cursor = c.req.query('cursor');
  const limit = Math.min(parseInt(c.req.query('limit') || '20', 10), 50);
  const parentId = c.req.query('parentId'); // Optional: Nur Antworten auf einen Kommentar

  // Query bauen
  const query: Record<string, unknown> = {
    imageId,
  };

  // Filter nach parentId
  if (parentId === 'null' || parentId === undefined) {
    // Top-Level Kommentare
    query.parentId = null;
  } else if (parentId && isValidObjectId(parentId)) {
    // Antworten auf einen bestimmten Kommentar
    query.parentId = parentId;
  }

  if (cursor && isValidObjectId(cursor)) {
    query._id = { $lt: toObjectId(cursor) };
  }

  // Kommentare laden (neueste zuerst)
  const comments = await collections
    .comments()
    .find(query)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .toArray();

  const hasMore = comments.length > limit;
  if (hasMore) {
    comments.pop();
  }

  // Author-IDs sammeln
  const authorIds = [...new Set(comments.map((c) => c.authorId))];
  const authorObjectIds = authorIds.map((id) => toObjectId(id));

  // Authors laden
  const authors = await collections
    .users()
    .find({ _id: { $in: authorObjectIds } })
    .toArray();

  const authorsMap = new Map(authors.map((a) => [toId(a._id), a]));

  // Reply Counts fuer Top-Level Kommentare
  const commentIds = comments.filter((c) => !c.parentId).map((c) => toId(c._id));
  const replyCounts = await collections
    .comments()
    .aggregate([
      { $match: { parentId: { $in: commentIds } } },
      { $group: { _id: '$parentId', count: { $sum: 1 } } },
    ])
    .toArray();

  const replyCountMap = new Map(replyCounts.map((r) => [r._id, r.count]));

  // Response formatieren
  const commentList = comments.map((comment) => {
    const author = authorsMap.get(comment.authorId);
    return {
      id: toId(comment._id),
      imageId: comment.imageId,
      encryptedContent: comment.encryptedContent,
      parentId: comment.parentId,
      replyCount: replyCountMap.get(toId(comment._id)) || 0,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      isOwn: comment.authorId === userId,
      author: author
        ? {
            id: toId(author._id),
            displayName: author.displayName,
            publicKey: author.publicKey,
          }
        : null,
    };
  });

  const nextCursor = hasMore && comments.length > 0 ? toId(comments[comments.length - 1]!._id) : null;

  return c.json({
    success: true,
    data: {
      comments: commentList,
      nextCursor,
      hasMore,
    },
  });
});

// ============================================================================
// PATCH /comments/:id - Kommentar bearbeiten
// ============================================================================

commentRoutes.patch('/comments/:id', async (c) => {
  const userId = c.get('userId')!;
  const commentId = c.req.param('id');

  if (!isValidObjectId(commentId)) {
    throw Errors.NOT_FOUND('Kommentar');
  }

  const comment = await collections.comments().findOne({
    _id: toObjectId(commentId),
  });

  if (!comment) {
    throw Errors.NOT_FOUND('Kommentar');
  }

  // Nur Autor darf bearbeiten
  if (comment.authorId !== userId) {
    throw Errors.FORBIDDEN('Nur der Autor kann den Kommentar bearbeiten');
  }

  const body = await c.req.json();
  const data = updateCommentSchema.parse({ ...body, commentId });

  await collections.comments().updateOne(
    { _id: comment._id },
    {
      $set: {
        encryptedContent: data.encryptedContent,
        updatedAt: new Date(),
      },
    }
  );

  return c.json({
    success: true,
    data: {
      message: 'Kommentar aktualisiert',
    },
  });
});

// ============================================================================
// DELETE /comments/:id - Kommentar loeschen
// ============================================================================

commentRoutes.delete('/comments/:id', async (c) => {
  const userId = c.get('userId')!;
  const commentId = c.req.param('id');

  if (!isValidObjectId(commentId)) {
    throw Errors.NOT_FOUND('Kommentar');
  }

  const comment = await collections.comments().findOne({
    _id: toObjectId(commentId),
  });

  if (!comment) {
    throw Errors.NOT_FOUND('Kommentar');
  }

  // Galerie laden fuer Owner-Check
  const gallery = await collections.galleries().findOne({
    _id: toObjectId(comment.galleryId),
  });

  const isAuthor = comment.authorId === userId;
  const isGalleryOwner = gallery?.ownerId === userId;

  if (!isAuthor && !isGalleryOwner) {
    throw Errors.FORBIDDEN('Nur der Autor oder Galerie-Owner kann den Kommentar loeschen');
  }

  // Kommentar und alle Antworten loeschen
  await collections.comments().deleteMany({
    $or: [{ _id: comment._id }, { parentId: toId(comment._id) }],
  });

  return c.json({
    success: true,
    data: {
      message: 'Kommentar geloescht',
    },
  });
});
