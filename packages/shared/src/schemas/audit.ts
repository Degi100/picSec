/**
 * Audit Log Zod Schemas
 *
 * Validierung fuer Audit-bezogene API Inputs
 */

import { z } from 'zod';

import { AUDIT_ACTIONS, AUDIT_TARGET_TYPES } from '../types';

// Erstelle Enums aus den Konstanten
const auditActionValues = Object.values(AUDIT_ACTIONS) as [string, ...string[]];
const auditTargetTypeValues = Object.values(AUDIT_TARGET_TYPES) as [string, ...string[]];

// Audit Log abrufen (Admin)
export const getAuditLogSchema = z.object({
  adminId: z.string().optional(), // Filter nach Admin
  action: z.enum(auditActionValues).optional(),
  targetType: z.enum(auditTargetTypeValues).optional(),
  targetId: z.string().optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  cursor: z.string().optional(),
  limit: z.number().min(1).max(100).default(50),
});

export type GetAuditLogInput = z.infer<typeof getAuditLogSchema>;

// Audit Log Entry erstellen (intern, nicht als API exposed)
export const createAuditLogSchema = z.object({
  adminId: z.string().min(1),
  action: z.enum(auditActionValues),
  targetType: z.enum(auditTargetTypeValues),
  targetId: z.string().nullable(),
  details: z.record(z.unknown()).default({}),
  ipAddress: z.string().nullable().optional(),
  userAgent: z.string().nullable().optional(),
});

export type CreateAuditLogInput = z.infer<typeof createAuditLogSchema>;
