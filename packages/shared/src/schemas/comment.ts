/**
 * Comment Zod Schemas
 *
 * Validierung fuer Kommentar-bezogene API Inputs
 */

import { z } from 'zod';

import { COMMENT_CONFIG } from '../types';

// Kommentar erstellen
export const createCommentSchema = z.object({
  imageId: z.string().min(1, 'Bild-ID ist erforderlich'),
  encryptedContent: z.string().min(1, 'Inhalt ist erforderlich'),
  parentId: z.string().nullable().optional(),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;

// Kommentar aktualisieren
export const updateCommentSchema = z.object({
  commentId: z.string().min(1),
  encryptedContent: z.string().min(1, 'Inhalt ist erforderlich'),
});

export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;

// Kommentar loeschen
export const deleteCommentSchema = z.object({
  commentId: z.string().min(1),
});

export type DeleteCommentInput = z.infer<typeof deleteCommentSchema>;

// Kommentare fuer ein Bild abrufen
export const getCommentsSchema = z.object({
  imageId: z.string().min(1),
  cursor: z.string().optional(),
  limit: z.number().min(1).max(50).default(20),
});

export type GetCommentsInput = z.infer<typeof getCommentsSchema>;

// Validierung fuer Client-seitigen unverschluesselten Content
// (wird vor dem Verschluesseln geprueft)
export const commentContentSchema = z
  .string()
  .min(1, 'Kommentar darf nicht leer sein')
  .max(COMMENT_CONFIG.MAX_LENGTH, `Kommentar darf maximal ${COMMENT_CONFIG.MAX_LENGTH} Zeichen haben`);

export type CommentContentInput = z.infer<typeof commentContentSchema>;
