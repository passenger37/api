import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { E2eeSealedSenderKey, E2eePirRequest, E2eeMetadataPolicy, Prisma } from '@prisma/client';

@Injectable()
export class E2eeMetadataRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Sealed Sender Keys
  async createSealedSenderKey(
    data: Prisma.E2eeSealedSenderKeyCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<E2eeSealedSenderKey> {
    const client = tx ?? this.prisma;
    return client.e2eeSealedSenderKey.create({ data });
  }

  async findActiveSealedSenderKey(deviceId: string): Promise<E2eeSealedSenderKey | null> {
    return this.prisma.e2eeSealedSenderKey.findFirst({
      where: { deviceId, isActive: true, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findSealedSenderKeysByUser(userId: string): Promise<E2eeSealedSenderKey[]> {
    return this.prisma.e2eeSealedSenderKey.findMany({
      where: { userId, isActive: true, expiresAt: { gt: new Date() } },
    });
  }

  async deactivateSealedSenderKey(id: string): Promise<E2eeSealedSenderKey> {
    return this.prisma.e2eeSealedSenderKey.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // PIR Requests
  async createPirRequest(
    data: Prisma.E2eePirRequestCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<E2eePirRequest> {
    const client = tx ?? this.prisma;
    return client.e2eePirRequest.create({ data });
  }

  async findPirRequestById(id: string): Promise<E2eePirRequest | null> {
    return this.prisma.e2eePirRequest.findUnique({ where: { id } });
  }

  async updatePirRequestResponse(
    id: string,
    encryptedResponse: string,
  ): Promise<E2eePirRequest> {
    return this.prisma.e2eePirRequest.update({
      where: { id },
      data: { encryptedResponse, status: 'COMPLETED' },
    });
  }

  async findPendingPirRequests(
    deviceId: string,
    limit = 50,
  ): Promise<E2eePirRequest[]> {
    return this.prisma.e2eePirRequest.findMany({
      where: { deviceId, status: 'PENDING', expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  async cleanExpiredPirRequests(): Promise<number> {
    const result = await this.prisma.e2eePirRequest.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return result.count;
  }

  // Metadata Policies
  async upsertMetadataPolicy(
    userId: string,
    data: Partial<Prisma.E2eeMetadataPolicyCreateInput>,
  ): Promise<E2eeMetadataPolicy> {
    return this.prisma.e2eeMetadataPolicy.upsert({
      where: { userId },
      create: { userId, ...data } as Prisma.E2eeMetadataPolicyCreateInput,
      update: data,
    });
  }

  async findMetadataPolicy(userId: string): Promise<E2eeMetadataPolicy | null> {
    return this.prisma.e2eeMetadataPolicy.findUnique({ where: { userId } });
  }
}