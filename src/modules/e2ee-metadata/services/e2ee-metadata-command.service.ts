import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { E2eeMetadataRepository } from '../repositories/e2ee-metadata.repository';
import { E2eeDeviceRepository } from '../../e2ee-devices/repositories/e2ee-device.repository';
import {
  serializeSealedSenderKey,
  serializePirRequest,
  serializeMetadataPolicy,
} from '../serializers/e2ee-metadata.serializer';
import {
  CreateSealedSenderKeyDto,
  CreatePirRequestDto,
  UpdateMetadataPolicyDto,
} from '../dto/metadata.request';
import * as crypto from 'crypto';

@Injectable()
export class E2eeMetadataCommandService {
  constructor(
    private readonly metadataRepo: E2eeMetadataRepository,
    private readonly deviceRepo: E2eeDeviceRepository,
    private readonly prisma: PrismaService,
  ) {}

  async createSealedSenderKey(userId: string, dto: CreateSealedSenderKeyDto) {
    const device = await this.deviceRepo.findActiveById(dto.deviceId);
    if (!device) {
      throw new NotFoundException('Device not found or revoked');
    }
    if (device.userId !== userId) {
      throw new ForbiddenException(
        'Not authorized to create sealed sender key for this device',
      );
    }

    // Deactivate existing keys for this device
    const existingKeys =
      await this.metadataRepo.findSealedSenderKeysByUser(userId);
    for (const key of existingKeys) {
      if (key.deviceId === dto.deviceId) {
        await this.metadataRepo.deactivateSealedSenderKey(key.id);
      }
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + dto.expiresInDays);

    const key = await this.metadataRepo.createSealedSenderKey({
      user: { connect: { id: userId } },
      device: { connect: { id: dto.deviceId } },
      publicKey: dto.publicKey,
      encryptedPrivateKey: dto.encryptedPrivateKey,
      expiresAt,
    });

    return { success: true, key: serializeSealedSenderKey(key) };
  }

  async createPirRequest(userId: string, dto: CreatePirRequestDto) {
    const device = await this.deviceRepo.findActiveById(dto.deviceId);
    if (!device) {
      throw new NotFoundException('Device not found or revoked');
    }
    if (device.userId !== userId) {
      throw new ForbiddenException(
        'Not authorized to create PIR request for this device',
      );
    }

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minute expiry

    const request = await this.metadataRepo.createPirRequest({
      user: { connect: { id: userId } },
      device: { connect: { id: dto.deviceId } },
      encryptedQuery: dto.encryptedQuery,
      expiresAt,
    });

    return { success: true, request: serializePirRequest(request) };
  }

  async respondToPirRequest(requestId: string, encryptedResponse: string) {
    const request = await this.metadataRepo.findPirRequestById(requestId);
    if (!request) {
      throw new NotFoundException('PIR request not found');
    }
    if (request.status !== 'PENDING') {
      throw new BadRequestException('Request already processed');
    }
    if (request.expiresAt < new Date()) {
      throw new BadRequestException('Request expired');
    }

    const updated = await this.metadataRepo.updatePirRequestResponse(
      requestId,
      encryptedResponse,
    );
    return { success: true, request: serializePirRequest(updated) };
  }

  async updateMetadataPolicy(userId: string, dto: UpdateMetadataPolicyDto) {
    const policy = await this.metadataRepo.upsertMetadataPolicy(userId, dto);
    return { success: true, policy: serializeMetadataPolicy(policy) };
  }

  async padEnvelope(userId: string, plaintextLength: number) {
    const policy = await this.metadataRepo.findMetadataPolicy(userId);
    if (!policy) {
      throw new NotFoundException('Metadata policy not found');
    }

    const minPadding = policy.minPaddingSize;
    const maxPadding = policy.maxPaddingSize;

    // Calculate padding to reach next bucket size
    const bucketSize = 256; // 256-byte buckets
    const targetLength =
      Math.ceil((plaintextLength + minPadding) / bucketSize) * bucketSize;
    const paddingNeeded = Math.max(0, targetLength - plaintextLength);

    // Add random padding within policy limits
    const actualPadding = Math.min(
      maxPadding,
      Math.max(minPadding, paddingNeeded + crypto.randomInt(0, 256)),
    );

    const paddedLength = plaintextLength + actualPadding;
    const paddingBytes = actualPadding;

    return {
      success: true,
      paddedLength,
      paddingBytes,
    };
  }

  async batchDelivery(envelopeIds: string[]) {
    // Group envelopes by target device for batched delivery
    const batches = new Map<string, string[]>();

    for (const envelopeId of envelopeIds) {
      const envelope = await this.prisma.e2eeEnvelope.findUnique({
        where: { id: envelopeId },
        select: { recipientDeviceId: true },
      });
      if (envelope) {
        const existing = batches.get(envelope.recipientDeviceId) || [];
        existing.push(envelopeId);
        batches.set(envelope.recipientDeviceId, existing);
      }
    }

    // Create delivery queue entries for each batch
    const batchId = crypto.randomUUID();
    for (const [deviceId, ids] of batches.entries()) {
      for (const envelopeId of ids) {
        await this.prisma.e2eeDeliveryQueue.create({
          data: {
            envelope: { connect: { id: envelopeId } },
            targetDevice: { connect: { id: deviceId } },
          },
        });
      }
    }

    return {
      success: true,
      batchedCount: envelopeIds.length,
      batchId,
    };
  }
}
