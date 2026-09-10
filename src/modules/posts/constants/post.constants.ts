export const POST_DEFAULTS = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 50,
  MAX_CONTENT_LENGTH: 10000,
  MAX_MEDIA_COUNT: 10,
  MAX_HASHTAGS: 10,
  MAX_MENTIONS: 20,
} as const;

export const POST_VISIBILITY_OPTIONS = ['PUBLIC', 'FOLLOWERS', 'FRIENDS', 'COMMUNITY', 'SERVER', 'PRIVATE', 'CUSTOM'] as const;

export const POST_CONTENT_TYPE_OPTIONS = ['TEXT', 'MEDIA', 'MIXED'] as const;

export const REACTION_TYPES = ['LIKE', 'LOVE', 'HAHA', 'WOW', 'SAD', 'ANGRY', 'FIRE', 'CELEBRATE'] as const;

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

export const POST_SORT_OPTIONS = ['LATEST', 'OLDEST', 'MOST_REACTIONS', 'MOST_COMMENTS', 'MOST_REPOSTS'] as const;

export const POST_CURSOR_VERSION = 'v1';

export function encodePostCursor(createdAt: Date, id: string): string {
  const payload = `${POST_CURSOR_VERSION}|${createdAt.toISOString()}|${id}`;
  return Buffer.from(payload).toString('base64url');
}

export function decodePostCursor(cursor: string): { createdAt: Date; id: string } | null {
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    const parts = decoded.split('|');
    if (parts.length !== 3 || parts[0] !== POST_CURSOR_VERSION) {
      return null;
    }
    const createdAt = new Date(parts[1]);
    const id = parts[2];
    if (isNaN(createdAt.getTime()) || !id) {
      return null;
    }
    return { createdAt, id };
  } catch {
    return null;
  }
}