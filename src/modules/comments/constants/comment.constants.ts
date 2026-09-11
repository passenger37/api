export const COMMENT_DEFAULTS = {
  MAX_CONTENT_LENGTH: 10000,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 50,
} as const;

export const COMMENT_SORT = {
  BEST: 'BEST',
  TOP: 'TOP',
  NEW: 'NEW',
  OLD: 'OLD',
} as const;

export type CommentSortMode = (typeof COMMENT_SORT)[keyof typeof COMMENT_SORT];

export function encodeCommentCursor(cursor: { createdAt: Date; id: string }): string {
  return Buffer.from(
    `${cursor.createdAt.toISOString()}|${cursor.id}`,
    'utf8',
  ).toString('base64url');
}

export function decodeCommentCursor(value: string): { createdAt: Date; id: string } {
  const decoded = Buffer.from(value, 'base64url').toString('utf8');
  const [createdAt, id] = decoded.split('|');

  if (!createdAt || !id) {
    throw new Error('Invalid comment cursor.');
  }

  return { createdAt: new Date(createdAt), id };
}
