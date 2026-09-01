const configuredPrefix = process.env.REDIS_KEY_PREFIX ?? '';

export const REDIS_KEY_PREFIX = configuredPrefix;

const prefix = (key: string): string => `${REDIS_KEY_PREFIX}${key}`;

export const REDIS_TTL = {
  PRESENCE: 60,
  LAST_SEEN: 30 * 24 * 60 * 60,
  TYPING: 10,
  MESSAGE_PAGE: 10,
  PERMISSION_CACHE: 300,
  CONNECTION_COUNTER: 86_400,
} as const;

/**
 * Lecture 40.83 — Cache Architecture TTL table (seconds) per logical cache.
 * Mirrors `LoadModelSpec.db[].stabilitySec` — stable, read-heavy paths get
 * longer TTLs; volatile / write-heavy paths are not cached (cannot be
 * invalidated reliably at a useful hit-rate).
 */
export const CACHE_TTL = {
  SERVER: 300,
  SERVER_CHANNEL: 300,
  SERVER_MEMBER_COUNT: 60,
  SERVER_MEMBERS_BY_USER: 60,
  DM_READ: 60,
  SEARCH_RECENT: 60,
} as const;

export const REDIS_JOB_LOCK_TTL_MS = 30_000;

export const PERMISSION_INVALIDATE_CHANNEL = prefix(
  'permission:user-invalidated',
);

export const redisKeys = {
  authLogin: (identifier: string, ip: string): string =>
    prefix(`auth:login:${identifier}:${ip}`),

  authTarget: (target: string, ip: string): string =>
    prefix(`auth:${target}:${ip}`),

  wsRateLimit: (operation: string, userId: string): string =>
    prefix(`ws:${operation}:${userId}`),

  wsConnection: (userId: string): string => prefix(`ws:connections:${userId}`),

  spamSend: (memberId: string): string => prefix(`spam:send:${memberId}`),

  spamSignature: (
    channelId: string,
    memberId: string,
    signature: string,
  ): string => prefix(`spam:sig:${channelId}:${memberId}:${signature}`),

  spamUpload: (memberId: string): string => prefix(`spam:upload:${memberId}`),

  presence: (userId: string): string => prefix(`user:${userId}:presence`),

  lastSeen: (userId: string): string => prefix(`user:${userId}:last-seen`),

  typing: (channelId: string, userId: string): string =>
    prefix(`typing:${channelId}:${userId}`),

  permissionCache: (userId: string): string =>
    prefix(`authorization:user:${userId}`),

  messageVersion: (channelId: string): string => prefix(`msg:ver:${channelId}`),

  messagePage: (
    channelId: string,
    version: number,
    cursor: string,
    limit: number,
  ): string => prefix(`msg:page:${channelId}:${version}:${cursor}:${limit}`),

  messageAfter: (
    channelId: string,
    version: number,
    afterMessageId: string,
    take: number,
  ): string =>
    prefix(`msg:after:${channelId}:${version}:${afterMessageId}:${take}`),

  messageThread: (
    channelId: string,
    version: number,
    parentMessageId: string,
    cursor: string,
    limit: number,
  ): string =>
    prefix(
      `msg:thread:${channelId}:${version}:${parentMessageId}:${cursor}:${limit}`,
    ),

  messageUnread: (
    channelId: string,
    memberId: string,
    version: number,
  ): string => prefix(`msg:unread:${channelId}:${memberId}:${version}`),

  lock: (name: string): string => prefix(`lock:${name}`),

  socketIoAdapter: (): string => prefix('socket.io'),

  node: (nodeId: string): string => prefix(`node:${nodeId}`),

  nodesPattern: (): string => `${prefix('node:*')}`,

  // --- Lecture 40.83 cache keys ------------------------------------------
  serverCache: (serverId: string): string => prefix(`cache:server:${serverId}`),

  serverChannelCache: (channelId: string): string =>
    prefix(`cache:channel:${channelId}`),

  serverMemberCount: (serverId: string): string =>
    prefix(`cache:server:${serverId}:member-count`),

  serverMembersByUser: (userId: string): string =>
    prefix(`cache:user:${userId}:servers`),

  dmReadCache: (channelId: string, userId: string): string =>
    prefix(`cache:dm:${channelId}:${userId}:read`),

  searchRecent: (userId: string): string =>
    prefix(`cache:user:${userId}:search-recent`),
};
