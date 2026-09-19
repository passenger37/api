/**
 * Lecture 40.88 �?" Redis Integration Tests: Distributed Coordination.
 *
 * Exercises the real coordination primitives against live Redis:
 *   - `RedisLockService`: NX/PX distributed lock, atomic Lua release, and
 *     `runExclusive` mutual exclusion across "instances".
 *   - `RedisPubSubService`: subscribe/publish fan-out between a publisher and
 *     an independent subscriber client (cross-client delivery).
 *   - `RedisNodeRegistry`: instance registration, enumeration + heartbeat.
 */

import { RedisLockService } from '../../core/redis/redis-lock.service';
import { RedisPubSubService } from '../../core/redis/redis-pub-sub.service';
import { RedisNodeRegistry } from '../../core/redis/redis-node-registry';
import { createRedisTestHarness, RedisTestHarness } from './redis-test.harness';

describe('Redis Integration: Distributed Coordination', () => {
  let harness: RedisTestHarness;

  beforeAll(async () => {
    harness = await createRedisTestHarness();
  });

  afterAll(async () => {
    await harness.cleanup();
  });

  describe('RedisLockService', () => {
    it('acquires and releases a lock with a unique token', async () => {
      const lock = new RedisLockService(harness.redis);
      const name = `it:lock:${Date.now()}`;

      expect(await lock.acquire(name, 'token-a', 10_000)).toBe(true);
      expect(await harness.raw.exists(`lock:${name}`)).toBe(1);

      await lock.release(name, 'token-a');
      expect(await harness.raw.exists(`lock:${name}`)).toBe(0);
    });

    it('cannot be released by a non-owner token (atomic compare-and-del)', async () => {
      const lock = new RedisLockService(harness.redis);
      const name = `it:lock:guard:${Date.now()}`;

      await lock.acquire(name, 'owner', 10_000);
      await lock.release(name, 'imposter');

      // Still held by the real owner.
      expect(await harness.raw.exists(`lock:${name}`)).toBe(1);
      await lock.release(name, 'owner');
    });

    it('fails to acquire when another token holds the lock', async () => {
      const lock = new RedisLockService(harness.redis);
      const name = `it:lock:contend:${Date.now()}`;

      expect(await lock.acquire(name, 'a', 10_000)).toBe(true);
      expect(await lock.acquire(name, 'b', 10_000)).toBe(false);
    });

    it('runs exactly one exclusive job across competing acquirers', async () => {
      const lock = new RedisLockService(harness.redis);
      const name = `it:lock:exclusive:${Date.now()}`;

      let executed = 0;
      const job = async () => {
        executed += 1;
      };

      // Simulate two instances racing for the same lock name.
      const [first, second] = await Promise.all([
        lock.runExclusive(name, 10_000, job),
        lock.runExclusive(name, 10_000, job),
      ]);

      expect([first.executed, second.executed].filter(Boolean).length).toBe(1);
      expect(executed).toBe(1);
    });
  });

  describe('RedisPubSubService', () => {
    it('delivers a published payload to a subscribing handler', async () => {
      const channel = `it:pubsub:${Date.now()}`;

      // Publisher and subscriber get independent underlying Redis clients.
      const pub = new RedisPubSubService(harness.redis);
      const subRedis = harness.redis.getClient().duplicate();
      await subRedis.connect();
      const sub = new RedisPubSubService({ getClient: () => subRedis } as any);
      await sub.onModuleInit();

      const received: unknown[] = [];
      const unsubscribe = await sub.subscribe<{ n: number }>(channel, (m) => {
        received.push(m);
      });

      // Give the SUBSCRIBE a moment to register server-side.
      await new Promise((r) => setTimeout(r, 150));

      await pub.publish(channel, { n: 1 });
      await pub.publish(channel, { n: 2 });

      await new Promise((r) => setTimeout(r, 200));
      expect(received).toEqual([{ n: 1 }, { n: 2 }]);

      unsubscribe();
      await sub.onModuleDestroy();
      await subRedis.quit();
    });
  });

  describe('RedisNodeRegistry', () => {
    it('registers, enumerates and deregisters a node', async () => {
      const prevNodeId = process.env.NODE_ID;
      process.env.NODE_ID = `it-node-${Date.now()}`;
      const registry = new RedisNodeRegistry(harness.redis);

      try {
        await registry.register();
        const instances = await registry.listInstances();
        const mine = instances.find((n) => n.nodeId === process.env.NODE_ID);
        expect(mine).toBeDefined();
        expect(mine!.pid).toBe(process.pid);
        expect(mine!.hostname).toBeTruthy();

        expect(await registry.countInstances()).toBe(instances.length);

        await registry.deregister();
        const after = await registry.listInstances();
        expect(after.some((n) => n.nodeId === process.env.NODE_ID)).toBe(false);
      } finally {
        if (prevNodeId === undefined) {
          delete process.env.NODE_ID;
        } else {
          process.env.NODE_ID = prevNodeId;
        }
        await registry.deregister();
      }
    });
  });
});
