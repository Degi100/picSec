/**
 * @picsec/db
 *
 * MongoDB Database Layer fuer PicSec.
 *
 * Usage:
 * ```typescript
 * import { connectToDatabase, collections, createIndexes } from '@picsec/db';
 *
 * await connectToDatabase({ uri: 'mongodb://...', dbName: 'picsec' });
 * await createIndexes();
 *
 * const user = await collections.users().findOne({ email: 'test@example.com' });
 * ```
 */

// Client
export {
  connectToDatabase,
  getDb,
  closeDatabase,
  isConnected,
  type DbConfig,
} from './client';

// Collections
export {
  collections,
  toId,
  toObjectId,
  isValidObjectId,
  type UserDocument,
  type GalleryDocument,
  type ImageDocument,
  type CommentDocument,
  type ReportDocument,
  type GalleryInviteDocument,
  type GlobalInviteCodeDocument,
  type AuditLogDocument,
  type RefreshTokenDocument,
  type UserInsert,
  type RefreshTokenInsert,
} from './collections';

// Indexes
export { createIndexes } from './indexes';

// Re-export ObjectId fuer Convenience
export { ObjectId } from 'mongodb';
