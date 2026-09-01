import { RedisIoAdapter, redisIoClientName } from './redis-io.adapter';

describe('RedisIoAdapter (multi-instance refinements)', () => {
  it('builds distinct names for pub and sub clients', () => {
    expect(redisIoClientName('pub', 'node-1')).toBe('socket.io:pub:node-1');
    expect(redisIoClientName('sub', 'node-1')).toBe('socket.io:sub:node-1');
    expect(redisIoClientName('pub', 'node-1')).not.toBe(
      redisIoClientName('pub', 'node-2'),
    );
  });

  it('surfaces an instance id for scale-out observability', () => {
    const adapter = new RedisIoAdapter();
    expect(adapter.instanceId()).toBeTruthy();
    expect(adapter.instanceId()).toContain(':');
  });

  it('disconnects gracefully without a live Redis connection', async () => {
    const adapter = new RedisIoAdapter();
    await expect(adapter.disconnect()).resolves.toBeUndefined();
  });
});
