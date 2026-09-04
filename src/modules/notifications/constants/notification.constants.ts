export const NOTIFICATION_EVENT_NEW = 'notification:new';
export const NOTIFICATION_EVENT_READ = 'notification:read';
export const NOTIFICATION_EVENT_READ_ALL = 'notification:read-all';
export const NOTIFICATION_EVENT_COUNT = 'notification:count';

export const NOTIFICATION_WS_RATE_LIMIT = {
  LIST: 30,
  READ: 60,
  READ_ALL: 30,
} as const;

export const NOTIFICATION_WINDOW_SECONDS = 10;

export const NOTIFICATION_DEDUPE_TTL_SECONDS = 3600;

export const UNREAD_COUNTER_TTL_SECONDS = 30 * 24 * 60 * 60;

export const RECENT_NOTIFICATIONS_PER_USER = 50;

export const DOMAIN_EVENT_CHANNEL = 'notifications:domain-events';

export const NOTIFICATION_DEFAULT_PAGE_SIZE = 50;

export const NOTIFICATION_MAX_PAGE_SIZE = 100;

export const NOTIFICATION_MAX_RETRY_ATTEMPTS = 3;
