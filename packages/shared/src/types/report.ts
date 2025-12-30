/**
 * Report Types
 *
 * Melde-System fuer problematische Inhalte.
 * Bei Report wird Galerie-Key einmalig fuer Admin freigegeben.
 */

import type { PublicUser } from './user';

// Was wird gemeldet?
export const REPORT_TARGET_TYPES = {
  IMAGE: 'image',
  COMMENT: 'comment',
  USER: 'user',
} as const;

export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[keyof typeof REPORT_TARGET_TYPES];

// Melde-Gruende
export const REPORT_REASONS = {
  INAPPROPRIATE_CONTENT: 'inappropriate_content',
  HARASSMENT: 'harassment',
  SPAM: 'spam',
  COPYRIGHT: 'copyright',
  OTHER: 'other',
} as const;

export type ReportReason = (typeof REPORT_REASONS)[keyof typeof REPORT_REASONS];

// Report Status
export const REPORT_STATUS = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  DISMISSED: 'dismissed',
} as const;

export type ReportStatus = (typeof REPORT_STATUS)[keyof typeof REPORT_STATUS];

// Report Resolution Actions
export const REPORT_RESOLUTIONS = {
  CONTENT_DELETED: 'content_deleted',
  USER_WARNED: 'user_warned',
  USER_SUSPENDED: 'user_suspended',
  NO_VIOLATION: 'no_violation',
  DUPLICATE: 'duplicate',
} as const;

export type ReportResolution = (typeof REPORT_RESOLUTIONS)[keyof typeof REPORT_RESOLUTIONS];

// Report (DB)
export interface Report {
  id: string;
  reporterId: string;
  targetType: ReportTargetType;
  targetId: string; // ID des gemeldeten Objekts
  galleryId: string; // Galerie-Kontext
  reason: ReportReason;
  reasonDetails: string | null;
  status: ReportStatus;
  adminEncryptedGalleryKey: string | null; // Key fuer Admin, verschluesselt mit Admin's Public Key
  resolution: ReportResolution | null;
  resolutionNotes: string | null;
  resolvedById: string | null;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
}

// Report fuer Admin-Liste
export interface ReportListItem {
  id: string;
  reporter: PublicUser;
  targetType: ReportTargetType;
  reason: ReportReason;
  status: ReportStatus;
  galleryName: string;
  createdAt: Date;
}

// Report-Details fuer Admin
export interface ReportDetails extends Report {
  reporter: PublicUser;
  targetUser: PublicUser | null; // Bei USER Report oder Uploader/Autor
  galleryName: string;
  resolvedBy: PublicUser | null;
}

// Melde-Grund Labels (fuer UI)
export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  inappropriate_content: 'Unangemessener Inhalt',
  harassment: 'Belaestigung',
  spam: 'Spam',
  copyright: 'Urheberrechtsverletzung',
  other: 'Sonstiges',
};

// Report Status Labels
export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  open: 'Offen',
  in_progress: 'In Bearbeitung',
  resolved: 'Erledigt',
  dismissed: 'Abgewiesen',
};
