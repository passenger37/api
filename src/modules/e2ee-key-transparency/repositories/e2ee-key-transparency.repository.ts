import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { E2eeKeyTransparencyEntry, Prisma } from '@prisma/client';

@Injectable()
export class E2eeKeyTransparencyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.E2eeKeyTransparencyEntryCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<E2eeKeyTransparencyEntry> {
    const client = tx ?? this.prisma;
    return client.e2eeKeyTransparencyEntry.create({ data });
  }

  async findById(id: string): Promise<E2eeKeyTransparencyEntry | null> {
    return this.prisma.e2eeKeyTransparencyEntry.findUnique({ where: { id } });
  }

  async findByUser(userId: string, limit = 50): Promise<E2eeKeyTransparencyEntry[]> {
    return this.prisma.e2eeKeyTransparencyEntry.findMany({
      where: { userId },
      orderBy: { epoch: 'desc' },
      take: limit,
    });
  }

  async findByDevice(deviceId: string, limit = 50): Promise<E2eeKeyTransparencyEntry[]> {
    return this.prisma.e2eeKeyTransparencyEntry.findMany({
      where: { deviceId },
      orderBy: { epoch: 'desc' },
      take: limit,
    });
  }

  async findUnverified(userId: string, limit = 50): Promise<E2eeKeyTransparencyEntry[]> {
    return this.prisma.e2eeKeyTransparencyEntry.findMany({
      where: { userId, verified: false },
      orderBy: { epoch: 'desc' },
      take: limit,
    });
  }

  async markVerified(id: string): Promise<E2eeKeyTransparencyEntry> {
    return this.prisma.e2eeKeyTransparencyEntry.update({
      where: { id },
      data: { verified: true, verifiedAt: new Date() },
    });
  }

  async getLatestEpoch(userId: string): Promise<bigint | null> {
    const entry = await this.prisma.e2eeKeyTransparencyEntry.findFirst({
      where: { userId },
      orderBy: { epoch: 'desc' },
      select: { epoch: true },
    });
    return entry?.epoch ?? null;
  }
}