/**
 * Report Zod Schemas
 *
 * Validierung fuer Report-bezogene API Inputs
 */

import { z } from 'zod';

import { REPORT_REASONS, REPORT_RESOLUTIONS, REPORT_STATUS, REPORT_TARGET_TYPES } from '../types';

// Erstelle Report-Reason Enum aus den Konstanten
const reportReasonValues = Object.values(REPORT_REASONS) as [string, ...string[]];
const reportTargetTypeValues = Object.values(REPORT_TARGET_TYPES) as [string, ...string[]];
const reportStatusValues = Object.values(REPORT_STATUS) as [string, ...string[]];
const reportResolutionValues = Object.values(REPORT_RESOLUTIONS) as [string, ...string[]];

// Report erstellen
export const createReportSchema = z.object({
  targetType: z.enum(reportTargetTypeValues),
  targetId: z.string().min(1, 'Ziel-ID ist erforderlich'),
  galleryId: z.string().min(1, 'Galerie-ID ist erforderlich'),
  reason: z.enum(reportReasonValues),
  reasonDetails: z.string().max(1000).nullable().optional(),
  adminEncryptedGalleryKey: z.string().min(1, 'Verschluesselter Key fuer Admin ist erforderlich'),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;

// Report Status aktualisieren (Admin)
export const updateReportStatusSchema = z.object({
  reportId: z.string().min(1),
  status: z.enum(reportStatusValues),
});

export type UpdateReportStatusInput = z.infer<typeof updateReportStatusSchema>;

// Report abschliessen (Admin)
export const resolveReportSchema = z.object({
  reportId: z.string().min(1),
  resolution: z.enum(reportResolutionValues),
  resolutionNotes: z.string().max(1000).nullable().optional(),
});

export type ResolveReportInput = z.infer<typeof resolveReportSchema>;

// Reports abrufen (Admin)
export const getReportsSchema = z.object({
  status: z.enum(reportStatusValues).optional(),
  targetType: z.enum(reportTargetTypeValues).optional(),
  cursor: z.string().optional(),
  limit: z.number().min(1).max(50).default(20),
});

export type GetReportsInput = z.infer<typeof getReportsSchema>;
