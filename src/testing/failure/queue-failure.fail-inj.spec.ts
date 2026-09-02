/**
 * Lecture 40.90 - Failure Injection Testing: queue failure + duplicate job.
 *
 * Exercises the background-jobs degradation contract with a real Postgres
 * repository + real `JobsService` and a stubbed BullMQ-facing layer:
 *
 *  - enqueue outage: pushing to the queue fails loud; the persisted job row is
 *    not lost and still carries its idempotency key.
 *  - duplicate enqueue with the same idempotency key is deduplicated - one row.
 *  - worker failure hand-off marks the row FAILED with `lastError` (the exact
 *    write `JobsQueueService.processJob` performs on failure).
 *  - `retryJob` promotes FAILED -> RETRYING and re-enqueues.
 *  - retrying a non-failed job is rejected (BadRequest).
 *  - `retryDeadLetter` re-enqueues the payload and resolves the dead letter.
 */
import { BadRequestException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import { MetricsService } from '../../core/metrics/metrics.service';
import { StructuredLogger } from '../../core/logger/structured-logger';
import { PrismaService } from '../../core/database/prisma.service';
import { BackgroundJobsRepository } from '../../modules/jobs/repositories/jobs.repository';
import { JobsQueueService } from '../../modules/jobs/queues/jobs-queue.service';
import { JobsService } from '../../modules/jobs/services/jobs.service';
import {
  createDbTestHarness,
  DbTestContext,
} from '../db/db-test.harness';

describe('Failure Injection: queue failure (40.90)', () => {
  let ctx: DbTestContext;
  let prisma: PrismaService;
  let repo: BackgroundJobsRepository;
  let service: JobsService;
  let userId: string;
  let addJobMock: jest.Mock;

  beforeAll(async () => {
    ctx = await createDbTestHarness();
    prisma = ctx.prisma;
    repo = new BackgroundJobsRepository(prisma);

    const queueFake = {
      addJob: jest.fn(),
      retryJob: jest.fn(),
      cancelJob: jest.fn(),
      pauseQueue: jest.fn().mockResolvedValue(undefined),
      resumeQueue: jest.fn().mockResolvedValue(undefined),
      drainQueue: jest.fn().mockResolvedValue(undefined),
      getJobStatus: jest.fn(),
      getJobStatusById: jest.fn(),
    } as unknown as JobsQueueService;
    addJobMock = queueFake.addJob as jest.Mock;

    const log = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as unknown as StructuredLogger;

    service = new JobsService(
      repo,
      queueFake,
      prisma,
      log,
      new MetricsService(),
    );

    const user = await prisma.user.create({
      data: {
        email: `jobs-failure-${uuidv4()}@nexus.test`,
        username: `jobs-failure-${uuidv4().slice(0, 8)}`,
        passwordHash: 'hashed',
        displayName: 'Jobs Failure Tester',
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

  it('an enqueue outage fails loud but never loses the persisted job row', async () => {
    addJobMock.mockRejectedValueOnce(new Error('Redis is down'));

    await expect(
      service.enqueueJob(userId, {
        name: 'boom-job',
        queueName: 'jobs-default',
        payload: { x: 1 },
        idempotencyKey: 'outage-1',
      }),
    ).rejects.toThrow('Redis is down');

    const row = await repo.findJobByIdempotencyKey('outage-1');
    expect(row).not.toBeNull();
    expect(row?.status).toBe('QUEUED');
    expect(row?.idempotencyKey).toBe('outage-1');
  });

  it('duplicate enqueue with the same idempotency key is deduplicated to one row', async () => {
    addJobMock.mockResolvedValue('job-a');

    // The mock is suite-scoped, so queue touch is asserted as a delta.
    const addCallsBefore = addJobMock.mock.calls.length;

    const first = await service.enqueueJob(userId, {
      name: 'dup-job',
      queueName: 'jobs-default',
      payload: { kind: 'dedup' },
      idempotencyKey: 'dedup-1',
    });
    expect(first).toMatchObject({ success: true });
    expect(first.deduplicated ?? false).toBe(false);
    expect(addJobMock.mock.calls.length).toBe(addCallsBefore + 1);

    const second = await service.enqueueJob(userId, {
      name: 'dup-job',
      queueName: 'jobs-default',
      payload: { kind: 'dedup' },
      idempotencyKey: 'dedup-1',
    });
    expect(second).toMatchObject({ success: true, deduplicated: true });
    expect(second.jobId).toBe(first.jobId);

    // The queue is never re-touched for the duplicate.
    expect(addJobMock.mock.calls.length).toBe(addCallsBefore + 1);

    const count = await prisma.backgroundJob.count({
      where: { idempotencyKey: 'dedup-1' },
    });
    expect(count).toBe(1);
  });

  it('a worker failure persists the FAILED hand-off with the error details', async () => {
    const job = await repo.createJob({
      name: 'fail-job',
      queueName: 'jobs-default',
      payload: { trigger: 'boom' },
      user: { connect: { id: userId } },
    });

    // This is exactly the write JobsQueueService.processJob performs on catch.
    await repo.updateJob(job.id, {
      status: 'FAILED',
      failedAt: new Date(),
      lastError: 'boom: simulated worker failure',
    });

    const row = await repo.findJobById(job.id);
    expect(row?.status).toBe('FAILED');
    expect(row?.failedAt).not.toBeNull();
    expect(row?.lastError).toContain('boom');
  });

  it('retryJob promotes FAILED -> RETRYING and re-enqueues', async () => {
    const job = await repo.createJob({
      name: 'retry-job',
      queueName: 'jobs-default',
      payload: { ok: false },
      user: { connect: { id: userId } },
    });
    await repo.updateJob(job.id, {
      status: 'FAILED',
      failedAt: new Date(),
      lastError: 'boom',
    });

    const result = await service.retryJob(userId, job.id);
    expect(result).toEqual({ success: true, retried: true });

    const row = await repo.findJobById(job.id);
    expect(row?.status).toBe('RETRYING');
    expect(row?.lastError).toBeNull();
  });

  it('retrying a non-failed job is rejected', async () => {
    const job = await repo.createJob({
      name: 'queued-job',
      queueName: 'jobs-default',
      payload: {},
      user: { connect: { id: userId } },
    });

    await expect(service.retryJob(userId, job.id)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('retryDeadLetter re-enqueues the failed payload and resolves the dead letter', async () => {
    const base = await repo.createJob({
      name: 'dl-job',
      queueName: 'jobs-default',
      payload: { a: 1 },
      user: { connect: { id: userId } },
    });
    await repo.updateJob(base.id, {
      status: 'FAILED',
      failedAt: new Date(),
      lastError: 'boom',
    });

    const dl = await repo.createDeadLetter({
      jobId: base.id,
      jobName: 'dl-job',
      queueName: 'jobs-default',
      payload: { a: 1 },
      error: 'boom',
      attempts: 3,
    });
    addJobMock.mockResolvedValue('job-dl');

    const result = await service.retryDeadLetter(userId, dl.id);
    expect(result.success).toBe(true);
    expect(addJobMock).toHaveBeenCalledWith(
      'jobs-default',
      'dl-job',
      { a: 1 },
      { maxRetries: 3 },
    );

    const resolved = await prisma.backgroundJobDeadLetter.findUnique({
      where: { id: dl.id },
    });
    expect(resolved?.resolvedAt).not.toBeNull();
  });
});