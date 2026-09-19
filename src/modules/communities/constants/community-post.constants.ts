export const COMMUNITY_POST_DEFAULTS = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 50,
  MAX_TITLE_LENGTH: 200,
  MAX_CONTENT_LENGTH: 10000,
  MAX_MEDIA_COUNT: 10,
  MAX_HASHTAGS: 10,
  MAX_MENTIONS: 20,
} as const;

export const COMMUNITY_POST_VISIBILITY_OPTIONS = [
  'COMMUNITY_MEMBERS',
  'PUBLIC',
] as const;

export const COMMUNITY_POST_CONTENT_TYPE_OPTIONS = [
  'TEXT',
  'MEDIA',
  'MIXED',
  'LINK',
  'POLL',
] as const;

export const COMMUNITY_POST_STATUS_OPTIONS = [
  'ACTIVE',
  'HIDDEN',
  'LOCKED',
  'MODERATION_PENDING',
  'DELETED',
] as const;

export const POST_REPORT_REASONS = [
  'HARASSMENT',
  'HATE_SPEECH',
  'SPAM',
  'NSFW_CONTENT',
  'VIOLENCE',
  'SELF_HARM',
  'MISINFORMATION',
  'COPYRIGHT',
  'OTHER',
] as const;

export const POST_SORT_OPTIONS = [
  'LATEST',
  'TOP',
  'HOT',
  'CONTROVERSIAL',
] as const;

export const COMMUNITY_POST_CURSOR_VERSION = 'v1';

export function encodeCommunityPostCursor(
  createdAt: Date,
  id: string,
  isPinned: boolean,
): string {
  const payload = `${COMMUNITY_POST_CURSOR_VERSION}|${isPinned ? '1' : '0'}|${createdAt.toISOString()}|${id}`;
  return Buffer.from(payload).toString('base64url');
}

export function decodeCommunityPostCursor(
  cursor: string,
): { createdAt: Date; id: string; isPinned: boolean } | null {
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    const parts = decoded.split('|');
    if (parts.length !== 4 || parts[0] !== COMMUNITY_POST_CURSOR_VERSION) {
      return null;
    }
    const isPinned = parts[1] === '1';
    const createdAt = new Date(parts[2]);
    const id = parts[3];
    if (isNaN(createdAt.getTime()) || !id) {
      return null;
    }
    return { createdAt, id, isPinned };
  } catch {
    return null;
  }
}

export const POST_EDIT_HISTORY_LIMIT = 10;
export const MAX_EDIT_HISTORY_RETENTION_DAYS = 365;

export interface FeedCursorPayload {
  isPinned: boolean;
  sortKey: string;
  createdAt: string;
  id: string;
}

export function encodeFeedCursor(payload: FeedCursorPayload): string {
  const raw = [
    COMMUNITY_POST_CURSOR_VERSION,
    payload.isPinned ? '1' : '0',
    payload.sortKey,
    payload.createdAt,
    payload.id,
  ].join('|');
  return Buffer.from(raw, 'utf8').toString('base64url');
}

export function decodeFeedCursor(
  cursor: string,
): (Omit<FeedCursorPayload, 'isPinned'> & { isPinned: boolean }) | null {
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    const parts = decoded.split('|');
    if (parts.length !== 5 || parts[0] !== COMMUNITY_POST_CURSOR_VERSION) {
      return null;
    }
    const isPinned = parts[1] === '1';
    const sortKey = parts[2];
    const createdAt = new Date(parts[3]);
    const id = parts[4];
    if (isNaN(createdAt.getTime()) || !sortKey || !id) {
      return null;
    }
    return { isPinned, sortKey, createdAt: parts[3], id };
  } catch {
    return null;
  }
}

export function encodeVoteCursor(createdAt: Date, id: string): string {
  return Buffer.from(`${createdAt.toISOString()}|${id}`, 'utf8').toString(
    'base64url',
  );
}

export function encodeBookmarkCursor(createdAt: Date, id: string): string {
  return Buffer.from(`${createdAt.toISOString()}|${id}`, 'utf8').toString(
    'base64url',
  );
}

export function encodeReportCursor(createdAt: Date, id: string): string {
  return Buffer.from(`${createdAt.toISOString()}|${id}`, 'utf8').toString(
    'base64url',
  );
}

export const COMMUNITY_FEED_CACHE = 'community-post-feed';
export const COMMUNITY_FEED_CACHE_TTL_SEC = {
  LATEST: 30,
  TOP: 15,
  HOT: 15,
  CONTROVERSIAL: 15,
} as const;

export const COMMUNITY_FEED_SORTS_ALL = [
  'LATEST',
  'TOP',
  'HOT',
  'CONTROVERSIAL',
] as const;
export const COMMUNITY_FEED_SORTS_KEYED = [
  'TOP',
  'HOT',
  'CONTROVERSIAL',
] as const;
export const COMMUNITY_FEED_CACHE_LIMITS = [20, 50] as const;

export function communityFeedCacheKey(
  communityId: string,
  sort: string,
  categoryId: string | null,
  limit: number,
  position: string,
): string {
  return `feed:${communityId}:${sort}:${categoryId ?? 'all'}:${limit}:${position}`;
}
