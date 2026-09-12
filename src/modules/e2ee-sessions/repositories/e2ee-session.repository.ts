import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { E2eeSession, Prisma } from '@prisma/client';

const SESSION_WITH_DEVICES_INCLUDE = {
  senderDevice: true,
  recipientDevice: true,
} satisfies Prisma.E2eeSessionInclude;

export type E2eeSessionWithDevices = Prisma.E2eeSessionGetPayload<{
  include: typeof SESSION_WITH_DEVICES_INCLUDE;
}>;

@Injectable()
export class E2eeSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.E2eeSessionCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<E2eeSessionWithDevices> {
    const client = tx ?? this.prisma;
    return client.e2eeSession.create({
      data,
      include: SESSION_WITH_DEVICES_INCLUDE,
    });
  }

  async findById(id: string): Promise<E2eeSessionWithDevices | null> {
    return this.prisma.e2eeSession.findUnique({
      where: { id },
      include: SESSION_WITH_DEVICES_INCLUDE,
    });
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
  ): Promise<E2eeSessionWithDevices[]> {
    return this.prisma.e2eeSession.findMany({
      where: { recipientDeviceId, isActive: true },
      orderBy: { createdAt: 'desc' },
      include: SESSION_WITH_DEVICES_INCLUDE,
    });
  }

  async findBySenderDeviceId(
    senderDeviceId: string,
  ): Promise<E2eeSessionWithDevices[]> {
    return this.prisma.e2eeSession.findMany({
      where: { senderDeviceId, isActive: true },
      orderBy: { createdAt: 'desc' },
      include: SESSION_WITH_DEVICES_INCLUDE,
    });
  }

  async accept(sessionId: string): Promise<E2eeSessionWithDevices> {
    return this.prisma.e2eeSession.update({
      where: { id: sessionId },
      data: { acceptedAt: new Date() },
      include: SESSION_WITH_DEVICES_INCLUDE,
    });
  }

  async archive(sessionId: string): Promise<E2eeSession> {
    return this.prisma.e2eeSession.update({
      where: { id: sessionId },
      data: { isActive: false, archivedAt: new Date() },
    });
  }
}
