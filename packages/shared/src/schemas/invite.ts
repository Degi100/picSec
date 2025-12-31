/**
 * Invite Zod Schemas
 *
 * Validierung fuer Einladungs-bezogene API Inputs
 */

import { z } from 'zod';

import { GALLERY_INVITE_TYPES, GALLERY_ROLES, INVITE_CONFIG } from '../types';

// Galerie-Einladung erstellen
export const createGalleryInviteSchema = z.object({
  galleryId: z.string().min(1, 'Galerie-ID ist erforderlich'),
  role: z.enum([GALLERY_ROLES.PHOTOSHOTER, GALLERY_ROLES.VIEWER]),
  type: z.enum([GALLERY_INVITE_TYPES.MAGIC_LINK, GALLERY_INVITE_TYPES.CODE]),
  customCode: z
    .string()
    .min(4, 'Code muss mindestens 4 Zeichen haben')
    .max(20, 'Code darf maximal 20 Zeichen haben')
    .regex(/^[A-Z0-9]+$/, 'Code darf nur Grossbuchstaben und Zahlen enthalten')
    .optional(), // Nur bei type = code
  expiryHours: z
    .number()
    .min(1)
    .max(168) // Max 1 Woche
    .default(INVITE_CONFIG.GALLERY_INVITE_EXPIRY_HOURS),
});

export type CreateGalleryInviteInput = z.infer<typeof createGalleryInviteSchema>;

// Galerie-Einladung einloesen
export const redeemGalleryInviteSchema = z.object({
  token: z.string().min(1, 'Token ist erforderlich'),
  encryptedGalleryKey: z.string().min(1, 'Verschluesselter Galerie-Key ist erforderlich'),
});

export type RedeemGalleryInviteInput = z.infer<typeof redeemGalleryInviteSchema>;

// Galerie-Einladung via Code einloesen
export const redeemGalleryInviteByCodeSchema = z.object({
  code: z.string().min(1, 'Code ist erforderlich').toUpperCase(),
  encryptedGalleryKey: z.string().min(1, 'Verschluesselter Galerie-Key ist erforderlich'),
});

export type RedeemGalleryInviteByCodeInput = z.infer<typeof redeemGalleryInviteByCodeSchema>;

// Galerie-Einladung Preview abrufen
export const getGalleryInvitePreviewSchema = z.object({
  token: z.string().min(1),
});

export type GetGalleryInvitePreviewInput = z.infer<typeof getGalleryInvitePreviewSchema>;

// Globalen Invite-Code erstellen (Admin)
export const createGlobalInviteCodeSchema = z.object({
  code: z
    .string()
    .min(4, 'Code muss mindestens 4 Zeichen haben')
    .max(20, 'Code darf maximal 20 Zeichen haben')
    .regex(/^[A-Z0-9]+$/, 'Code darf nur Grossbuchstaben und Zahlen enthalten')
    .toUpperCase(),
  description: z.string().max(200).nullable().optional(),
  maxUses: z.number().min(1).nullable().optional(), // null = unlimited
  expiresInDays: z.number().min(1).max(365).nullable().optional(), // null = kein Ablauf
});

export type CreateGlobalInviteCodeInput = z.infer<typeof createGlobalInviteCodeSchema>;

// Globalen Invite-Code validieren (bei Registrierung)
export const validateGlobalInviteCodeSchema = z.object({
  code: z.string().min(1).toUpperCase(),
});

export type ValidateGlobalInviteCodeInput = z.infer<typeof validateGlobalInviteCodeSchema>;

// Globalen Invite-Code deaktivieren (Admin)
export const deactivateGlobalInviteCodeSchema = z.object({
  codeId: z.string().min(1),
});

export type DeactivateGlobalInviteCodeInput = z.infer<typeof deactivateGlobalInviteCodeSchema>;

// Galerie-Einladung per Email (direkt an registrierten User)
export const inviteByEmailSchema = z.object({
  email: z.string().email('Ungueltige E-Mail-Adresse').toLowerCase(),
  role: z.enum([GALLERY_ROLES.PHOTOSHOTER, GALLERY_ROLES.VIEWER]),
});

export type InviteByEmailInput = z.infer<typeof inviteByEmailSchema>;

// Pending Invite annehmen
export const acceptPendingInviteSchema = z.object({
  inviteId: z.string().min(1, 'Invite-ID ist erforderlich'),
  encryptedGalleryKey: z.string().min(1, 'Verschluesselter Galerie-Key ist erforderlich'),
});

export type AcceptPendingInviteInput = z.infer<typeof acceptPendingInviteSchema>;
