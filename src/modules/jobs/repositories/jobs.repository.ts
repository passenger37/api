import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { BackgroundJob, BackgroundJobSchedule, BackgroundJobDeadLetter, BackgroundJobMetrics, Prisma } from '@prisma/client';

@Injectable()
export class BackgroundJobsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Background Jobs
  async createJob(
    data: Prisma.BackgroundJobCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<BackgroundJob> {
    const client = tx ?? this.prisma;
    return client.backgroundJob.create({ data });
  }

  async findJobById(id: string): Promise<BackgroundJob | null> {
    return this.prisma.backgroundJob.findUnique({ where: { id } });
  }

  async findJobByIdempotencyKey(key: string): Promise<BackgroundJob | null> {
    return this.prisma.backgroundJob.findUnique({ where: { idempotencyKey: key } });
  }

  async findJobs(
    where: Prisma.BackgroundJobWhereInput,
    options?: { limit?: number; cursor?: string; orderBy?: Prisma.BackgroundJobOrderByWithRelationInput },
  ): Promise<BackgroundJob[]> {
    return this.prisma.backgroundJob.findMany({
      where,
      take: options?.limit ?? 50,
      cursor: options?.cursor ? { id: options.cursor } : undefined,
      orderBy: options?.orderBy ?? { createdAt: 'desc' },
    });
  }

  async updateJob(
    id: string,
    data: Prisma.BackgroundJobUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<BackgroundJob> {
    const client = tx ?? this.prisma;
    return client.backgroundJob.update({ where: { id }, data });
  }

  async incrementAttempts(id: string): Promise<BackgroundJob> {
    return this.prisma.backgroundJob.update({
      where: { id },
      data: {
        attempts: { increment: 1 },
        currentRetry: { increment: 1 },
      },
    });
  }

  async deleteJob(id: string): Promise<void> {
    await this.prisma.backgroundJob.delete({ where: { id } });
  }

  // Job Schedules
  async createSchedule(
    data: Prisma.BackgroundJobScheduleCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<BackgroundJobSchedule> {
    const client = tx ?? this.prisma;
    return client.backgroundJobSchedule.create({ data });
  }

  async findScheduleById(id: string): Promise<BackgroundJobSchedule | null> {
    return this.prisma.backgroundJobSchedule.findUnique({ where: { id } });
  }

  async findScheduleByName(name: string): Promise<BackgroundJobSchedule | null> {
    return this.prisma.backgroundJobSchedule.findUnique({ where: { name } });
  }

  async findSchedules(
    where: Prisma.BackgroundJobScheduleWhereInput,
    options?: { limit?: number; cursor?: string },
  ): Promise<BackgroundJobSchedule[]> {
    return this.prisma.backgroundJobSchedule.findMany({
      where,
      take: options?.limit ?? 50,
      cursor: options?.cursor ? { id: options.cursor } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateSchedule(
    id: string,
    data: Prisma.BackgroundJobScheduleUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<BackgroundJobSchedule> {
    const client = tx ?? this.prisma;
    return client.backgroundJobSchedule.update({ where: { id }, data });
  }

  async deleteSchedule(id: string): Promise<void> {
    await this.prisma.backgroundJobSchedule.delete({ where: { id } });
  }

  // Dead Letters
  async createDeadLetter(
    data: Prisma.BackgroundJobDeadLetterCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<BackgroundJobDeadLetter> {
    const client = tx ?? this.prisma;
    return client.backgroundJobDeadLetter.create({ data });
  }

  async findDeadLetters(
    where: Prisma.BackgroundJobDeadLetterWhereInput,
    options?: { limit?: number; cursor?: string },
  ): Promise<BackgroundJobDeadLetter[]> {
    return this.prisma.backgroundJobDeadLetter.findMany({
      where,
      take: options?.limit ?? 50,
      cursor: options?.cursor ? { id: options.cursor } : undefined,
      orderBy: { failedAt: 'desc' },
    });
  }

  async resolveDeadLetter(id: string, resolutionNotes: string): Promise<BackgroundJobDeadLetter> {
    return this.prisma.backgroundJobDeadLetter.update({
      where: { id },
      data: {
        resolvedAt: new Date(),
        resolutionNotes,
      },
    });
  }

  // Metrics
  async upsertMetrics(
    date: Date,
    queueName: string,
    data: Omit<
      Prisma.BackgroundJobMetricsCreateInput,
      'date' | 'queueName'
    >,
    tx?: Prisma.TransactionClient,
  ): Promise<BackgroundJobMetrics> {
    const client = tx ?? this.prisma;
    return client.backgroundJobMetrics.upsert({
      where: { date_queueName: { date, queueName } },
      create: { date, queueName, ...data },
      update: data,
    });
  }

  async findMetrics(
    queueName: string,
    from: Date,
    to: Date,
  ): Promise<BackgroundJobMetrics[]> {
    return this.prisma.backgroundJobMetrics.findMany({
      where: { queueName, date: { gte: from, lte: to } },
      orderBy: { date: 'asc' },
    });
  }

  async getAggregatedMetrics(
    queueName: string,
    days: number,
  ): Promise<{
    totalProcessed: number;
    succeeded: number;
    failed: number;
    cancelled: number;
    avgProcessingTimeMs: number;
    peakConcurrent: number;
    avgQueueTimeMs: number;
    retryRate: number;
  }> {
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const to = new Date();

    const metrics = await this.prisma.backgroundJobMetrics.findMany({
      where: { queueName, date: { gte: from, lte: new Date() } },
    });

    let totalProcessed = 0;
    let succeeded = 0;
    let failed = 0;
    let cancelled = 0;
    let totalLatency = 0;
    let peakConcurrent = 0;
    let totalQueueTime = 0;
    let totalRetries = 0;
    let totalJobs = 0;

    for (const m of metrics) {
      totalProcessed += m.totalProcessed;
      succeeded += m.succeeded;
      failed += m.failed;
      cancelled += m.cancelled;
      totalLatency += m.avgProcessingTimeMs * m.totalProcessed;
      peakConcurrent = Math.max(peakConcurrent, m.peakConcurrent);
      totalQueueTime += m.avgQueueTimeMs * m.totalProcessed;
    }

    return {
      totalProcessed,
      succeeded,
      failed,
      cancelled,
      avgProcessingTimeMs: totalProcessed > 0 ? totalLatency / totalProcessed : 0,
      peakConcurrent,
      avgQueueTimeMs: totalProcessed > 0 ? totalQueueTime / totalProcessed : 0,
      retryRate: totalProcessed > 0 ? (metrics.reduce((sum, m) => sum + (m.failed / Math.max(m.totalProcessed, 1)), 0) / metrics.length) : 0,
    };
  }
}