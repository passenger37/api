import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { E2eeDeliveryRepository } from '../repositories/e2ee-delivery.repository';
import { E2eeEnvelopeRepository } from '../../e2ee-transport/repositories/e2ee-envelope.repository';
import { E2eeGroupRepository } from '../../e2ee-groups/repositories/e2ee-group.repository';
import { E2eeDeviceRepository } from '../../e2ee-devices/repositories/e2ee-device.repository';
import { serializeDeliveryQueue, serializeGroupDeliveryQueue } from '../serializers/e2ee-delivery.serializer';
import { CreateDeliveryRequest, CreateGroupDeliveryRequest, MarkDeliveryDeliveredDto, MarkDeliveryFailedDto } from '../dto/delivery.request';
import { E2eeEnvelopeStatus } from '@prisma/client';

@Injectable()
export class E2eeDeliveryCommandService {
  constructor(
    private readonly deliveryRepo: E2eeDeliveryRepository,
    private readonly groupDeliveryRepo: E2eeDeliveryRepository,
    private readonly envelopeRepo: E2eeEnvelopeRepository,
    private readonly groupEnvelopeRepo: E2eeGroupRepository,
    private readonly deviceRepo: E2eeDeviceRepository,
    private readonly prisma: PrismaService,
  ) {}

  // 1:1 Delivery
  async enqueueDelivery(userId: string, dto: CreateDeliveryRequest) {
    const envelope = await this.envelopeRepo.findById(dto.envelopeId);
    if (!envelope) {
      throw new NotFoundException('Envelope not found');
    }
    if (envelope.status === E2eeEnvelopeStatus.EXPIRED) {
      throw new BadRequestException('Envelope is expired');
    }
    if (envelope.recipientDeviceId !== dto.targetDeviceId) {
      throw new BadRequestException('Target device does not match envelope recipient');
    }

    const targetDevice = await this.deviceRepo.findActiveById(dto.targetDeviceId);
    if (!targetDevice) {
      throw new NotFoundException('Target device not found or revoked');
    }

    const queue = await this.deliveryRepo.createDelivery({
      envelope: { connect: { id: dto.envelopeId } },
      targetDevice: { connect: { id: dto.targetDeviceId } },
    });

    return { success: true, queue: serializeDeliveryQueue(queue) };
  }

  async markDelivered(dto: MarkDeliveryDeliveredDto) {
    const queue = await this.deliveryRepo.findDeliveryById(dto.queueId);
    if (!queue) {
      throw new NotFoundException('Delivery queue entry not found');
    }

    const updated = await this.deliveryRepo.updateStatus(dto.queueId, 'DELIVERED');

    // Update envelope status
    await this.prisma.e2eeEnvelope.update({
      where: { id: queue.envelopeId },
      data: { status: 'DELIVERED', deliveredAt: new Date() },
    });

    return { success: true, queue: serializeDeliveryQueue(updated) };
  }

  async markFailed(dto: MarkDeliveryFailedDto) {
    const queue = await this.deliveryRepo.findDeliveryById(dto.queueId);
    if (!queue) {
      throw new NotFoundException('Delivery queue entry not found');
    }

    const updated = await this.deliveryRepo.updateStatus(dto.queueId, 'FAILED', dto.error);

    return { success: true, queue: serializeDeliveryQueue(updated) };
  }

  // Group Delivery
  async enqueueGroupDelivery(userId: string, dto: CreateGroupDeliveryRequest) {
    const envelope = await this.groupEnvelopeRepo.findEnvelopeById(dto.envelopeId);
    if (!envelope) {
      throw new NotFoundException('Group envelope not found');
    }
    if (envelope.status === E2eeEnvelopeStatus.EXPIRED) {
      throw new BadRequestException('Group envelope is expired');
    }

    const group = await this.prisma.e2eeGroup.findUnique({
      where: { id: envelope.groupId },
    });
    if (!group || !group.isActive) {
      throw new BadRequestException('Group is not active');
    }

    const targetDevice = await this.prisma.e2eeDevice.findFirst({
      where: { id: dto.targetDeviceId, isRevoked: false },
    });
    if (!targetDevice) {
      throw new NotFoundException('Target device not found or revoked');
    }

    const member = await this.prisma.e2eeGroupMember.findUnique({
      where: { groupId_deviceId: { groupId: envelope.groupId, deviceId: dto.targetDeviceId } },
    });
    if (!member || !member.isActive) {
      throw new BadRequestException('Target device is not a member of this group');
    }

    const queue = await this.groupDeliveryRepo.createGroupDelivery({
      envelope: { connect: { id: dto.envelopeId } },
      targetDevice: { connect: { id: dto.targetDeviceId } },
    });

    return { success: true, queue: serializeGroupDeliveryQueue(queue) };
  }

  async markGroupDelivered(queueId: string) {
    const queue = await this.groupDeliveryRepo.findGroupDeliveryById(queueId);
    if (!queue) {
      throw new NotFoundException('Group delivery queue entry not found');
    }

    const updated = await this.groupDeliveryRepo.updateGroupStatus(queueId, 'DELIVERED');

    await this.prisma.e2eeGroupEnvelope.update({
      where: { id: queue.envelopeId },
      data: { status: 'DELIVERED', deliveredAt: new Date() },
    });

    return { success: true, queue: serializeGroupDeliveryQueue(updated) };
  }

  async markGroupFailed(queueId: string, error?: string) {
    const queue = await this.groupDeliveryRepo.findGroupDeliveryById(queueId);
    if (!queue) {
      throw new NotFoundException('Group delivery queue entry not found');
    }

    const updated = await this.groupDeliveryRepo.updateGroupStatus(queueId, 'FAILED', error);
    return { success: true, queue: serializeGroupDeliveryQueue(updated) };
  }
}