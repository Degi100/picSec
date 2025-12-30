/**
 * Audit Log Types
 *
 * Protokolliert alle Admin-Aktionen fuer Transparenz und Nachvollziehbarkeit.
 */

import type { PublicUser } from './user';

// Audit Aktionen
export const AUDIT_ACTIONS = {
  // User Management
  USER_SUSPENDED: 'user_suspended',
  USER_UNSUSPENDED: 'user_unsuspended',
  USER_DELETED: 'user_deleted',
  USER_ROLE_CHANGED: 'user_role_changed',

  // Report Management
  REPORT_VIEWED: 'report_viewed',
  REPORT_STATUS_CHANGED: 'report_status_changed',
  REPORT_RESOLVED: 'report_resolved',

  // Content Moderation
  IMAGE_DELETED: 'image_deleted',
  COMMENT_DELETED: 'comment_deleted',

  // Gallery Management
  GALLERY_DELETED: 'gallery_deleted',

  // Invite Codes
  INVITE_CODE_CREATED: 'invite_code_created',
  INVITE_CODE_DEACTIVATED: 'invite_code_deactivated',

  // System Settings
  SETTINGS_CHANGED: 'settings_changed',
  MAINTENANCE_MODE_ENABLED: 'maintenance_mode_enabled',
  MAINTENANCE_MODE_DISABLED: 'maintenance_mode_disabled',

  // Admin Session
  ADMIN_LOGIN: 'admin_login',
  ADMIN_LOGOUT: 'admin_logout',
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

// Audit Target Types
export const AUDIT_TARGET_TYPES = {
  USER: 'user',
  GALLERY: 'gallery',
  IMAGE: 'image',
  COMMENT: 'comment',
  REPORT: 'report',
  INVITE_CODE: 'invite_code',
  SETTINGS: 'settings',
  SYSTEM: 'system',
} as const;

export type AuditTargetType = (typeof AUDIT_TARGET_TYPES)[keyof typeof AUDIT_TARGET_TYPES];

// Audit Log Entry (DB)
export interface AuditLogEntry {
  id: string;
  adminId: string;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId: string | null;
  details: Record<string, unknown>; // Zusaetzliche Infos als JSON
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

// Audit Log Entry fuer UI
export interface AuditLogEntryWithAdmin extends AuditLogEntry {
  admin: PublicUser;
}

// Audit Action Labels (fuer UI)
export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  user_suspended: 'User gesperrt',
  user_unsuspended: 'User entsperrt',
  user_deleted: 'User geloescht',
  user_role_changed: 'User-Rolle geaendert',
  report_viewed: 'Report angesehen',
  report_status_changed: 'Report-Status geaendert',
  report_resolved: 'Report abgeschlossen',
  image_deleted: 'Bild geloescht',
  comment_deleted: 'Kommentar geloescht',
  gallery_deleted: 'Galerie geloescht',
  invite_code_created: 'Invite-Code erstellt',
  invite_code_deactivated: 'Invite-Code deaktiviert',
  settings_changed: 'Einstellungen geaendert',
  maintenance_mode_enabled: 'Wartungsmodus aktiviert',
  maintenance_mode_disabled: 'Wartungsmodus deaktiviert',
  admin_login: 'Admin Login',
  admin_logout: 'Admin Logout',
};
