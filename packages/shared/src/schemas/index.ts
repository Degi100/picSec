/**
 * Schema Exports
 *
 * Alle Zod Schemas aus einem Ort importierbar:
 * import { registerUserSchema, createGallerySchema } from '@picsec/shared';
 */

// User Schemas
export {
  registerUserSchema,
  loginUserSchema,
  googleLoginSchema,
  updateProfileSchema,
  changePasswordSchema,
  updateUserStatusSchema,
  updateUserRoleSchema,
  type RegisterUserInput,
  type LoginUserInput,
  type GoogleLoginInput,
  type UpdateProfileInput,
  type ChangePasswordInput,
  type UpdateUserStatusInput,
  type UpdateUserRoleInput,
} from './user';

// Gallery Schemas
export {
  createGallerySchema,
  updateGallerySchema,
  addGalleryMemberSchema,
  updateMemberRoleSchema,
  removeMemberSchema,
  keyRotationSchema,
  transferOwnershipSchema,
  type CreateGalleryInput,
  type UpdateGalleryInput,
  type AddGalleryMemberInput,
  type UpdateMemberRoleInput,
  type RemoveMemberInput,
  type KeyRotationInput,
  type TransferOwnershipInput,
} from './gallery';

// Image Schemas
export {
  imageUploadMetaSchema,
  deleteImageSchema,
  deleteImagesSchema,
  requestDownloadSchema,
  getGalleryImagesSchema,
  type ImageUploadMetaInput,
  type DeleteImageInput,
  type DeleteImagesInput,
  type RequestDownloadInput,
  type GetGalleryImagesInput,
} from './image';

// Comment Schemas
export {
  createCommentSchema,
  updateCommentSchema,
  deleteCommentSchema,
  getCommentsSchema,
  commentContentSchema,
  type CreateCommentInput,
  type UpdateCommentInput,
  type DeleteCommentInput,
  type GetCommentsInput,
  type CommentContentInput,
} from './comment';

// Report Schemas
export {
  createReportSchema,
  updateReportStatusSchema,
  resolveReportSchema,
  getReportsSchema,
  type CreateReportInput,
  type UpdateReportStatusInput,
  type ResolveReportInput,
  type GetReportsInput,
} from './report';

// Invite Schemas
export {
  createGalleryInviteSchema,
  redeemGalleryInviteSchema,
  redeemGalleryInviteByCodeSchema,
  getGalleryInvitePreviewSchema,
  createGlobalInviteCodeSchema,
  validateGlobalInviteCodeSchema,
  deactivateGlobalInviteCodeSchema,
  inviteByEmailSchema,
  acceptPendingInviteSchema,
  type CreateGalleryInviteInput,
  type RedeemGalleryInviteInput,
  type RedeemGalleryInviteByCodeInput,
  type GetGalleryInvitePreviewInput,
  type CreateGlobalInviteCodeInput,
  type ValidateGlobalInviteCodeInput,
  type DeactivateGlobalInviteCodeInput,
  type InviteByEmailInput,
  type AcceptPendingInviteInput,
} from './invite';

// Audit Schemas
export {
  getAuditLogSchema,
  createAuditLogSchema,
  type GetAuditLogInput,
  type CreateAuditLogInput,
} from './audit';
