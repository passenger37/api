import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { E2eeMetadataRepository } from '../repositories/e2ee-metadata.repository';
import { E2eeDeviceRepository } from '../../e2ee-devices/repositories/e2ee-device.repository';
import {
  serializeSealedSenderKey,
  serializePirRequest,
  serializeMetadataPolicy,
} from '../serializers/e2ee-metadata.serializer';

@Injectable()
export class E2eeMetadataQueryService {
  constructor(
    private readonly metadataRepo: E2eeMetadataRepository,
    private readonly deviceRepo: E2eeDeviceRepository,
  ) {}

  async getSealedSenderKeys(userId: string) {
    const keys = await this.metadataRepo.findSealedSenderKeysByUser(userId);
    return { success: true, keys: keys.map(serializeSealedSenderKey) };
  }

  async getPirRequests(userId: string, deviceId: string) {
    const device = await this.deviceRepo.findById(deviceId);
    if (!device || device.userId !== userId) {
      throw new NotFoundException('Device not found');
    }

    const requests = await this.metadataRepo.findPendingPirRequests(deviceId);
    return { success: true, requests: requests.map(serializePirRequest) };
  }

  async getPirRequestById(userId: string, requestId: string) {
    const request = await this.metadataRepo.findPirRequestById(requestId);
    if (!request) {
      throw new NotFoundException('PIR request not found');
    }
    if (request.userId !== userId) {
      throw new ForbiddenException('Not authorized to access this request');
    }
    return { success: true, request: serializePirRequest(request) };
  }

  async getMetadataPolicy(userId: string) {
    const policy = await this.metadataRepo.findMetadataPolicy(userId);
    if (!policy) {
      // Return default policy
      return {
        success: true,
        policy: {
          userId,
          minPaddingSize: 256,
          maxPaddingSize: 1024,
          enableSealedSender: true,
          enablePir: true,
          batchWindowMs: 100,
          minBatchSize: 5,
          hideGroupMembership: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };
    }
    return { success: true, policy: serializeMetadataPolicy(policy) };
  }
}
