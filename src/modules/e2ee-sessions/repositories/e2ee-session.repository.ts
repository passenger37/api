import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { E2eeSession, Prisma, E2eeDevice } from '@prisma/client';

@Injectable()
export class E2eeSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.E2eeSessionCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<E2eeSession> {
    const client = tx ?? this.prisma;
    return client.e2eeSession.create({ data });
  }

  async findById(id: string): Promise<E2eeSession | null> {
    return this.prisma.e2eeSession.findUnique({ where: { id } });
  }

  async findBySenderAndRecipient(
    senderDeviceId: string,
    recipientDeviceId: string,
  ): Promise<E2eeSession | null> {
    return this.prisma.e2eeSession.findFirst({
      where: {
        senderDeviceId,
        recipientDeviceId,
        isActive: true,
      },
    });
  }

  async findActiveByDevicePair(
    senderDeviceId: string,
    recipientDeviceId: string,
  ): Promise<E2eeSession | null> {
    return this.prisma.e2eeSession.findFirst({
      where: {
        senderDeviceId,
        recipientDeviceId,
        isActive: true,
      },
    });
  }

  async findByRecipientDeviceId(
    recipientDeviceId: string,
  ): Promise<E2eeSession[]> {
    return this.prisma.e2eeSession.findMany({
      where: { recipientDeviceId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findBySenderDeviceId(senderDeviceId: string): Promise<E2eeSession[]> {
    return this.prisma.e2eeSession.findMany({
      where: { senderDeviceId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findDeviceById(deviceId: string): Promise<E2eeDevice | null> {
    return this.prisma.e2eeDevice.findUnique({ where: { id: deviceId } });
  }

  async archive(sessionId: string): Promise<E2eeSession> {
    return this.prisma.e2eeSession.update({
      where: { id: sessionId },
      data: { isActive: false, archivedAt: new Date() },
    });
  }
}
