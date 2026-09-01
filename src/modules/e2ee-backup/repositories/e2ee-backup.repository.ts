import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { E2eeEncryptedBackup, E2eeBackupStatus, Prisma } from '@prisma/client';

@Injectable()
export class E2eeBackupRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.E2eeEncryptedBackupCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<E2eeEncryptedBackup> {
    const client = tx ?? this.prisma;
    return client.e2eeEncryptedBackup.create({ data });
  }

  async findById(id: string): Promise<E2eeEncryptedBackup | null> {
    return this.prisma.e2eeEncryptedBackup.findUnique({ where: { id } });
  }

  async findByUser(userId: string): Promise<E2eeEncryptedBackup[]> {
    return this.prisma.e2eeEncryptedBackup.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByDevice(deviceId: string): Promise<E2eeEncryptedBackup[]> {
    return this.prisma.e2eeEncryptedBackup.findMany({
      where: { deviceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(
    id: string,
    status: E2eeBackupStatus,
    error?: string,
  ): Promise<E2eeEncryptedBackup> {
    const data: Prisma.E2eeEncryptedBackupUpdateInput = { status };
    if (status === 'COMPLETED') {
      data.completedAt = new Date();
    }
    if (error) {
      data.error = error;
    }
    return this.prisma.e2eeEncryptedBackup.update({ where: { id }, data });
  }
}