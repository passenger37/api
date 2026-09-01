import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { E2eeDeliveryRepository } from '../repositories/e2ee-delivery.repository';
import { E2eeEnvelopeRepository } from '../../e2ee-transport/repositories/e2ee-envelope.repository';
import { E2eeGroupRepository } from '../../e2ee-groups/repositories/e2ee-group.repository';
import { GetDeliveryQueueRequest, GetGroupDeliveryQueueRequest } from '../dto/delivery.request';
import { serializeDeliveryQueue, serializeGroupDeliveryQueue } from '../serializers/e2ee-delivery.serializer';

@Injectable()
export class E2eeDeliveryQueryService {
  constructor(
    private readonly deliveryRepo: E2eeDeliveryRepository,
    private readonly groupDeliveryRepo: E2eeDeliveryRepository,
    private readonly envelopeRepo: E2eeEnvelopeRepository,
    private readonly groupEnvelopeRepo: E2eeGroupRepository,
  ) {}

  // 1:1 Delivery
  async getPendingDeliveries(
    targetDeviceId: string,
    limit = 50,
  ) {
    const queues = await this.deliveryRepo.findPendingByTargetDevice(targetDeviceId, limit);
    return { success: true, queues: queues.map(serializeDeliveryQueue) };
  }

  async getDeliveryQueue(userId: string, dto: GetDeliveryQueueRequest) {
    // TODO: Add proper filtering by user
    // For now, we can filter by envelope if provided
    if (dto.envelopeId) {
      const envelope = await this.envelopeRepo.findById(dto.envelopeId);
      if (!envelope) {
        throw new NotFoundException('Envelope not found');
      }
      if (envelope.senderDeviceId !== userId && envelope.recipientDeviceId !== userId) {
        throw new NotFoundException('Envelope not found');
      }
    }

    // This is a simplified implementation
    // In practice, we'd filter by user's devices
    return { success: true, queues: [] };
  }

  async countPendingDeliveries(targetDeviceId: string) {
    const count = await this.deliveryRepo.countPendingByTargetDevice(targetDeviceId);
    return { success: true, count };
  }

  // Group Delivery
  async getPendingGroupDeliveries(targetDeviceId: string, limit = 50) {
    const queues = await this.groupDeliveryRepo.findPendingGroupByTargetDevice(targetDeviceId, limit);
    return { success: true, queues: queues.map(serializeGroupDeliveryQueue) };
  }

  async getGroupDeliveryQueue(userId: string, dto: GetGroupDeliveryQueueRequest) {
    if (dto.envelopeId) {
      const envelope = await this.groupEnvelopeRepo.findById(dto.envelopeId);
      if (!envelope) {
        throw new NotFoundException('Group envelope not found');
      }
      // Check membership
    }

    return { success: true, queues: [] };
  }

  async countPendingGroupDeliveries(targetDeviceId: string) {
    const count = await this.groupDeliveryRepo.countPendingGroupByTargetDevice(targetDeviceId);
    return { success: true, count };
  }
}