import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { E2eeDeliveryQueue, E2eeGroupDeliveryQueue, Prisma, E2eeDeliveryStatus } from '@prisma/client';

@Injectable()
export class E2eeDeliveryRepository {
  constructor(private readonly prisma: PrismaService) {}

  // 1:1 Delivery Queue
  async createDelivery(
    data: Prisma.E2eeDeliveryQueueCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<E2eeDeliveryQueue> {
    const client = tx ?? this.prisma;
    return client.e2eeDeliveryQueue.create({ data });
  }

  async findDeliveryById(id: string): Promise<E2eeDeliveryQueue | null> {
    return this.prisma.e2eeDeliveryQueue.findUnique({ where: { id } });
  }

  async findPendingByTargetDevice(
    targetDeviceId: string,
    limit = 50,
  ): Promise<E2eeDeliveryQueue[]> {
    return this.prisma.e2eeDeliveryQueue.findMany({
      where: {
        targetDeviceId,
        status: 'PENDING',
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  async findReadyForRetry(
    limit = 100,
  ): Promise<E2eeDeliveryQueue[]> {
    return this.prisma.e2eeDeliveryQueue.findMany({
      where: {
        status: 'PENDING',
        nextRetryAt: { lte: new Date() },
      },
      orderBy: { nextRetryAt: 'asc' },
      take: limit,
    });
  }

  async updateStatus(
    id: string,
    status: E2eeDeliveryStatus,
    error?: string,
  ): Promise<E2eeDeliveryQueue> {
    const data: Prisma.E2eeDeliveryQueueUpdateInput = { status };
    if (status === 'DELIVERED') {
      data.deliveredAt = new Date();
    } else if (status === 'FAILED' || status === 'EXPIRED') {
      data.expiredAt = new Date();
    }
    if (error) {
      data.lastError = error;
      data.attempts = { increment: 1 };
    }
    if (status === 'PENDING') {
      data.nextRetryAt = new Date(Date.now() + Math.min(2 ** 5 * 1000, 3600000)); // Exponential backoff
    }
    return this.prisma.e2eeDeliveryQueue.update({ where: { id }, data });
  }

  async incrementAttempts(id: string): Promise<E2eeDeliveryQueue> {
    return this.prisma.e2eeDeliveryQueue.update({
      where: { id },
      data: { attempts: { increment: 1 } },
    });
  }

  async countPendingByTargetDevice(targetDeviceId: string): Promise<number> {
    return this.prisma.e2eeDeliveryQueue.count({
      where: { targetDeviceId, status: 'PENDING' },
    });
  }

  async deleteDeliveredOlderThan(date: Date): Promise<number> {
    const result = await this.prisma.e2eeDeliveryQueue.deleteMany({
      where: {
        status: 'DELIVERED',
        deliveredAt: { lt: date },
      },
    });
    return result.count;
  }

  // Group Delivery Queue
  async createGroupDelivery(
    data: Prisma.E2eeGroupDeliveryQueueCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<E2eeGroupDeliveryQueue> {
    const client = tx ?? this.prisma;
    return client.e2eeGroupDeliveryQueue.create({ data });
  }

  async findGroupDeliveryById(id: string): Promise<E2eeGroupDeliveryQueue | null> {
    return this.prisma.e2eeGroupDeliveryQueue.findUnique({ where: { id } });
  }

  async findPendingGroupByTargetDevice(
    targetDeviceId: string,
    limit = 50,
  ): Promise<E2eeGroupDeliveryQueue[]> {
    return this.prisma.e2eeGroupDeliveryQueue.findMany({
      where: {
        targetDeviceId,
        status: 'PENDING',
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  async findGroupReadyForRetry(limit = 100): Promise<E2eeGroupDeliveryQueue[]> {
    return this.prisma.e2eeGroupDeliveryQueue.findMany({
      where: {
        status: 'PENDING',
        nextRetryAt: { lte: new Date() },
      },
      orderBy: { nextRetryAt: 'asc' },
      take: limit,
    });
  }

  async updateGroupStatus(
    id: string,
    status: E2eeDeliveryStatus,
    error?: string,
  ): Promise<E2eeGroupDeliveryQueue> {
    const data: Prisma.E2eeGroupDeliveryQueueUpdateInput = { status };
    if (status === 'DELIVERED') {
      data.deliveredAt = new Date();
    } else if (status === 'FAILED' || status === 'EXPIRED') {
      data.expiredAt = new Date();
    }
    if (error) {
      data.lastError = error;
      data.attempts = { increment: 1 };
    }
    if (status === 'PENDING') {
      data.nextRetryAt = new Date(Date.now() + Math.min(2 ** 5 * 1000, 3600000));
    }
    return this.prisma.e2eeGroupDeliveryQueue.update({ where: { id }, data });
  }

  async incrementGroupAttempts(id: string): Promise<E2eeGroupDeliveryQueue> {
    return this.prisma.e2eeGroupDeliveryQueue.update({
      where: { id },
      data: { attempts: { increment: 1 } },
    });
  }

  async countPendingGroupByTargetDevice(targetDeviceId: string): Promise<number> {
    return this.prisma.e2eeGroupDeliveryQueue.count({
      where: { targetDeviceId, status: 'PENDING' },
    });
  }

  async deleteGroupDeliveredOlderThan(date: Date): Promise<number> {
    const result = await this.prisma.e2eeGroupDeliveryQueue.deleteMany({
      where: {
        status: 'DELIVERED',
        deliveredAt: { lt: date },
      },
    });
    return result.count;
  }
}