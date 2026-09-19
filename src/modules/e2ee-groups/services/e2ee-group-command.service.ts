import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { E2eeGroupRepository } from '../repositories/e2ee-group.repository';
import { E2eeDeviceRepository } from '../../e2ee-devices/repositories/e2ee-device.repository';
import {
  serializeGroup,
  serializeGroupMember,
  serializeGroupEnvelope,
} from '../serializers/e2ee-group.serializer';
import {
  CreateGroupRequest,
  AddMemberRequest,
  RemoveMemberRequest,
  UpdateMemberRoleRequest,
  SendGroupEnvelopeRequest,
} from '../dto/group.request';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class E2eeGroupCommandService {
  constructor(
    private readonly groupRepo: E2eeGroupRepository,
    private readonly deviceRepo: E2eeDeviceRepository,
    private readonly prisma: PrismaService,
  ) {}

  async createGroup(userId: string, dto: CreateGroupRequest) {
    const creatorDevice = await this.deviceRepo.findActiveById(
      dto.creatorDeviceId,
    );
    if (!creatorDevice || creatorDevice.userId !== userId) {
      throw new NotFoundException(
        'Creator device not found or not owned by user',
      );
    }

    const group = await this.groupRepo.create({
      name: dto.name,
      description: dto.description,
      creator: { connect: { id: userId } },
      avatarUrl: dto.avatarUrl,
    });

    // Add creator as admin member
    await this.groupRepo.addMember({
      group: { connect: { id: group.id } },
      user: { connect: { id: userId } },
      device: { connect: { id: dto.creatorDeviceId } },
      role: 'ADMIN',
    });

    return { success: true, group: serializeGroup(group) };
  }

  async addMember(userId: string, dto: AddMemberRequest) {
    const group = await this.groupRepo.findById(dto.groupId);
    if (!group) {
      throw new NotFoundException('Group not found');
    }
    if (!group.isActive) {
      throw new BadRequestException('Group is archived');
    }

    const member = await this.groupRepo.findMemberByUser(dto.groupId, userId);
    if (!member || member.role !== 'ADMIN') {
      throw new ForbiddenException('Only group admins can add members');
    }

    const device = await this.deviceRepo.findActiveById(dto.deviceId);
    if (!device) {
      throw new NotFoundException('Device not found or revoked');
    }

    const existing = await this.groupRepo.findMember(dto.groupId, dto.deviceId);
    if (existing) {
      if (!existing.isActive) {
        // Reactivate member
        const updated = await this.groupRepo.updateMember(
          dto.groupId,
          dto.deviceId,
          {
            isActive: true,
            role: dto.role ?? 'MEMBER',
            leftAt: null,
          },
        );
        return { success: true, member: serializeGroupMember(updated) };
      }
      throw new BadRequestException('Member already in group');
    }

    const newMember = await this.groupRepo.addMember({
      group: { connect: { id: dto.groupId } },
      user: { connect: { id: device.userId } },
      device: { connect: { id: dto.deviceId } },
      role: dto.role ?? 'MEMBER',
    });

    return { success: true, member: serializeGroupMember(newMember) };
  }

  async removeMember(userId: string, dto: RemoveMemberRequest) {
    const group = await this.groupRepo.findById(dto.groupId);
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const requester = await this.groupRepo.findMemberByUser(
      dto.groupId,
      userId,
    );
    const target = await this.groupRepo.findMember(dto.groupId, dto.deviceId);
    if (!target) {
      throw new NotFoundException('Member not found in group');
    }

    // Check permissions: admins can remove anyone, users can remove themselves
    if (
      !requester ||
      (requester.role !== 'ADMIN' && requester.deviceId !== dto.deviceId)
    ) {
      throw new ForbiddenException('Insufficient permissions to remove member');
    }

    // Don't allow removing the last admin
    if (target.role === 'ADMIN') {
      const admins = await this.groupRepo.findMembers(dto.groupId);
      const adminCount = admins.filter(
        (m) => m.role === 'ADMIN' && m.isActive,
      ).length;
      if (adminCount <= 1) {
        throw new BadRequestException('Cannot remove the last admin');
      }
    }

    await this.groupRepo.removeMember(dto.groupId, dto.deviceId);
    return { success: true, removed: true };
  }

  async updateMemberRole(userId: string, dto: UpdateMemberRoleRequest) {
    const group = await this.groupRepo.findById(dto.groupId);
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const requester = await this.groupRepo.findMemberByUser(
      dto.groupId,
      userId,
    );
    if (!requester || requester.role !== 'ADMIN') {
      throw new ForbiddenException('Only group admins can change member roles');
    }

    const target = await this.groupRepo.findMember(dto.groupId, dto.deviceId);
    if (!target) {
      throw new NotFoundException('Member not found');
    }

    // Don't demote the last admin
    if (target.role === 'ADMIN' && dto.role === 'MEMBER') {
      const admins = await this.groupRepo.findMembers(dto.groupId);
      const adminCount = admins.filter(
        (m) => m.role === 'ADMIN' && m.isActive,
      ).length;
      if (adminCount <= 1) {
        throw new BadRequestException('Cannot demote the last admin');
      }
    }

    const updated = await this.groupRepo.updateMember(
      dto.groupId,
      dto.deviceId,
      {
        role: dto.role,
      },
    );

    return { success: true, member: serializeGroupMember(updated) };
  }

  async sendEnvelope(userId: string, dto: SendGroupEnvelopeRequest) {
    const group = await this.groupRepo.findById(dto.groupId);
    if (!group) {
      throw new NotFoundException('Group not found');
    }
    if (!group.isActive) {
      throw new BadRequestException('Group is archived');
    }

    const senderMember = await this.groupRepo.findMember(
      dto.groupId,
      dto.senderDeviceId,
    );
    if (!senderMember || !senderMember.isActive) {
      throw new ForbiddenException('Sender is not a member of this group');
    }

    const senderDevice = await this.deviceRepo.findActiveById(
      dto.senderDeviceId,
    );
    if (!senderDevice || senderDevice.userId !== userId) {
      throw new BadRequestException(
        'Sender device not found or not owned by user',
      );
    }

    // Verify sender has a group session
    const senderSession = await this.groupRepo.findSession(
      dto.groupId,
      dto.senderDeviceId,
    );
    if (!senderSession) {
      throw new BadRequestException(
        'Sender does not have a group session established',
      );
    }

    const envelope = await this.groupRepo.createEnvelope({
      group: { connect: { id: dto.groupId } },
      type: dto.type,
      ciphertext: dto.ciphertext,
      associatedData: dto.associatedData,
      senderDevice: { connect: { id: dto.senderDeviceId } },
    });

    return { success: true, envelope: serializeGroupEnvelope(envelope) };
  }

  async markEnvelopeDelivered(envelopeId: string) {
    const envelope = await this.groupRepo.findById(envelopeId);
    if (!envelope) {
      throw new NotFoundException('Envelope not found');
    }
    const updated = await this.groupRepo.markDelivered(envelopeId);
    return { success: true, envelope: serializeGroupEnvelope(updated) };
  }

  async markEnvelopeFailed(envelopeId: string, error: string) {
    const envelope = await this.groupRepo.findById(envelopeId);
    if (!envelope) {
      throw new NotFoundException('Envelope not found');
    }
    const updated = await this.groupRepo.markFailed(envelopeId, error);
    return { success: true, envelope: serializeGroupEnvelope(updated) };
  }
}
