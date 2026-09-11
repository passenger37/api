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

export interface CommentCursor {
  sort: CommentSortMode;
  upvoteCount: number;
  createdAt: Date;
  id: string;
}

export function encodeCommentCursor(cursor: CommentCursor): string {
  return Buffer.from(
    JSON.stringify({
      sort: cursor.sort,
      upvoteCount: cursor.upvoteCount,
      createdAt: cursor.createdAt.toISOString(),
      id: cursor.id,
    }),
    'utf8',
  ).toString('base64url');
}

export function decodeCommentCursor(value: string): CommentCursor {
  const decoded = Buffer.from(value, 'base64url').toString('utf8');

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(decoded);
  } catch {
    throw new Error('Invalid comment cursor.');
  }

  const { sort, upvoteCount, createdAt, id } = parsed;

  if (
    typeof createdAt !== 'string' ||
    typeof id !== 'string' ||
    typeof upvoteCount !== 'number'
  ) {
    throw new Error('Invalid comment cursor.');
  }

  const isValidSort = Object.values(COMMENT_SORT).includes(sort as CommentSortMode);

  if (!isValidSort) {
    throw new Error('Invalid comment cursor.');
  }

  return {
    sort: sort as CommentSortMode,
    upvoteCount,
    createdAt: new Date(createdAt),
    id,
  };
}
