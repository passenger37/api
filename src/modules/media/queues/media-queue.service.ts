import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface MediaQueueOptions {
  concurrency?: number;
  maxRetries?: number;
  defaultJobOptions?: Record<string, any>;
}

@Injectable()
export class MediaQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MediaQueueService.name);
  private queues = new Map<string, Queue>();
  private workers = new Map<string, Worker>();
  private queueEvents = new Map<string, QueueEvents>();

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const redisOptions = {
      host: this.configService.get('REDIS_HOST') || 'localhost',
      port: parseInt(this.configService.get('REDIS_PORT') || '6379', 10),
      password: this.configService.get('REDIS_PASSWORD') || undefined,
      maxRetriesPerRequest: 3,
    };

    // Create queues for each media job type
    const queueNames = [
      'media:thumbnail',
      'media:transcode',
      'media:av-scan',
      'media:watermark',
      'media:metadata',
    ];

    for (const name of queueNames) {
      this.queues.set(name, new Queue(name, { connection: redisOptions }));
      this.queueEvents.set(name, new QueueEvents(name, { connection: this.getRedisOptions() }));
      
      // Setup queue events
      const events = this.queueEvents.get(name)!;
      events.on('completed', ({ jobId, returnvalue }) => {
        this.logger.debug(`Job ${jobId} completed in ${name}`);
      });
      events.on('failed', ({ jobId, failedReason }) => {
        this.logger.error(`Job ${jobId} failed in ${name}: ${failedReason}`);
      });
    }
  }

  private getRedisOptions() {
    return {
      host: this.configService.get('REDIS_HOST') || 'localhost',
      port: parseInt(this.configService.get('REDIS_PORT') || '6379', 10),
      password: this.configService.get('REDIS_PASSWORD') || undefined,
    };
  }

  getQueue(name: string): Queue | undefined {
    return this.queues.get(name);
  }

  async addJob<T>(queueName: string, jobName: string, data: T, options?: any) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }
    return queue.add(jobName, data, {
      removeOnComplete: 100,
      removeOnFail: 50,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      ...options,
    });
  }

  registerWorker<T>(
    queueName: string,
    processor: (job: Job) => Promise<any>,
    options?: { concurrency?: number; limiter?: any }
  ): Worker {
    const worker = new Worker(queueName, processor, {
      connection: this.getRedisOptions(),
      concurrency: options?.concurrency || 1,
      limiter: options?.limiter,
    });

    worker.on('completed', (job) => {
      this.logger.debug(`Worker completed job ${job.id} in ${queueName}`);
    });
    worker.on('failed', (job, err) => {
      this.logger.error(`Worker failed job ${job?.id} in ${queueName}: ${err.message}`);
    });
    worker.on('error', (err) => {
      this.logger.error(`Worker error in ${queueName}: ${err.message}`);
    });

    this.workers.set(queueName, worker);
    return worker;
  }

  async getJobStatus(queueName: string, jobId: string) {
    const queue = this.queues.get(queueName);
    if (!queue) return null;
    const job = await queue.getJob(jobId);
    if (!job) return null;
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
    };
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

  async onModuleDestroy() {
    for (const [name, worker] of this.workers) {
      await worker.close();
      this.logger.debug(`Closed worker for ${name}`);
    }
    for (const [name, queue] of this.queues) {
      await queue.close();
      this.logger.debug(`Closed queue ${name}`);
    }
    for (const [name, events] of this.queueEvents) {
      await events.close();
      this.logger.debug(`Closed queue events for ${name}`);
    }
  }
}