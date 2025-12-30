/**
 * Comment Types
 *
 * Kommentare auf Bilder.
 * Content ist verschluesselt mit Galerie-Key fuer konsistente E2E.
 * Unterstuetzt Antworten (parentId) fuer Thread-Struktur.
 */

import type { PublicUser } from './user';

// Kommentar (DB)
export interface Comment {
  id: string;
  imageId: string;
  galleryId: string; // Denormalisiert fuer einfachere Queries
  authorId: string;
  encryptedContent: string; // Verschluesselt mit Galerie-Key
  parentId: string | null; // Fuer Antworten
  createdAt: Date;
  updatedAt: Date;
}

// Kommentar fuer UI (mit entschluesseltem Content)
export interface CommentDisplay {
  id: string;
  imageId: string;
  author: PublicUser;
  content: string; // Entschluesselt
  parentId: string | null;
  replyCount: number;
  createdAt: Date;
  isOwn: boolean; // Ist der aktuelle User der Autor?
}

// Kommentar mit Antworten (Thread-Ansicht)
export interface CommentThread extends CommentDisplay {
  replies: CommentDisplay[];
}

// Kommentar-Konstanten
export const COMMENT_CONFIG = {
  MAX_LENGTH: 1000,
  MAX_REPLIES_DEPTH: 1, // Nur eine Ebene Antworten
} as const;
