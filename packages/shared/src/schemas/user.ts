/**
 * User Zod Schemas
 *
 * Validierung fuer alle User-bezogenen API Inputs
 */

import { z } from 'zod';

import { APP_ROLES, USER_STATUS } from '../types';

// Basis-Validierungen
const emailSchema = z.string().email('Ungueltige E-Mail-Adresse').toLowerCase().trim();

const passwordSchema = z
  .string()
  .min(8, 'Passwort muss mindestens 8 Zeichen haben')
  .max(128, 'Passwort darf maximal 128 Zeichen haben')
  .regex(/[A-Z]/, 'Passwort muss mindestens einen Grossbuchstaben enthalten')
  .regex(/[a-z]/, 'Passwort muss mindestens einen Kleinbuchstaben enthalten')
  .regex(/[0-9]/, 'Passwort muss mindestens eine Zahl enthalten');

const displayNameSchema = z
  .string()
  .min(2, 'Name muss mindestens 2 Zeichen haben')
  .max(50, 'Name darf maximal 50 Zeichen haben')
  .trim();

const publicKeySchema = z
  .string()
  .min(1, 'Public Key ist erforderlich')
  .regex(/^[A-Za-z0-9+/=]+$/, 'Public Key muss Base64-encoded sein');

// Registrierung
export const registerUserSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: displayNameSchema,
  publicKey: publicKeySchema,
});

export type RegisterUserInput = z.infer<typeof registerUserSchema>;

// Login
export const loginUserSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Passwort ist erforderlich'),
});

export type LoginUserInput = z.infer<typeof loginUserSchema>;

// Profil aktualisieren
export const updateProfileSchema = z.object({
  displayName: displayNameSchema.optional(),
  pushToken: z.string().nullable().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// Passwort aendern
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Aktuelles Passwort ist erforderlich'),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwoerter stimmen nicht ueberein',
    path: ['confirmPassword'],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// Admin: User Status aendern
export const updateUserStatusSchema = z.object({
  status: z.enum([USER_STATUS.ACTIVE, USER_STATUS.SUSPENDED, USER_STATUS.DELETED]),
  reason: z.string().max(500).optional(),
});

export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;

// Admin: User Rolle aendern
export const updateUserRoleSchema = z.object({
  appRole: z.enum([APP_ROLES.USER, APP_ROLES.ADMIN]),
});

export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
