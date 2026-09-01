import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { BackgroundJobsRepository } from '../repositories/jobs.repository';
import { JobsQueueService } from '../queues/jobs-queue.service';
import { StructuredLogger } from '../../../core/logger/structured-logger';
import { MetricsService } from '../../../core/metrics/metrics.service';
import { BackgroundJobDeadLetter, BackgroundJobStatus, BackgroundJobPriority } from '@prisma/client';

@Injectable()
export class JobsService {
  constructor(
    private readonly jobsRepo: BackgroundJobsRepository,
    private readonly queueService: JobsQueueService,
    private readonly prisma: PrismaService,
    private readonly log: StructuredLogger,
    private readonly metrics: MetricsService,
  ) {}

  async enqueueJob(
    userId: string,
    input: {
      name: string;
      queueName: string;
      payload: Record<string, any>;
      priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
      maxRetries?: number;
      scheduledAt?: Date;
      tags?: string[];
      correlationId?: string;
      idempotencyKey?: string;
    },
  ) {
    if (input.idempotencyKey) {
      const existing = await this.jobsRepo.findJobByIdempotencyKey(input.idempotencyKey);
      if (existing) {
        this.log.debug({
          module: 'jobs',
          operation: 'enqueue.deduplicated',
          userId,
          entityId: existing.id,
          details: { queueName: input.queueName, idempotencyKey: input.idempotencyKey },
        });
        this.metrics.increment('jobs_deduplicated_total', {
          queue: input.queueName,
          job: input.name,
        });
        return { success: true, jobId: existing.id, deduplicated: true };
      }
    }

    const job = await this.jobsRepo.createJob({
      name: input.name,
      queueName: input.queueName,
      payload: input.payload,
      status: input.scheduledAt ? 'SCHEDULED' : 'QUEUED',
      priority: input.priority || 'NORMAL',
      maxRetries: input.maxRetries ?? 3,
      scheduledAt: input.scheduledAt,
      tags: input.tags ?? [],
      correlationId: input.correlationId,
      idempotencyKey: input.idempotencyKey,
      user: userId ? { connect: { id: userId } } : undefined,
    });

    if (!input.scheduledAt) {
      await this.queueService.addJob(input.queueName, input.name, input.payload, {
        priority: input.priority || 'NORMAL',
        maxRetries: input.maxRetries ?? 3,
        tags: input.tags,
        correlationId: input.correlationId,
        idempotencyKey: input.idempotencyKey,
        userId,
      });
    }

    this.log.info({
      module: 'jobs',
      operation: 'enqueue',
      userId,
      entityId: job.id,
      details: {
        name: input.name,
        queueName: input.queueName,
        priority: input.priority || 'NORMAL',
        scheduled: Boolean(input.scheduledAt),
      },
      message: 'Job enqueued',
    });

    return { success: true, jobId: job.id };
  }

  async enqueueBatch(
    userId: string,
    jobs: Array<{
      name: string;
      queueName: string;
      payload: Record<string, any>;
      priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
      maxRetries?: number;
      scheduledAt?: Date;
      tags?: string[];
      correlationId?: string;
      idempotencyKey?: string;
      userId?: string;
    }>,
  ) {
    const enqueued: string[] = [];
    for (const job of jobs) {
      const result = await this.enqueueJob(userId, job);
      enqueued.push(result.jobId);
    }
    return { success: true, jobIds: enqueued };
  }

  async getJobStatus(jobId: string) {
    const job = await this.jobsRepo.findJobById(jobId);
    if (!job) {
      throw new NotFoundException('Job not found');
    }
    return this.mapJob(job);
  }

  async getJobs(
    userId: string,
    options: {
      queueName?: string;
      status?: string;
      limit?: number;
      cursor?: string;
    } = {},
  ) {
    const where: Record<string, any> = { userId };
    if (options.queueName) where.queueName = options.queueName;
    if (options.status) where.status = options.status;

    const jobs = await this.jobsRepo.findJobs(where, {
      limit: options.limit ?? 50,
      cursor: options.cursor,
    });

    return {
      jobs: jobs.map(j => this.mapJob(j)),
    };
  }

  async cancelJob(userId: string, jobId: string) {
    const job = await this.jobsRepo.findJobById(jobId);
    if (!job || job.userId !== userId) {
      throw new NotFoundException('Job not found');
    }

    if (
      job.status === 'COMPLETED' ||
      job.status === 'FAILED' ||
      job.status === 'CANCELLED'
    ) {
      throw new BadRequestException('Cannot cancel job in terminal state');
    }

    await this.queueService.cancelJob(job.queueName, job.id);
    await this.jobsRepo.updateJob(jobId, { status: 'CANCELLED' });

    return { success: true, cancelled: true };
  }

  async retryJob(userId: string, jobId: string) {
    const job = await this.jobsRepo.findJobById(jobId);
    if (!job || job.userId !== userId) {
      throw new NotFoundException('Job not found');
    }

    if (job.status !== 'FAILED') {
      throw new BadRequestException('Can only retry failed jobs');
    }

    await this.queueService.retryJob(job.queueName, job.id);
    await this.jobsRepo.updateJob(jobId, {
      status: 'RETRYING',
      lastError: null,
    });

    return { success: true, retried: true };
  }

  async cancelJobByAdmin(jobId: string) {
    const job = await this.jobsRepo.findJobById(jobId);
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    await this.queueService.cancelJob(job.queueName, job.id);
    await this.jobsRepo.updateJob(jobId, { status: 'CANCELLED' });

    return { success: true, cancelled: true };
  }

  async createSchedule(
    userId: string,
    input: {
      name: string;
      cronExpression: string;
      timezone?: string;
      jobName: string;
      payload?: Record<string, any>;
    },
  ) {
    if (!this.isValidCron(input.cronExpression)) {
      throw new BadRequestException('Invalid cron expression');
    }

    const nextRunAt = this.calculateNextRun(input.cronExpression);

    const schedule = await this.jobsRepo.createSchedule({
      name: input.name,
      cronExpression: input.cronExpression,
      timezone: input.timezone || 'UTC',
      jobName: input.jobName,
      payload: input.payload,
      user: userId ? { connect: { id: userId } } : undefined,
      nextRunAt,
    });

    return { success: true, schedule };
  }

  async getSchedules(
    userId: string,
    options?: { isActive?: boolean; limit?: number; cursor?: string },
  ) {
    const where: Record<string, any> = { userId };
    if (options?.isActive !== undefined) where.isActive = options.isActive;

    const schedules = await this.jobsRepo.findSchedules(where, {
      limit: options?.limit ?? 50,
      cursor: options?.cursor,
    });

    return { schedules };
  }

  async updateSchedule(
    userId: string,
    scheduleId: string,
    input: {
      cronExpression?: string;
      timezone?: string;
      jobName?: string;
      payload?: Record<string, any>;
      isActive?: boolean;
    },
  ) {
    const schedule = await this.jobsRepo.findScheduleById(scheduleId);
    if (!schedule || schedule.userId !== userId) {
      throw new NotFoundException('Schedule not found');
    }

    let nextRunAt = schedule.nextRunAt;
    if (input.cronExpression) {
      if (!this.isValidCron(input.cronExpression)) {
        throw new BadRequestException('Invalid cron expression');
      }
      nextRunAt = this.calculateNextRun(input.cronExpression);
    }

    const updated = await this.jobsRepo.updateSchedule(scheduleId, {
      cronExpression: input.cronExpression,
      timezone: input.timezone,
      jobName: input.jobName,
      payload: input.payload,
      isActive: input.isActive,
      nextRunAt,
    });

    return { success: true, schedule: updated };
  }

  async deleteSchedule(userId: string, scheduleId: string) {
    const schedule = await this.jobsRepo.findScheduleById(scheduleId);
    if (!schedule || schedule.userId !== userId) {
      throw new NotFoundException('Schedule not found');
    }

    await this.jobsRepo.deleteSchedule(scheduleId);
    return { success: true, deleted: true };
  }

  async processScheduledJobs() {
    try {
      const now = new Date();
      const schedules = await this.prisma.backgroundJobSchedule.findMany({
        where: {
          isActive: true,
          nextRunAt: { lte: now },
        },
        take: 100,
      });

      for (const schedule of schedules) {
        try {
          await this.enqueueJob(schedule.userId || 'system', {
            name: schedule.jobName,
            queueName: 'jobs:default',
            payload: (schedule.payload as Record<string, any>) || {},
            scheduledAt: new Date(),
            correlationId: `schedule:${schedule.id}`,
          });

          const nextRunAt = this.calculateNextRun(schedule.cronExpression);
          await this.jobsRepo.updateSchedule(schedule.id, {
            lastRunAt: new Date(),
            nextRunAt,
            runCount: { increment: 1 },
          });

          this.log.debug({
            module: 'jobs',
            operation: 'schedule.executed',
            userId: schedule.userId || undefined,
            entityId: schedule.id,
            details: { name: schedule.name, jobName: schedule.jobName },
            message: `Executed scheduled job ${schedule.name}`,
          });
        } catch (error) {
          this.log.error({
            module: 'jobs',
            operation: 'schedule.execute_failed',
            entityId: schedule.id,
            errorCode: 500,
            message: `Failed to execute scheduled job ${schedule.id}`,
            details: { error: String(error) },
          });
        }
      }
    } catch (error) {
      this.log.error({
        module: 'jobs',
        operation: 'schedule.process_failed',
        errorCode: 500,
        message: 'Error processing scheduled jobs',
        details: { error: String(error) },
      });
    }
  }

  async getDeadLetters(
    userId: string,
    options?: { queueName?: string; limit?: number; cursor?: string },
  ) {
    const deadLetters = await this.jobsRepo.findDeadLetters(
      options?.queueName ? { queueName: options.queueName } : {},
      {
        limit: options?.limit ?? 50,
        cursor: options?.cursor,
      },
    );

    const owned = await this.filterOwnedDeadLetters(userId, deadLetters);

    return { deadLetters: owned.map(d => this.mapDeadLetter(d)) };
  }

  async resolveDeadLetter(userId: string, deadLetterId: string, resolutionNotes: string) {
    const deadLetter = await this.assertDeadLetterOwnership(userId, deadLetterId);
    if (!deadLetter) {
      throw new NotFoundException('Dead letter not found');
    }

    const resolved = await this.jobsRepo.resolveDeadLetter(
      deadLetterId,
      resolutionNotes,
    );
    return { success: true, deadLetter: this.mapDeadLetter(resolved) };
  }

  async retryDeadLetter(userId: string, deadLetterId: string) {
    const deadLetter = await this.assertDeadLetterOwnership(userId, deadLetterId);
    if (!deadLetter) {
      throw new NotFoundException('Dead letter not found');
    }

    await this.queueService.addJob(
      deadLetter.queueName,
      deadLetter.jobName,
      deadLetter.payload as Record<string, any>,
      { maxRetries: 3 },
    );

    await this.jobsRepo.resolveDeadLetter(
      deadLetterId,
      'Retried via dead letter retry',
    );

    return { success: true, retried: true };
  }

  async getMetrics(queueName: string, days = 30) {
    return this.jobsRepo.getAggregatedMetrics(queueName, days);
  }

  async getAllQueueMetrics(days = 30) {
    const queues = [
      'jobs:default',
      'jobs:high',
      'jobs:low',
      'jobs:scheduled',
      'jobs:webhooks',
      'jobs:notifications',
      'jobs:cleanup',
      'jobs:analytics',
    ];
    const results = await Promise.all(
      queues.map(q => this.jobsRepo.getAggregatedMetrics(q, days)),
    );

    return queues.reduce(
      (acc, q, i) => {
        acc[q] = results[i];
        return acc;
      },
      {} as Record<string, any>,
    );
  }

  async pauseQueue(queueName: string) {
    await this.queueService.pauseQueue(queueName);
    return { success: true, paused: true };
  }

  async resumeQueue(queueName: string) {
    await this.queueService.resumeQueue(queueName);
    return { success: true, resumed: true };
  }

  async drainQueue(queueName: string) {
    await this.queueService.drainQueue(queueName);
    return { success: true, draining: true };
  }

  private isValidCron(cron: string): boolean {
    const parts = cron.trim().split(/\s+/);
    return parts.length === 5 || parts.length === 6;
  }

  private calculateNextRun(_cronExpression: string): Date {
    const next = new Date();
    next.setMinutes(next.getMinutes() + 1);
    next.setSeconds(0, 0);
    return next;
  }

  private async filterOwnedDeadLetters(
    userId: string,
    deadLetters: BackgroundJobDeadLetter[],
  ): Promise<BackgroundJobDeadLetter[]> {
    const owned: BackgroundJobDeadLetter[] = [];
    for (const dl of deadLetters) {
      const owner = await this.jobsRepo.findJobById(dl.jobId);
      if (owner && owner.userId === userId) {
        owned.push(dl);
      }
    }
    return owned;
  }

  private async assertDeadLetterOwnership(
    userId: string,
    deadLetterId: string,
  ): Promise<BackgroundJobDeadLetter | null> {
    const deadLetter = await this.prisma.backgroundJobDeadLetter.findUnique({
      where: { id: deadLetterId },
    });
    if (!deadLetter) {
      return null;
    }
    const owner = await this.jobsRepo.findJobById(deadLetter.jobId);
    if (!owner || owner.userId !== userId) {
      return null;
    }
    return deadLetter;
  }

  private mapJob(job: {
    id: string;
    name: string;
    queueName: string;
    status: BackgroundJobStatus;
    priority: BackgroundJobPriority;
    attempts: number;
    maxRetries: number;
    scheduledAt: Date | null;
    startedAt: Date | null;
    completedAt: Date | null;
    failedAt: Date | null;
    lastError: string | null;
    result: any;
    progress: number;
    tags: string[];
    correlationId: string | null;
    idempotencyKey: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: job.id,
      name: job.name,
      queueName: job.queueName,
      status: job.status,
      priority: job.priority,
      attempts: job.attempts,
      maxRetries: job.maxRetries,
      scheduledAt: job.scheduledAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      failedAt: job.failedAt,
      lastError: job.lastError,
      result: job.result,
      progress: job.progress,
      tags: job.tags,
      correlationId: job.correlationId,
      idempotencyKey: job.idempotencyKey,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }

  private mapDeadLetter(dl: {
    id: string;
    jobId: string;
    jobName: string;
    queueName: string;
    payload: any;
    error: string;
    attempts: number;
    lastError: string | null;
    failedAt: Date;
    resolvedAt: Date | null;
    resolutionNotes: string | null;
    createdAt: Date;
  }) {
    return {
      id: dl.id,
      jobId: dl.jobId,
      jobName: dl.jobName,
      queueName: dl.queueName,
      payload: dl.payload,
      error: dl.error,
      attempts: dl.attempts,
      lastError: dl.lastError,
      failedAt: dl.failedAt,
      resolvedAt: dl.resolvedAt,
      resolutionNotes: dl.resolutionNotes,
      createdAt: dl.createdAt,
    };
  }
}
