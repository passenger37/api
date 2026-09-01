import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { E2eeEnvelope, Prisma } from '@prisma/client';

@Injectable()
export class E2eeEnvelopeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.E2eeEnvelopeCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<E2eeEnvelope> {
    const client = tx ?? this.prisma;
    return client.e2eeEnvelope.create({ data });
  }

  async findById(id: string): Promise<E2eeEnvelope | null> {
    return this.prisma.e2eeEnvelope.findUnique({ where: { id } });
  }

  async findPendingByRecipientDevice(
    recipientDeviceId: string,
    limit = 50,
  ): Promise<E2eeEnvelope[]> {
    return this.prisma.e2eeEnvelope.findMany({
      where: {
        recipientDeviceId,
        status: 'PENDING',
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  async findBySession(
    sessionId: string,
    options?: { limit?: number; cursor?: string },
  ): Promise<E2eeEnvelope[]> {
    return this.prisma.e2eeEnvelope.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      take: options?.limit ?? 50,
      cursor: options?.cursor ? { id: options.cursor } : undefined,
    });
  }

  async markDelivered(id: string): Promise<E2eeEnvelope> {
    return this.prisma.e2eeEnvelope.update({
      where: { id },
      data: {
        status: 'DELIVERED',
        deliveredAt: new Date(),
      },
    });
  }

  async markFailed(id: string, error: string): Promise<E2eeEnvelope> {
    return this.prisma.e2eeEnvelope.update({
      where: { id },
      data: {
        status: 'FAILED',
        lastError: error,
        attempts: { increment: 1 },
      },
    });
  }

  async incrementAttempts(id: string): Promise<E2eeEnvelope> {
    return this.prisma.e2eeEnvelope.update({
      where: { id },
      data: { attempts: { increment: 1 } },
    });
  }

  async countPendingByRecipientDevice(
    recipientDeviceId: string,
  ): Promise<number> {
    return this.prisma.e2eeEnvelope.count({
      where: {
        recipientDeviceId,
        status: 'PENDING',
      },
    });
  }

  async deleteDeliveredOlderThan(date: Date): Promise<number> {
    const result = await this.prisma.e2eeEnvelope.deleteMany({
      where: {
        status: 'DELIVERED',
        deliveredAt: { lt: date },
      },
    });
    return result.count;
  }
}