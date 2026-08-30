import { resolveRedisUrl } from './redis.service';

describe('resolveRedisUrl', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('prefers REDIS_URL when set', () => {
    process.env.REDIS_URL = 'redis://override:6379/0';

    expect(resolveRedisUrl()).toBe('redis://override:6379/0');
  });

  it('uses defaults when no env is provided', () => {
    delete process.env.REDIS_URL;
    delete process.env.REDIS_HOST;
    delete process.env.REDIS_PORT;
    delete process.env.REDIS_PASSWORD;
    delete process.env.REDIS_DB;

    expect(resolveRedisUrl()).toBe('redis://localhost:6379');
  });

  it('composes host and port', () => {
    delete process.env.REDIS_URL;
    process.env.REDIS_HOST = 'redis.internal';
    process.env.REDIS_PORT = '6380';
    delete process.env.REDIS_PASSWORD;
    delete process.env.REDIS_DB;

    expect(resolveRedisUrl()).toBe('redis://redis.internal:6380');
  });

  it('includes password and db when provided', () => {
    delete process.env.REDIS_URL;
    process.env.REDIS_HOST = 'localhost';
    process.env.REDIS_PORT = '6379';
    process.env.REDIS_PASSWORD = 's3cret!';
    process.env.REDIS_DB = '2';

    expect(resolveRedisUrl()).toBe('redis://:s3cret!@localhost:6379/2');
  });
});
