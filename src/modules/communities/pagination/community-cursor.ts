/**
 * Opaque cursor encoding for community cursor pagination.
 *
 * Posts are ordered by [isPinned desc, createdAt desc, id desc] so the
 * cursor must capture all three fields. Other lists (comments, subscriptions,
 * moderation actions) are ordered by [createdAt, id] and use a 2-tuple.
 *
 * The cursor is a base64url-encoded pipe-separated string. We do NOT sign it
 * because the cursor is used only as a "where do I start" pointer and the
 * server re-applies the filter on every read; tampering can at worst cause
 * the next page to be empty or skip a row, which the client can recover from
 * by re-querying without a cursor.
 */

export interface PostCursor {
  isPinned: boolean;
  createdAt: Date;
  id: string;
}

export interface TwoFieldCursor {
  createdAt: Date;
  id: string;
}

export function encodePostCursor(cursor: PostCursor): string {
  return Buffer.from(
    `${cursor.isPinned ? 1 : 0}|${cursor.createdAt.toISOString()}|${cursor.id}`,
    'utf8',
  ).toString('base64url');
}

export function decodePostCursor(value: string): PostCursor {
  const decoded = Buffer.from(value, 'base64url').toString('utf8');
  const [pinned, createdAt, id] = decoded.split('|');

  if (!pinned || !createdAt || !id) {
    throw new Error('Invalid post cursor.');
  }

  return {
    isPinned: pinned === '1',
    createdAt: new Date(createdAt),
    id,
  };
}

export function encodeTwoFieldCursor(cursor: TwoFieldCursor): string {
  return Buffer.from(
    `${cursor.createdAt.toISOString()}|${cursor.id}`,
    'utf8',
  ).toString('base64url');
}

export function decodeTwoFieldCursor(value: string): TwoFieldCursor {
  const decoded = Buffer.from(value, 'base64url').toString('utf8');
  const [createdAt, id] = decoded.split('|');

  if (!createdAt || !id) {
    throw new Error('Invalid two-field cursor.');
  }

  return {
    createdAt: new Date(createdAt),
    id,
  };
}
