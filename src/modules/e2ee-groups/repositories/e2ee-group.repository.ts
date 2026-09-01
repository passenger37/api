import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { E2eeGroup, E2eeGroupMember, E2eeGroupSession, E2eeGroupEnvelope, Prisma } from '@prisma/client';

@Injectable()
export class E2eeGroupRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Group CRUD
  async create(
    data: Prisma.E2eeGroupCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<E2eeGroup> {
    const client = tx ?? this.prisma;
    return client.e2eeGroup.create({ data });
  }

  async findById(id: string): Promise<E2eeGroup | null> {
    return this.prisma.e2eeGroup.findUnique({ where: { id } });
  }

  async findByCreator(creatorUserId: string): Promise<E2eeGroup[]> {
    return this.prisma.e2eeGroup.findMany({
      where: { creatorUserId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(
    id: string,
    data: Prisma.E2eeGroupUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<E2eeGroup> {
    const client = tx ?? this.prisma;
    return client.e2eeGroup.update({ where: { id }, data });
  }

  async archive(id: string, tx?: Prisma.TransactionClient): Promise<E2eeGroup> {
    const client = tx ?? this.prisma;
    return client.e2eeGroup.update({
      where: { id },
      data: { isActive: false, archivedAt: new Date() },
    });
  }

  // Group Members
  async addMember(
    data: Prisma.E2eeGroupMemberCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<E2eeGroupMember> {
    const client = tx ?? this.prisma;
    return client.e2eeGroupMember.create({ data });
  }

  async findMember(groupId: string, deviceId: string): Promise<E2eeGroupMember | null> {
    return this.prisma.e2eeGroupMember.findUnique({
      where: { groupId_deviceId: { groupId, deviceId } },
    });
  }

  async findMembers(groupId: string): Promise<E2eeGroupMember[]> {
    return this.prisma.e2eeGroupMember.findMany({
      where: { groupId, isActive: true },
      include: { device: true, user: true },
    });
  }

  async findMemberByUser(groupId: string, userId: string): Promise<E2eeGroupMember | null> {
    return this.prisma.e2eeGroupMember.findFirst({
      where: { groupId, userId, isActive: true },
    });
  }

  async updateMember(
    groupId: string,
    deviceId: string,
    data: Prisma.E2eeGroupMemberUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<E2eeGroupMember> {
    const client = tx ?? this.prisma;
    return client.e2eeGroupMember.update({
      where: { groupId_deviceId: { groupId, deviceId } },
      data,
    });
  }

  async removeMember(groupId: string, deviceId: string, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.prisma;
    await client.e2eeGroupMember.update({
      where: { groupId_deviceId: { groupId, deviceId } },
      data: { isActive: false, leftAt: new Date() },
    });
  }

  async countMembers(groupId: string): Promise<number> {
    return this.prisma.e2eeGroupMember.count({
      where: { groupId, isActive: true },
    });
  }

  // Group Sessions
  async createSession(
    data: Prisma.E2eeGroupSessionCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<E2eeGroupSession> {
    const client = tx ?? this.prisma;
    return client.e2eeGroupSession.create({ data });
  }

  async findSession(groupId: string, deviceId: string): Promise<E2eeGroupSession | null> {
    return this.prisma.e2eeGroupSession.findUnique({
      where: { groupId_deviceId: { groupId, deviceId } },
    });
  }

  async findSessions(groupId: string): Promise<E2eeGroupSession[]> {
    return this.prisma.e2eeGroupSession.findMany({
      where: { groupId, isActive: true },
    });
  }

  async updateSession(
    groupId: string,
    deviceId: string,
    data: Prisma.E2eeGroupSessionUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<E2eeGroupSession> {
    const client = tx ?? this.prisma;
    return client.e2eeGroupSession.update({
      where: { groupId_deviceId: { groupId, deviceId } },
      data,
    });
  }

  // Group Envelopes
  async createEnvelope(
    data: Prisma.E2eeGroupEnvelopeCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<E2eeGroupEnvelope> {
    const client = tx ?? this.prisma;
    return client.e2eeGroupEnvelope.create({ data });
  }

  async findPendingByGroup(groupId: string, limit = 100): Promise<E2eeGroupEnvelope[]> {
    return this.prisma.e2eeGroupEnvelope.findMany({
      where: { groupId, status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  async findByGroup(
    groupId: string,
    options?: { limit?: number; cursor?: string },
  ): Promise<E2eeGroupEnvelope[]> {
    return this.prisma.e2eeGroupEnvelope.findMany({
      where: { groupId },
      orderBy: { createdAt: 'asc' },
      take: options?.limit ?? 50,
      cursor: options?.cursor ? { id: options.cursor } : undefined,
    });
  }

  async markDelivered(id: string): Promise<E2eeGroupEnvelope> {
    return this.prisma.e2eeGroupEnvelope.update({
      where: { id },
      data: { status: 'DELIVERED', deliveredAt: new Date() },
    });
  }

  async markFailed(id: string, error: string): Promise<E2eeGroupEnvelope> {
    return this.prisma.e2eeGroupEnvelope.update({
      where: { id },
      data: { status: 'FAILED', lastError: error, attempts: { increment: 1 } },
    });
  }

  async incrementAttempts(id: string): Promise<E2eeGroupEnvelope> {
    return this.prisma.e2eeGroupEnvelope.update({
      where: { id },
      data: { attempts: { increment: 1 } },
    });
  }

  async countPendingByGroup(groupId: string): Promise<number> {
    return this.prisma.e2eeGroupEnvelope.count({
      where: { groupId, status: 'PENDING' },
    });
  }

  async findEnvelopeById(id: string): Promise<E2eeGroupEnvelope | null> {
    return this.prisma.e2eeGroupEnvelope.findUnique({ where: { id } });
  }

  async deleteDeliveredOlderThan(groupId: string, date: Date): Promise<number> {
    const result = await this.prisma.e2eeGroupEnvelope.deleteMany({
      where: {
        groupId,
        status: 'DELIVERED',
        deliveredAt: { lt: date },
      },
    });
    return result.count;
  }
}