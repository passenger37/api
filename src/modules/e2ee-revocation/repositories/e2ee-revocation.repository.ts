import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import {
  E2eeDeviceRevocation,
  E2eeRevocationReason,
  Prisma,
} from '@prisma/client';

@Injectable()
export class E2eeRevocationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.E2eeDeviceRevocationCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<E2eeDeviceRevocation> {
    const client = tx ?? this.prisma;
    return client.e2eeDeviceRevocation.create({ data });
  }

  async findById(id: string): Promise<E2eeDeviceRevocation | null> {
    return this.prisma.e2eeDeviceRevocation.findUnique({ where: { id } });
  }

  async findByDevice(deviceId: string): Promise<E2eeDeviceRevocation[]> {
    return this.prisma.e2eeDeviceRevocation.findMany({
      where: { deviceId },
      orderBy: { revokedAt: 'desc' },
    });
  }

  async findByInitiator(userId: string): Promise<E2eeDeviceRevocation[]> {
    return this.prisma.e2eeDeviceRevocation.findMany({
      where: { initiatedByUserId: userId },
      orderBy: { revokedAt: 'desc' },
    });
  }

  async updateAcknowledged(id: string): Promise<E2eeDeviceRevocation> {
    return this.prisma.e2eeDeviceRevocation.update({
      where: { id },
      data: { acknowledged: true, acknowledgedAt: new Date() },
    });
  }
}
