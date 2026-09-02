import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { randomUUID } from 'crypto';
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BackgroundJobsRepository } from '../repositories/jobs.repository';
import { StructuredLogger } from '../../../core/logger/structured-logger';
import { TraceService } from '../../../core/tracing/trace.service';
import { MetricsService } from '../../../core/metrics/metrics.service';

export const JOB_TRACE_KEY = '__trace';

@Injectable()
export class JobsQueueService implements OnModuleInit, OnModuleDestroy {
  private queues = new Map<string, Queue>();
  private workers = new Map<string, Worker>();
  private queueEvents = new Map<string, QueueEvents>();

  private readonly queueNames = [
    'jobs-default',
    'jobs-high',
    'jobs-low',
    'jobs-scheduled',
    'jobs-webhooks',
    'jobs-notifications',
    'jobs-cleanup',
    'jobs-analytics',
  ];

  constructor(
    private readonly configService: ConfigService,
    private readonly jobsRepo: BackgroundJobsRepository,
    private readonly log: StructuredLogger,
    private readonly traceService: TraceService,
    private readonly metrics: MetricsService,
  ) {}

  async onModuleInit() {
    const redisOptions = this.getRedisOptions();

    for (const name of this.queueNames) {
      const queue = new Queue(name, { connection: redisOptions });
      this.queues.set(name, queue);

      const events = new QueueEvents(name, {
        connection: this.getRedisConnection(),
      });
      this.queueEvents.set(name, events);
      events.on('completed', async ({ jobId }) => {
        const traceId = await this.getJobTraceId(name, jobId);
        this.traceService.run({ traceId }, () => {
          this.log.info({
            module: 'jobs',
            operation: 'worker.completed',
            entityId: jobId,
            details: { queueName: name },
            message: 'Job completed',
          });
        });
      });
      events.on('failed', async ({ jobId }) => {
        const traceId = await this.getJobTraceId(name, jobId);
        this.traceService.run({ traceId }, () => {
          this.log.error({
            module: 'jobs',
            operation: 'worker.failed',
            entityId: jobId,
            errorCode: 500,
            details: { queueName: name },
            message: `Job failed in ${name}`,
          });
        });
      });
    }

    this.registerProcessor('jobs-default', this.defaultProcessor, {
      concurrency: 10,
    });
    this.registerProcessor('jobs-high', this.defaultProcessor, {
      concurrency: 5,
    });
    this.registerProcessor('jobs-low', this.defaultProcessor, {
      concurrency: 20,
    });
  }

  async onModuleDestroy() {
    for (const worker of this.workers.values()) {
      await worker.close();
    }
    for (const queue of this.queues.values()) {
      await queue.close();
    }
    for (const events of this.queueEvents.values()) {
      await events.close();
    }
  }

  getQueue(name: string): Queue | undefined {
    return this.queues.get(name);
  }

  async addJob<T>(
    queueName: string,
    jobName: string,
    data: T,
    options?: {
      priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
      maxRetries?: number;
      scheduledAt?: Date;
      tags?: string[];
      correlationId?: string;
      idempotencyKey?: string;
      userId?: string;
      removeOnComplete?: number;
      removeOnFail?: number;
    },
  ): Promise<string> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const priorityMap: Record<string, number> = {
      LOW: 10,
      NORMAL: 5,
      HIGH: 1,
      CRITICAL: 0,
    };

    // Embed the active trace id so the worker (a different execution context)
    // can restore it and keep the whole job lifecycle under one trace id.
    const traceId = this.traceService.getTraceId() ?? randomUUID();
    const tracedData = {
      ...(data as object),
      [JOB_TRACE_KEY]: { traceId },
    };

    const job = await queue.add(jobName, tracedData, {
      priority: priorityMap[options?.priority || 'NORMAL'],
      removeOnComplete: options?.removeOnComplete ?? 100,
      removeOnFail: options?.removeOnFail ?? 50,
      attempts: (options?.maxRetries ?? 3) + 1,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      delay: options?.scheduledAt
        ? options.scheduledAt.getTime() - Date.now()
        : 0,
      ...(options?.idempotencyKey ? { jobId: options.idempotencyKey } : {}),
    });

    this.metrics.increment('jobs_enqueued_total', {
      queue: queueName,
      job: jobName,
    });

    return job.id as string;
  }

  registerProcessor(
    queueName: string,
    processor: (job: Job) => Promise<any>,
    options?: { concurrency?: number; limiter?: any },
  ): Worker {
    const worker = new Worker(
      queueName,
      async (job: Job) => {
        const traceId =
          (job.data as Record<string, any>)?.[JOB_TRACE_KEY]?.traceId ??
          this.traceService.getTraceId() ??
          randomUUID();

        return this.traceService.run({ traceId }, () =>
          this.processJob(queueName, job, processor),
        );
      },
      {
        connection: this.getRedisOptions(),
        concurrency: options?.concurrency || 10,
      },
    );

    this.workers.set(queueName, worker);
    return worker;
  }

  private async processJob(
    queueName: string,
    job: Job,
    processor: (job: Job) => Promise<any>,
  ): Promise<any> {
    const startTime = Date.now();

    try {
      await this.jobsRepo.updateJob(job.id as string, {
        status: 'PROCESSING',
        startedAt: new Date(),
        attempts: { increment: 1 },
      });

      const result = await processor(job);

      const durationMs = Date.now() - startTime;
      await this.jobsRepo.updateJob(job.id as string, {
        status: 'COMPLETED',
        completedAt: new Date(),
        result: (result as any) ?? {},
        progress: 100,
      });

      this.log.info({
        module: 'jobs',
        operation: 'worker.processed',
        entityId: job.id as string,
        durationMs,
        details: { queueName, jobName: job.name },
        message: 'Job processed',
      });

      const successLabels = { queue: queueName, job: job.name, status: 'success' };
      this.metrics.increment('jobs_processed_total', successLabels);
      this.metrics.observeDuration('jobs_worker_duration_ms', durationMs, successLabels);

      return result;
    } catch (error) {
      const durationMs = Date.now() - startTime;
      await this.jobsRepo
        .updateJob(job.id as string, {
          status: 'FAILED',
          failedAt: new Date(),
          lastError: String((error as Error).message || error),
        })
        .catch(() => {});

      this.log.error({
        module: 'jobs',
        operation: 'worker.process_failed',
        entityId: job.id as string,
        errorCode: 500,
        durationMs,
        details: { queueName, jobName: job.name, error: String(error) },
        message: 'Job processing failed',
      });

      const failureLabels = { queue: queueName, job: job.name, status: 'failed' };
      this.metrics.increment('jobs_processed_total', failureLabels);
      this.metrics.observeDuration('jobs_worker_duration_ms', durationMs, failureLabels);
      this.metrics.increment('jobs_failed_total', { queue: queueName, job: job.name });

      throw error;
    }
  }

  private readonly defaultProcessor = async (job: Job): Promise<any> => {
    this.log.debug({
      module: 'jobs',
      operation: 'processor.executing',
      entityId: job.id as string,
      details: { queueName: '', jobName: job.name },
      message: 'Processing default job',
    });
    return { processed: true, payload: job.data };
  };

  async getJobStatus(queueName: string, jobId: string) {
    const queue = this.queues.get(queueName);
    if (!queue) return null;
    const job = await queue.getJob(jobId);
    if (!job) return null;
    return this.mapBullJob(job);
  }

  async getJobStatusById(jobId: string) {
    for (const queue of this.queues.values()) {
      const job = await queue.getJob(jobId);
      if (job) {
        return this.mapBullJob(job);
      }
    }
    return this.jobsRepo.findJobById(jobId);
  }

  async pauseQueue(queueName: string) {
    const queue = this.queues.get(queueName);
    if (queue) await queue.pause();
  }

  async resumeQueue(queueName: string) {
    const queue = this.queues.get(queueName);
    if (queue) await queue.resume();
  }

  async drainQueue(queueName: string) {
    const queue = this.queues.get(queueName);
    if (queue) await queue.drain();
  }

  async cancelJob(queueName: string, jobId: string) {
    const queue = this.queues.get(queueName);
    if (!queue) throw new Error(`Queue ${queueName} not found`);
    const job = await queue.getJob(jobId);
    if (job) await job.remove();
  }

  async retryJob(queueName: string, jobId: string) {
    const queue = this.queues.get(queueName);
    if (!queue) throw new Error(`Queue ${queueName} not found`);
    const job = await queue.getJob(jobId);
    if (job) await job.retry();
  }

  private getRedisConnection() {
    return {
      host: this.configService.get('REDIS_HOST') || 'localhost',
      port: parseInt(this.configService.get('REDIS_PORT') || '6379', 10),
      password: this.configService.get('REDIS_PASSWORD') || undefined,
      maxRetriesPerRequest: 3,
    };
  }

  private async getJobTraceId(queueName: string, jobId: string): Promise<string> {
    try {
      const queue = this.queues.get(queueName);
      if (queue) {
        const job = await queue.getJob(jobId);
        const trace = (job?.data as Record<string, any> | undefined)?.[JOB_TRACE_KEY];
        if (trace?.traceId) {
          return trace.traceId as string;
        }
      }
    } catch {
      // fall through to generated id
    }
    return randomUUID();
  }

  private getRedisOptions() {
    return {
      host: this.configService.get('REDIS_HOST') || 'localhost',
      port: parseInt(this.configService.get('REDIS_PORT') || '6379', 10),
      password: this.configService.get('REDIS_PASSWORD') || undefined,
    };
  }

  private async mapBullJob(job: Job) {
    return {
      id: job.id,
      name: job.name,
      data: job.data,
      progress: job.progress,
      status: await job.getState(),
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      failedReason: job.failedReason,
      returnvalue: job.returnvalue,
    };
  }
}
