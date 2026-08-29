import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../core/database/prisma.service';

export const OUTBOX_STATUSES = {
  PENDING: 'PENDING',
  PROCESSED: 'PROCESSED',
  FAILED: 'FAILED',
} as const;

export const OUTBOX_MAX_ATTEMPTS = 8;

@Injectable()
export class OutboxEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    event: {
      eventType: string;
      channelId?: string | null;
      payload: Prisma.InputJsonValue;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;

    return client.outboxEvent.create({
      data: {
        eventType: event.eventType,
        channelId: event.channelId ?? null,
        payload: event.payload,
      },
    });
  }

  async findPendingBatch(limit = 50) {
    return this.prisma.outboxEvent.findMany({
      where: {
        status: OUTBOX_STATUSES.PENDING,
      },

      orderBy: {
        createdAt: 'asc',
      },

      take: limit,
    });
  }

  async markProcessed(ids: string[], tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;

    return client.outboxEvent.updateMany({
      where: {
        id: { in: ids },
      },

      data: {
        status: OUTBOX_STATUSES.PROCESSED,
        processedAt: new Date(),
        lastError: null,
      },
    });
  }

  async recordFailure(id: string, error: string, attempts: number) {
    return this.prisma.outboxEvent.update({
      where: {
        id,
      },

      data: {
        attempts,
        lastError: error,
        status:
          attempts >= OUTBOX_MAX_ATTEMPTS
            ? OUTBOX_STATUSES.FAILED
            : OUTBOX_STATUSES.PENDING,
      },
    });
  }
}
