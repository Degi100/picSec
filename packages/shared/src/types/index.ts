/**
 * Type Exports
 *
 * Alle Types und Konstanten aus einem Ort importierbar:
 * import { User, Gallery, GALLERY_ROLES } from '@picsec/shared';
 */

// Rollen
export {
  APP_ROLES,
  GALLERY_ROLES,
  GALLERY_ROLE_PERMISSIONS,
  hasPermission,
  type AppRole,
  type GalleryRole,
  type GalleryPermissions,
} from './roles';

// User
export {
  USER_STATUS,
  type UserStatus,
  type User,
  type PublicUser,
  type AuthUser,
  type UserWithStats,
} from './user';

// Gallery
export {
  type GalleryMember,
  type GalleryMemberWithUser,
  type Gallery,
  type GalleryListItem,
  type GalleryDetails,
  type GalleryAdminView,
} from './gallery';

// Image
export {
  IMAGE_VARIANTS,
  IMAGE_CONFIG,
  type ImageVariant,
  type ImageVariantInfo,
  type Image,
  type ImageGridItem,
  type ImageDetails,
  type ImageUploadResult,
} from './image';

// Comment
export {
  COMMENT_CONFIG,
  type Comment,
  type CommentDisplay,
  type CommentThread,
} from './comment';

// Report
export {
  REPORT_TARGET_TYPES,
  REPORT_REASONS,
  REPORT_STATUS,
  REPORT_RESOLUTIONS,
  REPORT_REASON_LABELS,
  REPORT_STATUS_LABELS,
  type ReportTargetType,
  type ReportReason,
  type ReportStatus,
  type ReportResolution,
  type Report,
  type ReportListItem,
  type ReportDetails,
} from './report';

// Invite
export {
  GALLERY_INVITE_TYPES,
  INVITE_CONFIG,
  type GalleryInviteType,
  type GalleryInvite,
  type GalleryInvitePreview,
  type GalleryInviteWithDetails,
  type GlobalInviteCode,
  type GlobalInviteCodeWithDetails,
} from './invite';

// Audit
export {
  AUDIT_ACTIONS,
  AUDIT_TARGET_TYPES,
  AUDIT_ACTION_LABELS,
  type AuditAction,
  type AuditTargetType,
  type AuditLogEntry,
  type AuditLogEntryWithAdmin,
} from './audit';
