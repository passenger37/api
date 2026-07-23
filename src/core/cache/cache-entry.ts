export interface CacheEntry<T> {
  value: T;

  createdAt: Date;

  expiresAt: Date;

  version: number;
}
