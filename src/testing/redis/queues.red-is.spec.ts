/**
 * Lecture 40.88 �?" Redis Integration Tests: Queues.
 *
 * Runs real BullMQ `Queue`/`Worker`/`QueueEvents` instances against live
 * Redis to prove the messaging/background jobs substrate works end-to-end:
 * enqueue -> process -> completed, payload fidelity, and failure semantics.
 */

import { Queue, QueueEvents, Worker } from 'bullmq';

import { createRedisTestHarness, RedisTestHarness } from './redis-test.harness';

describe('Redis Integration: Queues', () => {
  let harness: RedisTestHarness;
  let connection: { host: string; port: number };

  beforeAll(async () => {
    harness = await createRedisTestHarness();
    const url = new URL(
      // expose the base URL (drop the /db index) for BullMQ's io-redis pool
      redisBaseUrl(),
    );
    connection = {
      host: url.hostname,
      port: Number(url.port || 6379),
    };
  });

  afterAll(async () => {
    await harness.cleanup();
  });

  async function waitUntil(
    predicate: () => Promise<boolean> | boolean,
    timeoutMs = 5000,
  ): Promise<void> {
    const start = Date.now();
    while (!(await predicate())) {
      if (Date.now() - start > timeoutMs) {
        throw new Error('Timed out waiting for condition');
      }
      await new Promise((r) => setTimeout(r, 25));
    }
  }

  it('processes a job enqueued to a live Redis-backed queue', async () => {
    const name = `it-q-proc-${Date.now()}`;
    const queue = new Queue(name, { connection });
    const events = new QueueEvents(name, { connection });

    const processed: string[] = [];
    let ret: unknown = null;
    const worker = new Worker(
      name,
      async (job) => {
        processed.push(job.data.value);
        const result = { doubled: job.data.value * 2 };
        ret = result;
        return result;
      },
      { connection },
    );
    const completed = new Promise<void>((resolve, reject) => {
      events.on('completed', () => resolve());
      events.on('failed', reject);
    });

    try {
      await queue.add('double', { value: 21 });
      await completed;

      await waitUntil(() => processed.length === 1);
      expect(processed).toEqual([21]);
      expect(ret).toEqual({ doubled: 42 });
    } finally {
      await worker.close();
      await queue.close();
      await events.close();
    }
  });

  it('marks a job as failed when the processor throws', async () => {
    const name = `it-q-fail-${Date.now()}`;
    const queue = new Queue(name, { connection });
    const events = new QueueEvents(name, { connection });
    const worker = new Worker(
      name,
      async () => {
        throw new Error('boom');
      },
      { connection },
    );

    const failed = new Promise<void>((resolve, reject) => {
      events.on('failed', ({ failedReason }) => {
        try {
          expect(failedReason).toContain('boom');
          resolve();
        } catch (err) {
          reject(err);
        }
      });
      events.on('completed', () => reject(new Error('expected failure')));
    });

    try {
      await queue.add('explode', {});
      await failed;
    } finally {
      await worker.close();
      await queue.close();
      await events.close();
    }
  });

  it('preserves typed payload data across enqueue/process', async () => {
    const name = `it-q-payload-${Date.now()}`;
    const queue = new Queue(name, { connection });
    const events = new QueueEvents(name, { connection });

    let seen: unknown = null;
    const worker = new Worker(
      name,
      async (job) => {
        seen = job.data;
      },
      { connection },
    );
    const completed = new Promise<void>((resolve) => {
      events.on('completed', () => resolve());
    });

    try {
      await queue.add('notify', { userId: 'u-1', channelId: 'c-2', seq: 7 });
      await completed;
      await waitUntil(() => seen !== null);
      expect(seen).toEqual({ userId: 'u-1', channelId: 'c-2', seq: 7 });
    } finally {
      await worker.close();
      await queue.close();
      await events.close();
    }
  });
});

// Re-expose the base host/port for BullMQ by recompiling from the test URL,
// minus any logical DB index (BullMQ maintains its own keyspace separation).
function redisBaseUrl(): string {
  const raw = process.env.REDIS_URL ?? 'redis://localhost:6379/15';
  return raw.replace(/\/\d+$/, '');
}
