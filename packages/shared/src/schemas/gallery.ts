/**
 * Gallery Zod Schemas
 *
 * Validierung fuer alle Galerie-bezogenen API Inputs
 */

import { z } from 'zod';

import { GALLERY_ROLES } from '../types';

// Galerie erstellen
export const createGallerySchema = z.object({
  name: z
    .string()
    .min(1, 'Name ist erforderlich')
    .max(100, 'Name darf maximal 100 Zeichen haben')
    .trim(),
  description: z.string().max(500, 'Beschreibung darf maximal 500 Zeichen haben').nullable().optional(),
  isPublic: z.boolean().default(false),
});

export type CreateGalleryInput = z.infer<typeof createGallerySchema>;

// Galerie aktualisieren
export const updateGallerySchema = z.object({
  name: z
    .string()
    .min(1, 'Name ist erforderlich')
    .max(100, 'Name darf maximal 100 Zeichen haben')
    .trim()
    .optional(),
  description: z
    .string()
    .max(500, 'Beschreibung darf maximal 500 Zeichen haben')
    .nullable()
    .optional(),
  isPublic: z.boolean().optional(),
  coverImageId: z.string().nullable().optional(),
});

export type UpdateGalleryInput = z.infer<typeof updateGallerySchema>;

// Mitglied zur Galerie hinzufuegen (intern, nach Invite-Accept)
export const addGalleryMemberSchema = z.object({
  userId: z.string().min(1),
  role: z.enum([GALLERY_ROLES.PHOTOSHOTER, GALLERY_ROLES.VIEWER]), // Owner wird nicht hinzugefuegt
  encryptedGalleryKey: z.string().min(1, 'Verschluesselter Key ist erforderlich'),
});

export type AddGalleryMemberInput = z.infer<typeof addGalleryMemberSchema>;

// Mitglieder-Rolle aendern
export const updateMemberRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum([GALLERY_ROLES.PHOTOSHOTER, GALLERY_ROLES.VIEWER]), // Kann nicht zu Owner machen
});

export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;

// Mitglied entfernen
export const removeMemberSchema = z.object({
  userId: z.string().min(1),
});

export type RemoveMemberInput = z.infer<typeof removeMemberSchema>;

// Key Rotation (nach Mitglieder-Entfernung)
export const keyRotationSchema = z.object({
  newEncryptedKeys: z.array(
    z.object({
      userId: z.string().min(1),
      encryptedGalleryKey: z.string().min(1),
    })
  ),
});

export type KeyRotationInput = z.infer<typeof keyRotationSchema>;

// Ownership uebertragen
export const transferOwnershipSchema = z.object({
  newOwnerId: z.string().min(1),
});

export type TransferOwnershipInput = z.infer<typeof transferOwnershipSchema>;
