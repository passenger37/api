/**
 * Lecture 40.88 �?" Redis Integration Tests.
 *
 * Opt-in harness that connects the real Redis-backed services to a local
 * Redis instance (see `npm run test:redis` / `jest-redis.json`). It isolates
 * every run in a dedicated logical DB index (default `15`, overridable via
 * `NEXUS_REDIS_TEST_DB`) so tests never touch application data and can be
 * safely wiped with `FLUSHDB` on teardown.
 *
 * URL resolution mirrors `RedisService.resolveRedisUrl()`: `NEXUS_REDIS_TEST_URL`
 * wins; otherwise compile base from `REDIS_URL`/`REDIS_HOST`/`REDIS_PORT`/
 * `REDIS_PASSWORD` and append the test DB index.
 */

import { RedisService } from '../../core/redis/redis.service';

export interface RedisTestHarnessOptions {
  /** Test Redis URL. Defaults to compile from env + test DB index. */
  url?: string;
  /** Logical DB index used for isolation (default 15). */
  db?: number;
}

export const DEFAULT_REDIS_TEST_DB = 15;

function resolveBaseRedisUrl(): string {
  if (process.env.REDIS_URL) {
    return process.env.REDIS_URL.replace(/\/\d+$/, '');
  }
  const host = process.env.REDIS_HOST ?? 'localhost';
  const port = process.env.REDIS_PORT ?? '6379';
  const password = process.env.REDIS_PASSWORD;
  const authority = password ? `:${encodeURIComponent(password)}@` : '';
  return `redis://${authority}${host}:${port}`;
}

export function resolveRedisTestUrl(db = DEFAULT_REDIS_TEST_DB): string {
  if (process.env.NEXUS_REDIS_TEST_URL) {
    return process.env.NEXUS_REDIS_TEST_URL;
  }
  return `${resolveBaseRedisUrl()}/${db}`;
}

export interface RedisTestHarness {
  redis: RedisService;
  raw: ReturnType<RedisService['getClient']>;
  db: number;
  /** Wipe the isolated DB (FLUSHDB). Safe because we own the test index. */
  flush: () => Promise<void>;
  /** Close the RedisService client. */
  cleanup: () => Promise<void>;
}

export async function createRedisTestHarness(
  options: RedisTestHarnessOptions = {},
): Promise<RedisTestHarness> {
  const db = options.db ?? DEFAULT_REDIS_TEST_DB;
  const url = options.url ?? resolveRedisTestUrl(db);

  // Point the real services at the isolated test DB.
  const prevUrl = process.env.REDIS_URL;
  process.env.REDIS_URL = url;

  const redis = new RedisService();
  await redis.onModuleInit();
  const raw = redis.getClient();
  await raw.select(db);

  // Restore the app env after the client is bound (it captured url already).
  if (prevUrl === undefined) {
    delete process.env.REDIS_URL;
  } else {
    process.env.REDIS_URL = prevUrl;
  }

  const harness: RedisTestHarness = {
    redis,
    raw,
    db,
    flush: async () => {
      await raw.flushDb();
    },
    cleanup: () => redis.onModuleDestroy(),
  };

  // Start each test off from a clean slate.
  await harness.flush();

  return harness;
}
